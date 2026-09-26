"use client";

import React, { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { IChat, IMessage, IReplyTo, IAttachment, MessageType, IParticipant } from "@/types";
import { useRealtime } from "@/hooks/useRealtime";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/messages/MessageList";
import { MessageComposer } from "@/components/composer/MessageComposer";
import { TypingIndicator } from "@/components/messages/TypingIndicator";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { ChatQRCodeModal } from "@/components/chat/ChatQRCodeModal";
import { ChangeNameModal } from "@/components/participants/ChangeNameModal";
import { ReportModal } from "@/components/chat/ReportModal";
import { CustomModal, ModalType } from "@/components/ui/CustomModal";
import { CustomToast, ToastMessage } from "@/components/ui/CustomToast";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { GroupInfoPanel } from "@/components/chat/GroupInfoPanel";
import { UserAuthModal } from "@/components/auth/UserAuthModal";
import { ManagedChatsDrawer } from "@/components/auth/ManagedChatsDrawer";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { chatId } = use(params);
  const router = useRouter();

  // Core State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chat, setChat] = useState<(IChat & { id: string }) | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<{
    id?: string;
    anonymousId: string;
    displayName: string;
    isCreator: boolean;
  } | null>(null);
  const [participants, setParticipants] = useState<
    Array<{
      id?: string;
      anonymousId: string;
      displayName: string;
      isCreator: boolean;
      joinedAt: string;
    }>
  >([]);

  // Messages State
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [olderCursor, setOlderCursor] = useState<Date | string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [replyingTo, setReplyingTo] = useState<IReplyTo | null>(null);

  // Custom Modal & Toast State
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
  } | null>(null);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Modals & Drawers
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [changeNameModalOpen, setChangeNameModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedMessageId, setReportedMessageId] = useState<string | undefined>(undefined);

  // User Auth & 3-Column Panels State
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [managedChats, setManagedChats] = useState<Array<Partial<IChat> & { id: string }>>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [managedDrawerOpen, setManagedDrawerOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(true);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok) {
          if (data.user) {
            setCurrentUser(data.user);
          }
          if (Array.isArray(data.managedChats)) {
            setManagedChats(data.managedChats);
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    }
    checkAuth();
  }, []);

  // 1. Initial Load: Chat Details & Participants
  useEffect(() => {
    let isCancelled = false;

    async function loadChatData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/chats/${chatId}`);
        const data = await res.json();

        if (isCancelled) return;

        if (!res.ok) {
          if (res.status === 410) {
            router.replace(`/chat/${chatId}/expired`);
            return;
          }
          if (res.status === 401 || res.status === 403) {
            // Not a participant or session expired, redirect to home or join
            router.replace("/");
            return;
          }
          throw new Error(data.error || "Failed to load chat");
        }

        setChat(data.chat);
        setCurrentParticipant(data.participant);
        setParticipants(data.participants || []);

        // Next load initial 50 messages
        const msgRes = await fetch(`/api/chats/${chatId}/messages?limit=50`);
        const msgData = await msgRes.json();

        if (!isCancelled && msgRes.ok) {
          setMessages(msgData.messages || []);
          setHasMoreOlder(msgData.hasMore || false);
          setOlderCursor(msgData.nextCursor || null);
        }

        setLoading(false);
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat data.");
          setLoading(false);
        }
      }
    }

    loadChatData();

    return () => {
      isCancelled = true;
    };
  }, [chatId, router]);

  // Load older messages (cursor pagination)
  const handleLoadOlder = async () => {
    if (!olderCursor || isLoadingOlder) return;

    try {
      setIsLoadingOlder(true);
      const res = await fetch(
        `/api/chats/${chatId}/messages?limit=50&before=${encodeURIComponent(String(olderCursor))}`
      );
      const data = await res.json();

      if (res.ok && data.messages) {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMoreOlder(data.hasMore || false);
        setOlderCursor(data.nextCursor || null);
      }
    } catch (err) {
      console.error("Error loading older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Web Audio Notification Chime (Zero External Files, Works Everywhere)
  const playNotificationChime = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 tone
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5 tone
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }, []);

  // Native System Notification when window or app is minimized / backgrounded
  const triggerMinimizedNotification = useCallback((newMsg: IMessage) => {
    if (typeof document === "undefined") return;

    // Always play chime for incoming message from partner
    playNotificationChime();

    if (document.hidden) {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const title = `${newMsg.senderName || "Anonymous"} sent a message`;
        const body = newMsg.type === "text" ? newMsg.content : `[${newMsg.type.toUpperCase()}] attachment`;
        const n = new Notification(title, {
          body,
          icon: "/icon.svg",
          tag: `msg-${newMsg.id || newMsg.clientMessageId}`,
        });
        n.onclick = () => {
          window.focus();
        };
      }
      document.title = `🔔 New Message | GhostChat`;
    }
  }, [playNotificationChime]);

  // Request Notification permission on mount & Title reset on focus
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      if (chat?.name) {
        document.title = `${chat.name} | GhostChat`;
      } else {
        document.title = "GhostChat";
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [chat?.name]);

  const sendReadReceiptRef = useRef<((msgId: string) => void) | null>(null);

  // 2. Realtime Event Handlers
  const handleRealtimeNewMessage = useCallback(
    (newMsg: IMessage) => {
      setMessages((prev) => {
        // Prevent duplicates by ID or clientMessageId
        const exists = prev.some(
          (m) =>
            (m.id && newMsg.id && m.id === newMsg.id) ||
            (m.clientMessageId && newMsg.clientMessageId && m.clientMessageId === newMsg.clientMessageId)
        );
        if (exists) {
          return prev.map((m) =>
            m.clientMessageId === newMsg.clientMessageId ? { ...m, ...newMsg, id: newMsg.id || m.id } : m
          );
        }
        return [...prev, newMsg];
      });

      // Trigger notification & read receipt if incoming message from another participant
      if (currentParticipant && newMsg.senderId !== currentParticipant.anonymousId) {
        triggerMinimizedNotification(newMsg);
        if (sendReadReceiptRef.current && (newMsg.id || newMsg.clientMessageId)) {
          sendReadReceiptRef.current(newMsg.id || newMsg.clientMessageId);
        }
      }
    },
    [currentParticipant, triggerMinimizedNotification]
  );

  const handleRealtimeReadMessage = useCallback((payload: { messageId: string; participantId: string }) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === payload.messageId || m.clientMessageId === payload.messageId
          ? {
              ...m,
              readStatus: "read",
              readBy: Array.from(new Set([...(m.readBy || []), payload.participantId])),
            }
          : m
      )
    );
  }, []);

  const handleRealtimeUpdateMessage = useCallback(
    (payload: { messageId: string; content: string; editedAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId
            ? { ...m, content: payload.content, editedAt: new Date(payload.editedAt) }
            : m
        )
      );
    },
    []
  );

  const handleRealtimeDeleteMessage = useCallback((payload: { messageId: string }) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === payload.messageId
          ? {
              ...m,
              deletedForEveryone: true,
              content: "This message was deleted",
              attachments: [],
            }
          : m
      )
    );
  }, []);

  const handleRealtimeReaction = useCallback(
    (payload: { messageId: string; reactions: IMessage["reactions"] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
      );
    },
    []
  );

  const handleRealtimeParticipantJoined = useCallback((payload: { participant: unknown }) => {
    const p = payload.participant as {
      id?: string;
      anonymousId: string;
      displayName: string;
      isCreator: boolean;
      joinedAt: string;
    };
    if (p && p.anonymousId) {
      setParticipants((prev) => {
        if (prev.some((x) => x.anonymousId === p.anonymousId)) return prev;
        return [...prev, { ...p, isCreator: p.isCreator || false }];
      });
    }
  }, []);

  const handleRealtimeParticipantLeft = useCallback((payload: { participantId: string }) => {
    setParticipants((prev) => prev.filter((p) => p.anonymousId !== payload.participantId));
  }, []);

  const handleRealtimeParticipantUpdated = useCallback(
    (payload: { participantId: string; displayName: string }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.anonymousId === payload.participantId ? { ...p, displayName: payload.displayName } : p
        )
      );
      // Also update messages from this participant
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === payload.participantId ? { ...m, senderName: payload.displayName } : m
        )
      );
    },
    []
  );

  const handleRealtimeChatUpdated = useCallback(
    (payload: { updates: Partial<IChat> }) => {
      if (chat && payload.updates) {
        setChat((prev) => (prev ? { ...prev, ...payload.updates } : null));
      }
    },
    [chat]
  );

  const clearClientChatState = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes(chatId) || key.startsWith("ghostchat_") || key.startsWith("chat_"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (e) {
      console.error("Error clearing client storage:", e);
    }
  }, [chatId]);

  const handleChatExpired = useCallback(() => {
    clearClientChatState();
    router.replace(`/chat/${chatId}/expired`);
  }, [chatId, router, clearClientChatState]);

  const handleChatEnded = useCallback(() => {
    clearClientChatState();
    const remaining = managedChats.filter((c) => c.id !== chatId);
    const hasNext = remaining.length > 0;

    setCustomModal({
      isOpen: true,
      title: "Chat Ended",
      description: hasNext
        ? "This conversation was ended. Navigating to your next active chat room."
        : "This conversation and all its messages have been permanently deleted.",
      type: "warning",
      confirmText: hasNext ? "Open Next Chat" : "Return to Home",
      onConfirm: () => {
        if (hasNext) {
          router.replace(`/chat/${remaining[0].id}`);
        } else {
          router.replace("/");
        }
      },
    });
  }, [router, clearClientChatState, managedChats, chatId]);

  // Hook into Ably Realtime
  const { status: connectionStatus, onlineMembers, typingUsers, sendTyping, sendReadReceipt } = useRealtime({
    chatId,
    publicToken: chat?.publicToken || "",
    participantId: currentParticipant?.anonymousId || "",
    displayName: currentParticipant?.displayName || "",
    onNewMessage: handleRealtimeNewMessage,
    onUpdateMessage: handleRealtimeUpdateMessage,
    onDeleteMessage: handleRealtimeDeleteMessage,
    onReaction: handleRealtimeReaction,
    onReadMessage: handleRealtimeReadMessage,
    onParticipantJoined: handleRealtimeParticipantJoined,
    onParticipantLeft: handleRealtimeParticipantLeft,
    onParticipantUpdated: handleRealtimeParticipantUpdated,
    onChatUpdated: handleRealtimeChatUpdated,
    onChatExpired: handleChatExpired,
    onChatEnded: handleChatEnded,
  });

  useEffect(() => {
    sendReadReceiptRef.current = sendReadReceipt;
  }, [sendReadReceipt]);

  // 3. User Actions: Send Message
  const handleSendMessage = async (payload: {
    type: MessageType;
    content: string;
    replyTo?: IReplyTo;
    attachments?: IAttachment[];
  }) => {
    if (!currentParticipant || !chat) return;

    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Optimistic UI insert
    const optimisticMessage: IMessage = {
      chatId,
      senderId: currentParticipant.anonymousId,
      senderName: currentParticipant.displayName,
      clientMessageId,
      type: payload.type,
      content: payload.content,
      replyTo: payload.replyTo,
      attachments: payload.attachments,
      reactions: [],
      createdAt: new Date(),
      expiresAt: new Date(chat.expiresAt),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientMessageId,
          type: payload.type,
          content: payload.content,
          replyTo: payload.replyTo,
          attachments: payload.attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Replace optimistic message with server version
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId ? { ...m, ...data.message, id: data.message.id } : m
          )
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic or flag error
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      setToast({
        id: Date.now().toString(),
        type: "error",
        text: "Message failed to send. Please check your connection.",
      });
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      const data = await res.json();
      if (res.ok && data.reactions) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  // Edit Message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to edit message");
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: newContent, editedAt: new Date(data.editedAt) } : m
      )
    );
  };

  // Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteForEveryone: true }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, deletedForEveryone: true, content: "This message was deleted", attachments: [] }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  // Update Display Name
  const handleSaveDisplayName = async (newName: string) => {
    if (!currentParticipant) return;
    const res = await fetch(`/api/participants/${currentParticipant.anonymousId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, displayName: newName }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update display name");
    }

    setCurrentParticipant((prev) => (prev ? { ...prev, displayName: newName } : null));
    setParticipants((prev) =>
      prev.map((p) =>
        p.anonymousId === currentParticipant.anonymousId ? { ...p, displayName: newName } : p
      )
    );
  };

  // Regenerate Invitation Link
  const handleRegenerateLink = async () => {
    const res = await fetch(`/api/chats/${chatId}/regenerate-link`, {
      method: "POST",
    });

    const data = await res.json();
    if (res.ok && data.publicToken) {
      setChat((prev) => (prev ? { ...prev, publicToken: data.publicToken } : null));
    }
  };

  // End Chat (Host)
  const handleEndChat = async () => {
    clearClientChatState();
    const res = await fetch(`/api/chats/${chatId}/end`, {
      method: "POST",
    });

    if (res.ok) {
      const remaining = managedChats.filter((c) => c.id !== chatId);
      if (remaining.length > 0) {
        router.replace(`/chat/${remaining[0].id}`);
      } else {
        router.replace("/");
      }
    }
  };

  // Remove Participant (Host)
  const handleRemoveParticipant = async (participantId: string) => {
    const res = await fetch(`/api/participants/${participantId}?chatId=${chatId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setParticipants((prev) => prev.filter((p) => p.anonymousId !== participantId));
    }
  };

  // Update Group Settings (Host)
  const handleUpdateGroupSettings = async (settings: {
    name?: string;
    icon?: string;
    maxParticipants?: number;
  }) => {
    const res = await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update settings");
    }

    setChat((prev) => (prev ? { ...prev, ...data.updates } : null));
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-lg font-bold tracking-tight mb-1">Loading conversation...</h2>
        <p className="text-xs text-muted-foreground">Connecting to ephemeral room</p>
      </div>
    );
  }

  // Error Screen
  if (error || !chat || !currentParticipant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
        <h2 className="text-xl font-bold tracking-tight mb-2 text-destructive">Unable to open chat</h2>
        <p className="text-xs text-muted-foreground mb-6 max-w-sm">
          {error || "Chat session could not be verified."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          Return Home
        </button>
      </div>
    );
  }

  const onlineParticipantIds = new Set(onlineMembers.map((m) => m.participantId));
  // Guarantee self is marked online
  onlineParticipantIds.add(currentParticipant.anonymousId);

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${chat.publicToken}` : "";

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden relative">
      {/* Background subtle tint */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[300px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* 1. Left Column: Chat Sidebar (Desktop for all users; Mobile Drawer when toggled) */}
      <ChatSidebar
        currentChatId={chatId}
        managedChats={
          managedChats.length > 0
            ? managedChats
            : [{ id: chatId, name: chat.name, icon: chat.icon, type: chat.type }]
        }
        currentUser={currentUser}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenManagedDrawer={() => setManagedDrawerOpen(true)}
        className={`${
          showSidebarMobile
            ? "flex fixed inset-y-0 left-0 z-40"
            : "hidden md:flex"
        }`}
      />

      {/* 2. Middle Column: Active Chat Feed */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Fixed Chat Header */}
        <ChatHeader
          chat={chat}
          currentParticipant={currentParticipant}
          participants={participants}
          participantCount={participants.length}
          onlineCount={onlineParticipantIds.size}
          connectionStatus={connectionStatus}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenQR={() => setQrModalOpen(true)}
          onToggleGroupInfo={() => setShowGroupInfo(!showGroupInfo)}
          onToggleSidebar={() => setShowSidebarMobile(!showSidebarMobile)}
        />

        {/* Scrollable Message List */}
        <main className="flex-1 w-full flex flex-col overflow-hidden relative">
          <MessageList
            messages={messages}
            currentParticipantId={currentParticipant.anonymousId}
            isCreator={currentParticipant.isCreator}
            hasMoreOlder={hasMoreOlder}
            isLoadingOlder={isLoadingOlder}
            onLoadOlder={handleLoadOlder}
            onReply={(reply) => setReplyingTo(reply)}
            onToggleReaction={handleToggleReaction}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReportMessage={(msgId) => {
              setReportedMessageId(msgId);
              setReportModalOpen(true);
            }}
          />

          {/* Realtime Typing Indicator */}
          <TypingIndicator users={typingUsers} />
        </main>

        {/* Bottom Message Composer */}
        <div className="w-full shrink-0 z-30">
          <MessageComposer
            chatId={chatId}
            onSendMessage={handleSendMessage}
            onTyping={sendTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            disabled={chat.status !== "active"}
          />
        </div>
      </div>

      {/* 3. Right Column: Group Info & Members Panel (Only for Group Chats) */}
      {chat.type === "group" && showGroupInfo && (
        <GroupInfoPanel
          chat={chat}
          participants={participants as unknown as IParticipant[]}
          messages={messages}
          currentParticipantId={currentParticipant.anonymousId}
          onClose={() => setShowGroupInfo(false)}
          className="hidden lg:flex"
        />
      )}

      {/* Auth & Managed Drawers / Modals */}
      <UserAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
          fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => setManagedChats(d.managedChats || []));
        }}
      />

      <ManagedChatsDrawer
        isOpen={managedDrawerOpen}
        onClose={() => setManagedDrawerOpen(false)}
        user={currentUser}
        managedChats={managedChats}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          setCurrentUser(null);
          setManagedChats([]);
          setManagedDrawerOpen(false);
        }}
        onEndChat={async (cId) => {
          await fetch(`/api/chats/${cId}/end`, { method: "POST" });
          setManagedChats((prev) => prev.filter((item) => item.id !== cId));
        }}
        onNavigateToChat={(cId) => router.push(`/chat/${cId}`)}
      />

      {/* Chat Information & Participants Drawer */}
      <ChatDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chat={chat}
        currentParticipant={currentParticipant}
        participants={participants}
        onlineParticipantIds={onlineParticipantIds}
        onOpenQR={() => {
          setDrawerOpen(false);
          setQrModalOpen(true);
        }}
        onOpenChangeName={() => {
          setDrawerOpen(false);
          setChangeNameModalOpen(true);
        }}
        onOpenReport={() => {
          setDrawerOpen(false);
          setReportedMessageId(undefined);
          setReportModalOpen(true);
        }}
        onRegenerateLink={handleRegenerateLink}
        onEndChat={handleEndChat}
        onRemoveParticipant={handleRemoveParticipant}
        onUpdateGroupSettings={handleUpdateGroupSettings}
      />

      {/* QR Code Modal */}
      <ChatQRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        url={joinUrl}
        chatName={chat.name}
      />

      {/* Change Alias Modal */}
      <ChangeNameModal
        isOpen={changeNameModalOpen}
        onClose={() => setChangeNameModalOpen(false)}
        currentName={currentParticipant.displayName}
        onSaveName={handleSaveDisplayName}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        chatId={chatId}
        messageId={reportedMessageId}
      />

      {/* Custom Modal Popups */}
      {customModal && (
        <CustomModal
          isOpen={customModal.isOpen}
          onClose={() => setCustomModal(null)}
          title={customModal.title}
          description={customModal.description}
          type={customModal.type}
          confirmText={customModal.confirmText}
          cancelText={customModal.cancelText}
          onConfirm={customModal.onConfirm}
        />
      )}

      {/* Floating Custom Toast Popup */}
      <CustomToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
