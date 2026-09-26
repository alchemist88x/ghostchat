import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { broadcastChatEvent } from "@/lib/ably";
import { purgeChatData } from "@/lib/purge";
import { logEvent } from "@/lib/logger";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { auth, failure } = await authorizeParticipant(id);

    if (failure || !auth) {
      return NextResponse.json(
        { error: failure?.error || "Unauthorized" },
        { status: failure?.status || 401 }
      );
    }

    // In group chats, require creator. In personal 1-on-1 chats, both participants can end the chat.
    if (auth.chat.type === "group" && !auth.participant.isCreator) {
      return NextResponse.json(
        { error: "Only the chat creator can end group chats." },
        { status: 403 }
      );
    }

    // Broadcast chat:ended event via Ably to immediately notify all connected participants
    await broadcastChatEvent(auth.chat.publicToken, "chat:ended", {
      chatId: auth.chat._id.toString(),
      message: "This chat has been ended and purged.",
    });

    logEvent("chat.ended", {
      chatId: auth.chat._id.toString(),
      creatorId: auth.participant.anonymousId,
    });

    // Authoritatively purge all chat documents, messages, participants, media, and attachments
    await purgeChatData(auth.chat._id.toString());

    return NextResponse.json({
      success: true,
      message: "Chat and all associated data have been permanently deleted.",
    });
  } catch (err) {
    console.error("Error ending chat:", err);
    return NextResponse.json({ error: "Failed to end chat." }, { status: 500 });
  }
}
