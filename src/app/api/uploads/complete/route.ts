import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { logEvent } from "@/lib/logger";
import { IAttachment } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { chatId, storageKey, publicUrl, originalName, mimeType, size, type, duration, width, height } = body;

    if (!chatId || !storageKey || !publicUrl || !originalName || !mimeType || !size || !type) {
      return NextResponse.json({ error: "Missing required attachment metadata." }, { status: 400 });
    }

    const { auth, failure } = await authorizeParticipant(chatId);
    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    const db = await getDb();
    const attachmentsCol = db.collection<IAttachment>("attachments");

    const now = new Date();
    const attachment: IAttachment = {
      chatId: auth.chat._id.toString(),
      type,
      storageKey,
      publicUrl,
      originalName,
      mimeType,
      size: Number(size),
      duration: duration ? Number(duration) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      createdAt: now,
      expiresAt: auth.chat.expiresAt,
    };

    const result = await attachmentsCol.insertOne(attachment);

    logEvent("upload.completed", {
      chatId: auth.chat._id.toString(),
      storageKey,
      type,
    });

    return NextResponse.json({
      success: true,
      attachment: {
        id: result.insertedId.toString(),
        ...attachment,
      },
    });
  } catch (err) {
    console.error("Error saving attachment metadata:", err);
    return NextResponse.json({ error: "Failed to record attachment." }, { status: 500 });
  }
}
