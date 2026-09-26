import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { deleteR2Objects } from "@/lib/r2";
import { logEvent } from "@/lib/logger";
import { IAttachment, IChat } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    // Enforce Vercel cron secret authentication if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron invocation" }, { status: 401 });
    }

    const db = await getDb();
    const chatsCol = db.collection<IChat>("chats");
    const attachmentsCol = db.collection<IAttachment>("attachments");
    const messagesCol = db.collection("messages");
    const participantsCol = db.collection("participants");

    const now = new Date();

    // 1. Find all expired chats
    const expiredChats = await chatsCol
      .find({
        $or: [{ expiresAt: { $lte: now } }, { status: "expired" }],
      })
      .project({ _id: 1 })
      .toArray();

    const expiredChatIds = expiredChats.map((c) => c._id.toString());
    const expiredChatObjIds = expiredChats.map((c) => c._id);

    // 2. Find attachments associated with expired chats or expired on their own
    const expiredAttachments = await attachmentsCol
      .find({
        $or: [
          { chatId: { $in: expiredChatIds } },
          { expiresAt: { $lte: now } },
        ],
      })
      .project({ storageKey: 1 })
      .toArray();

    const storageKeys = expiredAttachments
      .map((a) => a.storageKey)
      .filter((k): k is string => Boolean(k));

    // 3. Delete media from Cloudflare R2 in chunks of 500
    let totalMediaDeleted = 0;
    const chunkSize = 500;
    for (let i = 0; i < storageKeys.length; i += chunkSize) {
      const chunk = storageKeys.slice(i, i + chunkSize);
      const deletedCount = await deleteR2Objects(chunk);
      totalMediaDeleted += deletedCount;
    }

    // 4. Clean MongoDB documents
    const [attachmentsRes, messagesRes, participantsRes, chatsRes] = await Promise.all([
      attachmentsCol.deleteMany({
        $or: [
          { chatId: { $in: expiredChatIds } },
          { expiresAt: { $lte: now } },
        ],
      }),
      messagesCol.deleteMany({
        $or: [
          { chatId: { $in: expiredChatIds } },
          { expiresAt: { $lte: now } },
        ],
      }),
      participantsCol.deleteMany({
        chatId: { $in: expiredChatIds },
      }),
      chatsCol.deleteMany({
        _id: { $in: expiredChatObjIds },
      }),
    ]);

    logEvent("cron.cleanup", {
      expiredChatsCount: expiredChatIds.length,
      attachmentsDeleted: attachmentsRes.deletedCount,
      messagesDeleted: messagesRes.deletedCount,
      participantsDeleted: participantsRes.deletedCount,
      mediaObjectsDeleted: totalMediaDeleted,
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        chatsRemoved: chatsRes.deletedCount,
        messagesRemoved: messagesRes.deletedCount,
        participantsRemoved: participantsRes.deletedCount,
        attachmentsRemoved: attachmentsRes.deletedCount,
        r2MediaDeleted: totalMediaDeleted,
      },
    });
  } catch (err) {
    console.error("Cron cleanup failed:", err);
    return NextResponse.json({ error: "Cleanup execution failed." }, { status: 500 });
  }
}
