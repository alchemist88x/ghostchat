import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function getRedisClient(): Redis | null {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return null;
  }

  return new Redis({
    url: upstashUrl,
    token: upstashToken,
  });
}

const redisInstance = getRedisClient();

// Production rate limiters powered strictly by Upstash Redis
export const rateLimiters = redisInstance
  ? {
      chatCreation: new Ratelimit({
        redis: redisInstance,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: false,
        prefix: "ratelimit:chat_create",
      }),
      joinAttempts: new Ratelimit({
        redis: redisInstance,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        analytics: false,
        prefix: "ratelimit:join",
      }),
      messages: new Ratelimit({
        redis: redisInstance,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: false,
        prefix: "ratelimit:messages",
      }),
      uploads: new Ratelimit({
        redis: redisInstance,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: false,
        prefix: "ratelimit:uploads",
      }),
    }
  : null;

export async function checkRateLimit(
  type: "chatCreation" | "joinAttempts" | "messages" | "uploads",
  identifier: string
): Promise<{ success: boolean; remaining?: number; reset?: number }> {
  if (!rateLimiters) {
    // If Redis is not yet provisioned, allow request without in-memory state
    return { success: true };
  }

  const limiter = rateLimiters[type];
  if (!limiter) {
    return { success: true };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.error("Upstash rate limit check error:", err);
    // On unexpected Redis outage, fail open to avoid rejecting legitimate user messages
    return { success: true };
  }
}
