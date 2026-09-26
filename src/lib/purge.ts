import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { deleteR2Objects } from "./r2";
import { logEvent } from "./logger";
import { IAttachment } from "@/types";

/**
 * Authoritatively purge all data associated with a chat:
 * - S3 / Cloudflare R2 uploaded media objects
 * - Local upload binaries in MongoDB
 * - Messages collection
 * - Participants collection
 * - Attachments collection
 * - Reports collection
 * - Chat document itself from `chats` collection
 */
export async function purgeChatData(chatId: string): Promise<boolean> {
  try {
    const db = await getDb();
    let chatObjId: ObjectId | null = null;
    try {
      chatObjId = new ObjectId(chatId);
    } catch {
      // String ID fallback
    }

    // 1. Find all attachments to collect S3 storage keys
    const attachments = await db
      .collection<IAttachment>("attachments")
      .find({ chatId })
      .project({ storageKey: 1 })
      .toArray();

    const storageKeys = attachments
      .map((a) => a.storageKey)
      .filter((k): k is string => Boolean(k));

    // 2. Delete media objects from S3 / R2 in chunks of 500
    if (storageKeys.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < storageKeys.length; i += chunkSize) {
        const chunk = storageKeys.slice(i, i + chunkSize);
        await deleteR2Objects(chunk);
      }
    }

    // 3. Delete local uploads matching key prefix
    await db.collection("local_uploads").deleteMany({
      $or: [
        { key: { $regex: `^ghostchat/${chatId}/` } },
        { key: { $regex: `^chats/${chatId}/` } },
      ],
    });

    // 4. Delete documents from all related MongoDB collections
    const deleteConditions: Record<string, unknown>[] = [{ chatId }];
    if (chatObjId) {
      deleteConditions.push({ chatId: chatObjId.toString() });
    }

    await Promise.all([
      db.collection("attachments").deleteMany({ $or: deleteConditions }),
      db.collection("messages").deleteMany({ $or: deleteConditions }),
      db.collection("participants").deleteMany({ $or: deleteConditions }),
      db.collection("reports").deleteMany({ $or: deleteConditions }),
      chatObjId
        ? db.collection("chats").deleteOne({ _id: chatObjId })
        : db.collection("chats").deleteMany({ id: chatId }),
    ]);

    logEvent("chat.ended", {
      chatId,
      purged: true,
      mediaCount: storageKeys.length,
    });

    return true;
  } catch (err) {
    console.error("Error purging chat data:", err);
    return false;
  }
}
