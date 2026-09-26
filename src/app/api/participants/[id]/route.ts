import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { authorizeParticipant } from "@/lib/auth";
import { updateParticipantSchema } from "@/lib/validations";
import { broadcastChatEvent } from "@/lib/ably";
import { logEvent } from "@/lib/logger";
import { IParticipant } from "@/types";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const { auth, failure } = await authorizeParticipant(chatId);
    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    // Verify participant is modifying their own name
    if (auth.participant._id?.toString() !== id && auth.participant.anonymousId !== id) {
      return NextResponse.json(
        { error: "You can only update your own display name." },
        { status: 403 }
      );
    }

    const parseResult = updateParticipantSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid name format.", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const newDisplayName = parseResult.data.displayName;
    const db = await getDb();
    const participantsCol = db.collection<IParticipant>("participants");

    await participantsCol.updateOne(
      { _id: auth.participant._id },
      { $set: { displayName: newDisplayName, lastSeenAt: new Date() } }
    );

    // Broadcast participant update
    await broadcastChatEvent(auth.chat.publicToken, "participant:updated", {
      participantId: auth.participant.anonymousId,
      displayName: newDisplayName,
    });

    logEvent("participant.name_changed", {
      chatId: auth.chat._id.toString(),
      participantId: auth.participant.anonymousId,
    });

    return NextResponse.json({
      success: true,
      participantId: auth.participant.anonymousId,
      displayName: newDisplayName,
    });
  } catch (err) {
    console.error("Error updating participant name:", err);
    return NextResponse.json({ error: "Failed to update display name." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json({ error: "chatId query parameter required." }, { status: 400 });
    }

    const { auth, failure } = await authorizeParticipant(chatId, { requireCreator: true });
    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    const db = await getDb();
    const participantsCol = db.collection("participants");

    const query: Record<string, unknown> = { chatId: auth.chat._id.toString() };
    if (ObjectId.isValid(id)) {
      query.$or = [{ _id: new ObjectId(id) }, { anonymousId: id }];
    } else {
      query.anonymousId = id;
    }

    const targetParticipant = (await participantsCol.findOne(query)) as IParticipant | null;

    if (!targetParticipant) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 });
    }

    if (targetParticipant.isCreator) {
      return NextResponse.json({ error: "The chat creator cannot be removed." }, { status: 400 });
    }

    const deleteFilter: Record<string, unknown> = { chatId: auth.chat._id.toString() };
    if (ObjectId.isValid(id)) {
      deleteFilter._id = new ObjectId(id);
    } else {
      deleteFilter.anonymousId = id;
    }
    await participantsCol.deleteOne(deleteFilter);

    // Broadcast removal event
    await broadcastChatEvent(auth.chat.publicToken, "participant:left", {
      participantId: targetParticipant.anonymousId,
      displayName: targetParticipant.displayName,
    });

    logEvent("participant.left", {
      chatId: auth.chat._id.toString(),
      participantId: targetParticipant.anonymousId,
    });

    return NextResponse.json({ success: true, removedId: targetParticipant.anonymousId });
  } catch (err) {
    console.error("Error removing participant:", err);
    return NextResponse.json({ error: "Failed to remove participant." }, { status: 500 });
  }
}
