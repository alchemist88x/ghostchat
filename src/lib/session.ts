import { cookies } from "next/headers";
import { generateSecureToken, hashSessionToken } from "./crypto";

export const SESSION_COOKIE_NAME = "anon_session";
// 7 days cookie expiration (longer than chat 72h lifetime to allow seamless returns)
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Get existing anonymous session token from cookies, or generate a fresh one.
 * In Next.js 16, cookies() is asynchronous and must be awaited.
 */
export async function getOrCreateSessionToken(): Promise<{
  sessionToken: string;
  sessionHash: string;
  isNew: boolean;
}> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (existingCookie && existingCookie.value && existingCookie.value.length >= 16) {
    const sessionToken = existingCookie.value;
    return {
      sessionToken,
      sessionHash: hashSessionToken(sessionToken),
      isNew: false,
    };
  }

  // Generate a high-entropy cryptographically random session token
  const newSessionToken = generateSecureToken(32);
  const sessionHash = hashSessionToken(newSessionToken);

  cookieStore.set(SESSION_COOKIE_NAME, newSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return {
    sessionToken: newSessionToken,
    sessionHash,
    isNew: true,
  };
}

/**
 * Retrieve session hash from current request cookie if it exists.
 */
export async function getSessionHash(): Promise<string | null> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!existingCookie || !existingCookie.value) {
    return null;
  }
  return hashSessionToken(existingCookie.value);
}
