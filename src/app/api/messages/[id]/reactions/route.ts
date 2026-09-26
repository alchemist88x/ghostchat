import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { authorizeParticipant } from "@/lib/auth";
import { reactionSchema, ALLOWED_REACTIONS } from "@/lib/validations";
import { broadcastChatEvent } from "@/lib/ably";
import { logEvent } from "@/lib/logger";
import { IMessage, IReaction } from "@/types";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid message ID." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = reactionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid reaction emoji", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { emoji } = parseResult.data;
    if (!ALLOWED_REACTIONS.includes(emoji as (typeof ALLOWED_REACTIONS)[number])) {
      return NextResponse.json({ error: "Emoji reaction is not permitted." }, { status: 400 });
    }

    const db = await getDb();
    const messagesCol = db.collection("messages");

    const message = (await messagesCol.findOne({ _id: new ObjectId(id) })) as IMessage | null;
    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const { auth, failure } = await authorizeParticipant(message.chatId);
    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    const participantId = auth.participant.anonymousId;
    const displayName = auth.participant.displayName;

    const existingReactions = message.reactions || [];
    const hasSameReaction = existingReactions.some(
      (r) => r.emoji === emoji && r.participantId === participantId
    );

    let updatedReactions: IReaction[];
    if (hasSameReaction) {
      // Toggle off
      updatedReactions = existingReactions.filter(
        (r) => !(r.emoji === emoji && r.participantId === participantId)
      );
    } else {
      // Toggle on: remove any previous reaction by this user on this message, then add new
      const filtered = existingReactions.filter((r) => r.participantId !== participantId);
      filtered.push({
        emoji,
        participantId,
        displayName,
        createdAt: new Date(),
      });
      updatedReactions = filtered;
    }

    await messagesCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { reactions: updatedReactions } }
    );

    // Broadcast reaction update
    await broadcastChatEvent(auth.chat.publicToken, "message:reaction", {
      messageId: id,
      reactions: updatedReactions,
    });

    logEvent("message.reaction", {
      chatId: message.chatId,
      messageId: id,
      emoji,
    });

    return NextResponse.json({
      success: true,
      messageId: id,
      reactions: updatedReactions,
    });
  } catch (err) {
    console.error("Error toggling reaction:", err);
    return NextResponse.json({ error: "Failed to update reaction." }, { status: 500 });
  }
}
