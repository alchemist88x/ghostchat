import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/userAuth";
import { getDb } from "@/lib/mongodb";
import { IUser } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json().catch(() => ({}));

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current password and new password are required." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCol = db.collection<IUser>("users");

    const fullUser = await usersCol.findOne({ username: user.username });
    if (!fullUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const currentHash = hashPassword(currentPassword);
    if (fullUser.passwordHash !== currentHash) {
      return NextResponse.json(
        { error: "Incorrect current password." },
        { status: 401 }
      );
    }

    const newHash = hashPassword(newPassword);
    await usersCol.updateOne(
      { _id: fullUser._id },
      { $set: { passwordHash: newHash } }
    );

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
