import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, createSessionToken } from "@/lib/userAuth";
import { IUser } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json().catch(() => ({}));

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = await getDb();
    const usersCol = db.collection<IUser>("users");

    const existing = await usersCol.findOne({ username: cleanUsername });
    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser: IUser = {
      username: cleanUsername,
      passwordHash,
      recoveryCode,
      createdAt: new Date(),
      managedChatIds: [],
    };

    const result = await usersCol.insertOne(newUser);
    const userId = result.insertedId.toString();

    const token = createSessionToken(cleanUsername, userId);

    const res = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: cleanUsername,
      },
      recoveryCode,
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
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
  }
}
