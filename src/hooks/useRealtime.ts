"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Ably from "ably";
import { IMessage, IReaction, PresenceMemberData } from "@/types";

interface UseRealtimeProps {
  chatId: string;
  publicToken: string;
  participantId: string;
  displayName: string;
  onNewMessage?: (message: IMessage) => void;
  onUpdateMessage?: (payload: { messageId: string; content: string; editedAt: string }) => void;
  onDeleteMessage?: (payload: { messageId: string; deletedForEveryone: boolean }) => void;
  onReaction?: (payload: { messageId: string; reactions: IReaction[] }) => void;
  onReadMessage?: (payload: { messageId: string; participantId: string }) => void;
  onParticipantJoined?: (payload: { participant: unknown; currentCount: number }) => void;
  onParticipantLeft?: (payload: { participantId: string; displayName: string }) => void;
  onParticipantUpdated?: (payload: { participantId: string; displayName: string }) => void;
  onChatUpdated?: (payload: { chatId: string; updates: Record<string, unknown> }) => void;
  onChatExpired?: () => void;
  onChatEnded?: (payload: { message: string }) => void;
}

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "failed";

export function useRealtime({
  chatId,
  publicToken,
  participantId,
  displayName,
  onNewMessage,
  onUpdateMessage,
  onDeleteMessage,
  onReaction,
  onReadMessage,
  onParticipantJoined,
  onParticipantLeft,
  onParticipantUpdated,
  onChatUpdated,
  onChatExpired,
  onChatEnded,
}: UseRealtimeProps) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [onlineMembers, setOnlineMembers] = useState<PresenceMemberData[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, { displayName: string; timeout: NodeJS.Timeout }>>(
    new Map()
  );

  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPolledMessageIdRef = useRef<string | null>(null);

  // Connect to Ably or gracefully fall back to local polling
  useEffect(() => {
    if (!publicToken || !participantId) return;

    let isSubscribed = true;
    let pollInterval: NodeJS.Timeout | null = null;

    async function initRealtime() {
      try {
        setStatus("connecting");

        // Probe Ably token endpoint once
        const res = await fetch(`/api/chats/${chatId}/ably-token`, { method: "POST" });
        const tokenData = await res.json();

        if (tokenData.enabled === false) {
          // ABLY_API_KEY is not configured: run in zero-config local polling mode
          if (!isSubscribed) return;
          setStatus("connected");

          // Poll for messages every 2.5 seconds so two local windows can chat
          pollInterval = setInterval(async () => {
            if (!isSubscribed) return;
            try {
              const msgRes = await fetch(`/api/chats/${chatId}/messages?limit=20`);
              const data = await msgRes.json();
              if (data.messages && data.messages.length > 0) {
                const latest = data.messages[data.messages.length - 1];
                if (latest && latest.id !== lastPolledMessageIdRef.current) {
                  lastPolledMessageIdRef.current = latest.id;
                  if (onNewMessage) onNewMessage(latest);
                }
              }
            } catch {}
          }, 2500);

          return;
        }

        // Initialize Realtime client using server-issued scoped token request
        const client = new Ably.Realtime({
          authCallback: async (_data, callback) => {
            try {
              const tokenRes = await fetch(`/api/chats/${chatId}/ably-token`, { method: "POST" });
              const nextToken = await tokenRes.json();
              if (nextToken.enabled === false) {
                callback("Ably disabled", null);
                return;
              }
              callback(null, nextToken);
            } catch (err: unknown) {
              const error = err instanceof Error ? err : new Error(String(err));
              callback(error as Ably.ErrorInfo, null);
            }
          },
          autoConnect: true,
          clientId: participantId,
          // Resilient settings for flaky networks
          httpRequestTimeout: 25000,
          realtimeRequestTimeout: 30000,
          disconnectedRetryTimeout: 5000,
          suspendedRetryTimeout: 15000,
          fallbackHosts: [
            "a.ably-realtime.com",
            "b.ably-realtime.com",
            "c.ably-realtime.com",
            "d.ably-realtime.com",
            "e.ably-realtime.com",
          ],
        });

        clientRef.current = client;

        client.connection.on("connected", () => {
          if (isSubscribed) setStatus("connected");
        });

        client.connection.on("connecting", () => {
          if (isSubscribed) setStatus("connecting");
        });

        client.connection.on("disconnected", () => {
          if (isSubscribed) setStatus("reconnecting");
        });

        client.connection.on("suspended", () => {
          if (isSubscribed) setStatus("reconnecting");
        });

        client.connection.on("failed", () => {
          if (!isSubscribed) return;
          console.warn("Ably connection failed — falling back to polling.");
          setStatus("connected");
          // Auto-fallback: start polling if Ably can't connect
          if (!pollInterval) {
            pollInterval = setInterval(async () => {
              if (!isSubscribed) return;
              try {
                const msgRes = await fetch(`/api/chats/${chatId}/messages?limit=20`);
                const data = await msgRes.json();
                if (data.messages && data.messages.length > 0) {
                  const latest = data.messages[data.messages.length - 1];
                  if (latest && latest.id !== lastPolledMessageIdRef.current) {
                    lastPolledMessageIdRef.current = latest.id;
                    if (onNewMessage) onNewMessage(latest);
                  }
                }
              } catch {}
            }, 2500);
          }
        });

        const channel = client.channels.get(`chat:${publicToken}`);
        channelRef.current = channel;

        // Subscribe to events
        channel.subscribe("message:new", (msg) => {
          if (onNewMessage && msg.data) onNewMessage(msg.data);
        });

        channel.subscribe("message:update", (msg) => {
          if (onUpdateMessage && msg.data) onUpdateMessage(msg.data);
        });

        channel.subscribe("message:delete", (msg) => {
          if (onDeleteMessage && msg.data) onDeleteMessage(msg.data);
        });

        channel.subscribe("message:reaction", (msg) => {
          if (onReaction && msg.data) onReaction(msg.data);
        });

        channel.subscribe("message:read", (msg) => {
          if (onReadMessage && msg.data) onReadMessage(msg.data);
        });

        channel.subscribe("participant:joined", (msg) => {
          if (onParticipantJoined && msg.data) onParticipantJoined(msg.data);
        });

        channel.subscribe("participant:left", (msg) => {
          if (onParticipantLeft && msg.data) onParticipantLeft(msg.data);
        });

        channel.subscribe("participant:updated", (msg) => {
          if (onParticipantUpdated && msg.data) onParticipantUpdated(msg.data);
        });

        channel.subscribe("chat:updated", (msg) => {
          if (onChatUpdated && msg.data) onChatUpdated(msg.data);
        });

        channel.subscribe("chat:expired", () => {
          if (onChatExpired) onChatExpired();
        });

        channel.subscribe("chat:ended", (msg) => {
          if (onChatEnded && msg.data) onChatEnded(msg.data);
        });

        // Typing indicators
        channel.subscribe("typing:start", (msg) => {
          const { participantId: senderId, displayName: senderName } = msg.data || {};
          if (senderId && senderId !== participantId) {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              const old = next.get(senderId);
              if (old) clearTimeout(old.timeout);

              const timeout = setTimeout(() => {
                setTypingUsers((curr) => {
                  const m = new Map(curr);
                  m.delete(senderId);
                  return m;
                });
              }, 3000);

              next.set(senderId, { displayName: senderName, timeout });
              return next;
            });
          }
        });

        channel.subscribe("typing:stop", (msg) => {
          const { participantId: senderId } = msg.data || {};
          if (senderId) {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              const entry = next.get(senderId);
              if (entry) clearTimeout(entry.timeout);
              next.delete(senderId);
              return next;
            });
          }
        });

        // Presence tracking
        try {
          await channel.presence.enter({
            participantId,
            displayName,
            joinedAt: new Date().toISOString(),
          });

          channel.presence.subscribe(async () => {
            try {
              const members = await channel.presence.get();
              if (members) {
                const mapped: PresenceMemberData[] = members.map((m: Ably.PresenceMessage) => ({
                  participantId: m.clientId || "",
                  displayName: (m.data as PresenceMemberData)?.displayName || "Anonymous",
                  joinedAt: (m.data as PresenceMemberData)?.joinedAt || "",
                }));
                if (isSubscribed) setOnlineMembers(mapped);
              }
            } catch (err) {
              console.warn("Error fetching presence members:", err);
            }
          });
        } catch (presenceErr) {
          console.warn("Presence registration notice:", presenceErr);
        }
      } catch (err) {
        console.warn("Realtime initialization notice:", err);
        if (!isSubscribed) return;
        // If Ably init fails completely, fall back to polling
        setStatus("connected");
        if (!pollInterval) {
          pollInterval = setInterval(async () => {
            if (!isSubscribed) return;
            try {
              const msgRes = await fetch(`/api/chats/${chatId}/messages?limit=20`);
              const data = await msgRes.json();
              if (data.messages && data.messages.length > 0) {
                const latest = data.messages[data.messages.length - 1];
                if (latest && latest.id !== lastPolledMessageIdRef.current) {
                  lastPolledMessageIdRef.current = latest.id;
                  if (onNewMessage) onNewMessage(latest);
                }
              }
            } catch {}
          }, 2500);
        }
      }
    }

    initRealtime();

    return () => {
      isSubscribed = false;
      if (pollInterval) clearInterval(pollInterval);
      if (channelRef.current) {
        try {
          channelRef.current.presence.leave().catch(() => {});
          channelRef.current.unsubscribe();
        } catch {}
      }
      if (clientRef.current) {
        try {
          clientRef.current.close();
        } catch {}
      }
    };
  }, [
    chatId,
    publicToken,
    participantId,
    displayName,
    onNewMessage,
    onUpdateMessage,
    onDeleteMessage,
    onReaction,
    onParticipantJoined,
    onParticipantLeft,
    onParticipantUpdated,
    onChatUpdated,
    onChatExpired,
    onChatEnded,
  ]);

  // Client typing status publisher (throttled)
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current;
      if (!channel) return;

      if (isTyping) {
        channel.publish("typing:start", { participantId, displayName }).catch(() => {});

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          channel.publish("typing:stop", { participantId }).catch(() => {});
        }, 2500);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        channel.publish("typing:stop", { participantId }).catch(() => {});
      }
    },
    [participantId, displayName]
  );

  const sendReadReceipt = useCallback(
    (messageId: string) => {
      const channel = channelRef.current;
      if (!channel) return;
      channel.publish("message:read", { messageId, participantId }).catch(() => {});
    },
    [participantId]
  );

  return {
    status,
    onlineMembers,
    typingUsers: Array.from(typingUsers.values()).map((u) => u.displayName),
    sendTyping,
    sendReadReceipt,
  };
}
