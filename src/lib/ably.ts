import * as Ably from "ably";
import { RealtimeEventName } from "@/types";

const ablyApiKey = process.env.ABLY_API_KEY;

let ablyRest: Ably.Rest | null = null;

if (ablyApiKey) {
  ablyRest = new Ably.Rest({ key: ablyApiKey });
}

/**
 * Get Ably REST client instance.
 */
export function getAblyRest(): Ably.Rest | null {
  if (!ablyRest && process.env.ABLY_API_KEY) {
    ablyRest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  }
  return ablyRest;
}

/**
 * Create a scoped Ably TokenRequest for a specific participant in a chat channel.
 * Restricts client permissions strictly to `chat:<publicToken>` with subscribe and presence.
 * This guarantees the browser client cannot subscribe or publish to unauthorized channels.
 */
export async function createChatTokenRequest(
  publicToken: string,
  participantId: string
): Promise<Ably.TokenRequest | null> {
  const rest = getAblyRest();
  if (!rest) {
    return null;
  }

  const channelName = `chat:${publicToken}`;
  const capability: Record<string, string[]> = {
    [channelName]: ["subscribe", "presence", "publish"],
  };

  const tokenParams: Ably.TokenParams = {
    clientId: participantId,
    capability: JSON.stringify(capability),
    ttl: 3600 * 1000 * 4, // 4 hours token validity
  };

  try {
    const tokenRequest = await rest.auth.createTokenRequest(tokenParams);
    return tokenRequest;
  } catch (err) {
    console.error("Failed to create Ably token request:", err);
    return null;
  }
}

/**
 * Server-side broadcast helper to publish events to a chat channel.
 */
export async function broadcastChatEvent(
  publicToken: string,
  event: RealtimeEventName,
  data: unknown
): Promise<void> {
  const rest = getAblyRest();
  if (!rest) {
    // If Ably key is not set, silently skip to prevent breaking in offline/test mode
    return;
  }

  try {
    const channel = rest.channels.get(`chat:${publicToken}`);
    await channel.publish(event, data);
  } catch (err) {
    console.error(`Failed to publish Ably event "${event}" to chat:${publicToken}:`, err);
  }
}
