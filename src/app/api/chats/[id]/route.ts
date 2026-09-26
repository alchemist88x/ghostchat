import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { updateGroupSettingsSchema } from "@/lib/validations";
import { broadcastChatEvent } from "@/lib/ably";
import { logEvent } from "@/lib/logger";
import { IParticipant } from "@/types";

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

    const db = await getDb();
    const participantsCol = db.collection<IParticipant>("participants");

    // Fetch all participants in this chat (safe public fields only)
    const rawParticipants = await participantsCol
      .find({ chatId: auth.chat._id.toString() })
      .sort({ joinedAt: 1 })
      .toArray();

    const participants = rawParticipants.map((p) => ({
      id: p._id?.toString(),
      anonymousId: p.anonymousId,
      displayName: p.displayName,
      isCreator: p.isCreator,
      joinedAt: p.joinedAt,
      lastSeenAt: p.lastSeenAt,
    }));

    return NextResponse.json({
      chat: {
        id: auth.chat._id.toString(),
        publicToken: auth.chat.publicToken,
        type: auth.chat.type,
        name: auth.chat.name,
        icon: auth.chat.icon,
        maxParticipants: auth.chat.maxParticipants,
        participantCount: participants.length,
        createdAt: auth.chat.createdAt,
        expiresAt: auth.chat.expiresAt,
        status: auth.chat.status,
      },
      participant: {
        id: auth.participant._id?.toString(),
        anonymousId: auth.participant.anonymousId,
        displayName: auth.participant.displayName,
        isCreator: auth.participant.isCreator,
        joinedAt: auth.participant.joinedAt,
      },
      participants,
    });
  } catch (err) {
    console.error("Error retrieving chat:", err);
    return NextResponse.json({ error: "Failed to load chat details." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { auth, failure } = await authorizeParticipant(id, { requireCreator: true });

    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    if (auth.chat.type !== "group") {
      return NextResponse.json(
        { error: "Only group chats have configurable settings." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateGroupSettingsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid settings update", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Partial<{ name: string; icon: string; maxParticipants: number }> = {};
    if (parseResult.data.name !== undefined) updates.name = parseResult.data.name;
    if (parseResult.data.icon !== undefined) updates.icon = parseResult.data.icon;
    if (parseResult.data.maxParticipants !== undefined) {
      const db = await getDb();
      const currentCount = await db
        .collection("participants")
        .countDocuments({ chatId: auth.chat._id.toString() });

      if (parseResult.data.maxParticipants < currentCount) {
        return NextResponse.json(
          {
            error: `Max participants cannot be set lower than current member count (${currentCount}).`,
          },
          { status: 400 }
        );
      }
      updates.maxParticipants = parseResult.data.maxParticipants;
    }

    if (Object.keys(updates).length > 0) {
      const db = await getDb();
      await db.collection("chats").updateOne({ _id: auth.chat._id }, { $set: updates });

      // Broadcast update to all participants via Ably
      await broadcastChatEvent(auth.chat.publicToken, "chat:updated", {
        chatId: auth.chat._id.toString(),
        updates,
      });

      logEvent("chat.updated", { chatId: auth.chat._id.toString(), updates });
    }

    return NextResponse.json({ success: true, updates });
  } catch (err) {
    console.error("Error updating chat settings:", err);
    return NextResponse.json({ error: "Failed to update chat settings." }, { status: 500 });
  }
}
