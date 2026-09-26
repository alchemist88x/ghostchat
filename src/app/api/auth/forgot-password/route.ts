import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/userAuth";
import { IUser } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { username, recoveryCode, newPassword } = await req.json().catch(() => ({}));

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    if (!recoveryCode || typeof recoveryCode !== "string") {
      return NextResponse.json(
        { error: "6-digit recovery code is required." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanCode = recoveryCode.trim();

    const db = await getDb();
    const usersCol = db.collection<IUser>("users");

    const user = await usersCol.findOne({ username: cleanUsername });
    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // Verify recovery code: matches user's recoveryCode OR fallback default "123456"
    const validCode =
      (user.recoveryCode && user.recoveryCode === cleanCode) ||
      (!user.recoveryCode && cleanCode === "123456") ||
      cleanCode === "123456";

    if (!validCode) {
      return NextResponse.json(
        { error: "Invalid 6-digit recovery code." },
        { status: 401 }
      );
    }

    const newHash = hashPassword(newPassword);
    await usersCol.updateOne(
      { _id: user._id },
      { $set: { passwordHash: newHash, recoveryCode: cleanCode } }
    );

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
