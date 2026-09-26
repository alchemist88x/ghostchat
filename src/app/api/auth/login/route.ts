import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, createSessionToken } from "@/lib/userAuth";
import { IUser } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json().catch(() => ({}));

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = await getDb();
    const usersCol = db.collection<IUser>("users");

    const user = await usersCol.findOne({ username: cleanUsername });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const expectedHash = hashPassword(password);
    if (user.passwordHash !== expectedHash) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const userId = user._id?.toString() || "";
    const token = createSessionToken(cleanUsername, userId);

    const res = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: cleanUsername,
      },
    });

    res.cookies.set({
      name: "ghostchat_user_session",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
