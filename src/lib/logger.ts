type LogEvent =
  | "chat.created"
  | "chat.joined"
  | "chat.expired"
  | "chat.ended"
  | "chat.updated"
  | "message.created"
  | "message.deleted"
  | "message.edited"
  | "message.reaction"
  | "upload.presigned"
  | "upload.completed"
  | "upload.deleted"
  | "participant.joined"
  | "participant.left"
  | "participant.name_changed"
  | "cron.cleanup";

interface LogPayload {
  chatId?: string;
  participantId?: string;
  messageId?: string;
  type?: string;
  status?: string;
  count?: number;
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Mask sensitive environment keys, AWS credentials, S3/CloudFront URLs, and storage paths.
 */
export function maskSensitiveValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Mask S3, CloudFront, R2 URLs
    let masked = value.replace(
      /https?:\/\/[a-zA-Z0-9.-]+\.(s3[a-zA-Z0-9.-]*\.amazonaws\.com|cloudfront\.net|r2\.cloudflarestorage\.com)\/[^\s"']+/gi,
      "[MASKED_S3_URL]"
    );
    // Mask MongoDB URI
    masked = masked.replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, "[MASKED_MONGODB_URI]");
    // Mask AWS Access Keys
    masked = masked.replace(/AKIA[0-9A-Z]{16}/g, "[MASKED_AWS_KEY]");
    // Mask secrets in parameters
    masked = masked.replace(/(secret|token|key|password|auth)=([^\s&"']+)/gi, "$1=[MASKED]");
    return masked;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lowerKey = k.toLowerCase();
      if (
        lowerKey.includes("secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("password") ||
        lowerKey.includes("key") ||
        lowerKey.includes("publicurl") ||
        lowerKey.includes("s3url") ||
        lowerKey.includes("url") ||
        lowerKey.includes("storagekey") ||
        lowerKey === "content" ||
        lowerKey === "ip"
      ) {
        sanitized[k] = "[MASKED]";
      } else {
        sanitized[k] = maskSensitiveValue(v);
      }
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(maskSensitiveValue);
  }

  return value;
}

/**
 * Structured privacy-preserving logger.
 * Omits user message contents, raw IPs, session secrets, invitation tokens, and S3 URLs.
 */
export function logEvent(event: LogEvent, payload: LogPayload = {}): void {
  const timestamp = new Date().toISOString();

  // Mask all sensitive fields
  const safePayload = maskSensitiveValue(payload) as Record<string, unknown>;

  const logEntry = {
    timestamp,
    event,
    ...safePayload,
  };

  if (process.env.NODE_ENV === "development") {
    console.log(`[LOG] ${event}`, safePayload);
  } else {
    console.log(JSON.stringify(logEntry));
  }
}
