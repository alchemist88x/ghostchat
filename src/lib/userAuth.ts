import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./mongodb";
import { IUser } from "@/types";

const COOKIE_NAME = "ghostchat_user_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "ghostchat-user-secret-key-32-chars-minimum";

export function hashPassword(password: string): string {
  const salt = crypto.createHash("sha256").update(SESSION_SECRET).digest("hex");
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export function createSessionToken(username: string, userId: string): string {
  const payload = `${userId}:${username}:${Date.now()}`;
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64");
}

export function parseSessionToken(token: string): { userId: string; username: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;

    const [userId, username, timestampStr, hmac] = parts;
    const payload = `${userId}:${username}:${timestampStr}`;
    const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

    if (hmac !== expectedHmac) return null;

    // Token valid for 30 days
    const timestamp = parseInt(timestampStr, 10);
    if (Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000) return null;

    return { userId, username };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<IUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const parsed = parseSessionToken(token);
    if (!parsed) return null;

    const db = await getDb();
    const user = await db.collection<IUser>("users").findOne({ username: parsed.username });
    if (!user) return null;

    return {
      id: user._id?.toString(),
      username: user.username,
      passwordHash: "",
      createdAt: user.createdAt,
      managedChatIds: user.managedChatIds || [],
    };
  } catch {
    return null;
  }
}
