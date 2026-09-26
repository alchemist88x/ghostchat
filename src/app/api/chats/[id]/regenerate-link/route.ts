import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { generateSecureToken } from "@/lib/crypto";
import { broadcastChatEvent } from "@/lib/ably";
import { logEvent } from "@/lib/logger";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { auth, failure } = await authorizeParticipant(id, { requireCreator: true });

    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    const newPublicToken = generateSecureToken(24);
    const db = await getDb();

    await db.collection("chats").updateOne(
      { _id: auth.chat._id },
      { $set: { publicToken: newPublicToken } }
    );

    // Broadcast to current participants that invitation link changed
    await broadcastChatEvent(auth.chat.publicToken, "chat:updated", {
      chatId: auth.chat._id.toString(),
      updates: { publicToken: newPublicToken },
    });

    logEvent("chat.updated", {
      chatId: auth.chat._id.toString(),
      action: "regenerate_link",
    });

    return NextResponse.json({
      success: true,
      publicToken: newPublicToken,
    });
  } catch (err) {
    console.error("Error regenerating invitation link:", err);
    return NextResponse.json(
      { error: "Failed to regenerate invitation link." },
      { status: 500 }
    );
  }
}
