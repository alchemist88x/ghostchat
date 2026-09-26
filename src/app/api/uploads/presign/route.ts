import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { uploadPresignSchema, MAX_IMAGE_SIZE, MAX_VOICE_SIZE, MAX_FILE_SIZE } from "@/lib/validations";
import { generateStorageKey } from "@/lib/crypto";
import { createPresignedUploadUrl } from "@/lib/r2";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/3gpp",
  "video/avi",
  // Audio
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/m4a",
  // Documents / Files
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { chatId, ...uploadData } = body;

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const { auth, failure } = await authorizeParticipant(chatId);
    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    // Rate limiting: 10 uploads per minute per participant
    const rateCheck = await checkRateLimit("uploads", auth.participant.anonymousId);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Upload rate limit reached. Please wait a moment." },
        { status: 429 }
      );
    }

    const parseResult = uploadPresignSchema.safeParse(uploadData);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid upload parameters.", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { type, originalName, mimeType, size } = parseResult.data;

    // Check MIME type whitelist
    const normalizedMime = mimeType.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime) && !normalizedMime.startsWith("image/") && !normalizedMime.startsWith("video/") && !normalizedMime.startsWith("audio/")) {
      return NextResponse.json(
        { error: `File type "${mimeType}" is not supported.` },
        { status: 400 }
      );
    }

    // Check size limit according to type
    let maxSize = MAX_FILE_SIZE;
    if (type === "image") maxSize = MAX_IMAGE_SIZE;
    if (type === "voice") maxSize = MAX_VOICE_SIZE;
    if (type === "video") maxSize = MAX_FILE_SIZE;

    if (size > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${maxMb}MB for ${type}s.` },
        { status: 400 }
      );
    }

    // Extract safe extension
    const extMatch = originalName.match(/\.([0-9a-z]+)$/i);
    const safeExt = extMatch ? `.${extMatch[1].toLowerCase()}` : "";

    const storageKey = generateStorageKey(auth.chat._id.toString(), safeExt);
    let presignResult = await createPresignedUploadUrl(storageKey, normalizedMime, size);

    if (!presignResult) {
      // Local fallback when Cloudflare R2 / AWS S3 is not configured
      const origin = req.headers.get("origin") || req.nextUrl.origin || "http://localhost:3000";
      presignResult = {
        uploadUrl: `${origin}/api/uploads/direct?key=${storageKey}&mime=${encodeURIComponent(normalizedMime)}`,
        publicUrl: `/api/uploads/file/${storageKey}`,
      };
    }

    logEvent("upload.presigned", {
      chatId: auth.chat._id.toString(),
      type,
      size,
    });

    return NextResponse.json({
      success: true,
      uploadUrl: presignResult.uploadUrl,
      publicUrl: presignResult.publicUrl,
      storageKey,
      mimeType: normalizedMime,
      size,
      originalName,
      type,
    });
  } catch (err) {
    console.error("Error creating upload presign URL:", err);
    return NextResponse.json(
      { error: "Internal server error while preparing upload." },
      { status: 500 }
    );
  }
}
