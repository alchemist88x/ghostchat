import crypto from "crypto";

/**
 * Generate a cryptographically secure random token for invitation links.
 * Uses 24 bytes (192 bits of entropy), base64url encoded.
 * Makes token guessing computationally infeasible.
 */
export function generateSecureToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * Generate a random anonymous identifier for a participant in a chat.
 */
export function generateAnonymousId(): string {
  return "anon_" + crypto.randomBytes(12).toString("hex");
}

/**
 * Hash a session token using SHA-256 before storing in the database.
 * This guarantees that even if a database snapshot is inspected,
 * raw browser session secrets are never exposed.
 */
export function hashSessionToken(sessionToken: string): string {
  return crypto.createHash("sha256").update(sessionToken).digest("hex");
}

/**
 * Generate a clean sanitized random storage key for R2.
 * Never uses raw client filenames as storage paths to prevent path traversal.
 */
export function generateStorageKey(chatId: string, extension = "", chatName?: string): string {
  const safeChatId = chatId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeName = chatName ? chatName.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30) : "";
  const chatFolder = safeName ? `${safeName}_${safeChatId.slice(-6)}` : `chat_${safeChatId}`;
  
  const datePrefix = new Date().toISOString().slice(0, 10);
  const randomKey = crypto.randomBytes(16).toString("hex");
  const extMatch = extension.match(/\.([0-9a-z]+)$/i) || extension.match(/^([0-9a-z]+)$/i);
  const safeExt = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
  return `ghostchat/${chatFolder}/${datePrefix}/${randomKey}${safeExt}`;
}
