import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { generateStorageKey } from "@/lib/crypto";
import { uploadDirectToS3 } from "@/lib/r2";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";
import { IAttachment, MessageType } from "@/types";
import { MAX_IMAGE_SIZE, MAX_VOICE_SIZE, MAX_FILE_SIZE } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const chatId = formData.get("chatId") as string | null;
    const type = (formData.get("type") as MessageType) || "file";
    const rawOriginalName = formData.get("originalName") as string | null;
    const durationStr = formData.get("duration") as string | null;

    if (!file || !chatId) {
      return NextResponse.json(
        { error: "File and chatId are required." },
        { status: 400 }
      );
    }

    const { auth, failure } = await authorizeParticipant(chatId);
    if (failure || !auth) {
      return NextResponse.json(
        { error: failure?.error || "Unauthorized" },
        { status: failure?.status || 401 }
      );
    }

    // Rate limiting: 10 uploads per minute per participant
    const rateCheck = await checkRateLimit("uploads", auth.participant.anonymousId);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Upload rate limit reached. Please wait a moment." },
        { status: 429 }
      );
    }

    const originalName = rawOriginalName || file.name || "upload";
    const mimeType = file.type || "application/octet-stream";
    const size = file.size;

    // Check size limit according to type
    let maxSize = MAX_FILE_SIZE;
    if (type === "image") maxSize = MAX_IMAGE_SIZE;
    if (type === "voice") maxSize = MAX_VOICE_SIZE;

    if (size > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${maxMb}MB.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract safe extension
    const extMatch = originalName.match(/\.([0-9a-z]+)$/i);
    const safeExt = extMatch ? `.${extMatch[1].toLowerCase()}` : "";

    // Generate storage key with dedicated chat subfolder starting with ghostchat/<chat_folder>/
    const storageKey = generateStorageKey(auth.chat._id.toString(), safeExt, auth.chat.name);

    // Upload directly to S3 / Cloudflare R2
    let s3Result = await uploadDirectToS3(storageKey, buffer, mimeType);
    let publicUrl = s3Result?.publicUrl;

    if (!publicUrl) {
      // Local fallback when S3 upload fails or is not configured
      const db = await getDb();
      const uploadsCol = db.collection("local_uploads");
      const base64Data = buffer.toString("base64");

      await uploadsCol.updateOne(
        { key: storageKey },
        {
          $set: {
            key: storageKey,
            mime: mimeType,
            data: base64Data,
            size: buffer.length,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      publicUrl = `/api/uploads/file/${storageKey}`;
    }

    // Save attachment metadata into DB
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
      size: buffer.length,
      duration: durationStr ? Number(durationStr) : undefined,
      createdAt: now,
      expiresAt: auth.chat.expiresAt,
    };

    const insertResult = await attachmentsCol.insertOne(attachment);

    logEvent("upload.completed", {
      chatId: auth.chat._id.toString(),
      storageKey,
      type,
      publicUrl,
    });

    return NextResponse.json({
      success: true,
      attachment: {
        id: insertResult.insertedId.toString(),
        ...attachment,
      },
    });
  } catch (err) {
    console.error("Error performing direct server upload:", err);
    return NextResponse.json(
      { error: "Internal server error while uploading file." },
      { status: 500 }
    );
  }
}
