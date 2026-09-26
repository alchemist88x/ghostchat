import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { authorizeParticipant } from "@/lib/auth";
import { editMessageSchema, deleteMessageSchema } from "@/lib/validations";
import { broadcastChatEvent } from "@/lib/ably";
import { logEvent } from "@/lib/logger";
import { IMessage } from "@/types";

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid message ID." }, { status: 400 });
    }

    const db = await getDb();
    const messagesCol = db.collection("messages");

    const message = (await messagesCol.findOne({ _id: new ObjectId(id) })) as IMessage | null;
    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    // Authorize participant against this chat
    const { auth, failure } = await authorizeParticipant(message.chatId);
    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    // Must be sender
    if (message.senderId !== auth.participant.anonymousId) {
      return NextResponse.json({ error: "You can only edit your own messages." }, { status: 403 });
    }

    if (message.deletedForEveryone) {
      return NextResponse.json({ error: "Deleted messages cannot be edited." }, { status: 400 });
    }

    // Only text messages can be edited
    if (message.type !== "text") {
      return NextResponse.json({ error: "Only text messages can be edited." }, { status: 400 });
    }

    // Check 5-minute edit window
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > EDIT_WINDOW_MS) {
      return NextResponse.json(
        { error: "Messages can only be edited within 5 minutes of sending." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = editMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid message content", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const now = new Date();
    const updatedContent = parseResult.data.content;

    await messagesCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          content: updatedContent,
          editedAt: now,
          updatedAt: now,
        },
      }
    );

    // Broadcast edit event via Ably
    await broadcastChatEvent(auth.chat.publicToken, "message:update", {
      messageId: id,
      content: updatedContent,
      editedAt: now.toISOString(),
    });

    logEvent("message.edited", {
      chatId: message.chatId,
      messageId: id,
    });

    return NextResponse.json({
      success: true,
      messageId: id,
      content: updatedContent,
      editedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Error editing message:", err);
    return NextResponse.json({ error: "Failed to edit message." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid message ID." }, { status: 400 });
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

    // Only sender or group creator can delete for everyone
    const isOwner = message.senderId === auth.participant.anonymousId;
    const isCreator = auth.participant.isCreator;

    if (!isOwner && !isCreator) {
      return NextResponse.json(
        { error: "You do not have permission to delete this message." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = deleteMessageSchema.safeParse(body);
    const deleteForEveryone = parseResult.success ? parseResult.data.deleteForEveryone : true;

    const now = new Date();

    if (deleteForEveryone) {
      await messagesCol.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            deletedForEveryone: true,
            deletedAt: now,
            content: "This message was deleted",
            attachments: [],
          },
        }
      );

      // Broadcast delete event
      await broadcastChatEvent(auth.chat.publicToken, "message:delete", {
        messageId: id,
        deletedAt: now.toISOString(),
        deletedForEveryone: true,
      });

      logEvent("message.deleted", {
        chatId: message.chatId,
        messageId: id,
      });
    }

    return NextResponse.json({ success: true, messageId: id });
  } catch (err) {
    console.error("Error deleting message:", err);
    return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
  }
}
