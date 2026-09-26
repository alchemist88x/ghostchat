import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { sendMessageSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { broadcastChatEvent } from "@/lib/ably";
import { logEvent } from "@/lib/logger";
import { IMessage } from "@/types";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { auth, failure } = await authorizeParticipant(id);

    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const before = searchParams.get("before"); // ISO date string or timestamp cursor

    const db = await getDb();
    const messagesCol = db.collection<IMessage>("messages");

    const query: Record<string, unknown> = {
      chatId: auth.chat._id.toString(),
    };

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    // Fetch messages sorted newest first for pagination, then reverse for display
    const rawMessages = await messagesCol
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Map to safe client format
    const messages = rawMessages.reverse().map((m) => ({
      id: m._id?.toString(),
      chatId: m.chatId,
      senderId: m.senderId,
      senderName: m.senderName,
      clientMessageId: m.clientMessageId,
      type: m.type,
      content: m.deletedForEveryone ? "This message was deleted" : m.content,
      replyTo: m.replyTo,
      attachments: m.deletedForEveryone ? [] : m.attachments || [],
      reactions: m.reactions || [],
      createdAt: m.createdAt,
      editedAt: m.editedAt,
      deletedAt: m.deletedAt,
      deletedForEveryone: m.deletedForEveryone,
      isOwn: m.senderId === auth.participant.anonymousId,
    }));

    const nextCursor = rawMessages.length > 0 ? rawMessages[0].createdAt : null;
    const hasMore = rawMessages.length === limit;

    return NextResponse.json({
      messages,
      hasMore,
      nextCursor,
    });
  } catch (err) {
    console.error("Error retrieving messages:", err);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { auth, failure } = await authorizeParticipant(id);

    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    // Rate limiting: 30 messages per minute per participant
    const rateCheck = await checkRateLimit("messages", auth.participant.anonymousId);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "You are sending messages too quickly. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = sendMessageSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid message data", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { clientMessageId, type, content, replyTo, attachments } = parseResult.data;

    // Validate that message is not completely empty
    if (type === "text" && (!content || content.trim().length === 0)) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    if ((type === "image" || type === "file" || type === "voice") && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: "Media message must include an attachment." }, { status: 400 });
    }

    const db = await getDb();
    const messagesCol = db.collection<IMessage>("messages");

    // Idempotency check: prevent duplicate messages from network retries
    const existing = await messagesCol.findOne({
      chatId: auth.chat._id.toString(),
      clientMessageId,
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: {
          id: existing._id?.toString(),
          ...existing,
          isOwn: true,
        },
      });
    }

    const now = new Date();
    const newMessage: IMessage = {
      chatId: auth.chat._id.toString(),
      senderId: auth.participant.anonymousId,
      senderName: auth.participant.displayName,
      clientMessageId,
      type,
      content: content.trim(),
      replyTo,
      attachments: attachments?.map((att) => ({
        ...att,
        chatId: auth.chat._id.toString(),
        createdAt: now,
        expiresAt: auth.chat.expiresAt,
      })),
      reactions: [],
      createdAt: now,
      expiresAt: auth.chat.expiresAt,
    };

    const insertResult = await messagesCol.insertOne(newMessage);
    const messageId = insertResult.insertedId.toString();

    const formattedMessage = {
      id: messageId,
      chatId: newMessage.chatId,
      senderId: newMessage.senderId,
      senderName: newMessage.senderName,
      clientMessageId: newMessage.clientMessageId,
      type: newMessage.type,
      content: newMessage.content,
      replyTo: newMessage.replyTo,
      attachments: newMessage.attachments || [],
      reactions: [],
      createdAt: now.toISOString(),
      expiresAt: auth.chat.expiresAt.toISOString(),
    };

    // Broadcast message via Ably
    await broadcastChatEvent(auth.chat.publicToken, "message:new", formattedMessage);

    logEvent("message.created", {
      chatId: auth.chat._id.toString(),
      messageId,
      type,
    });

    return NextResponse.json(
      {
        success: true,
        message: {
          ...formattedMessage,
          isOwn: true,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating message:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
