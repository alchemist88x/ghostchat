import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { getSessionHash } from "./session";
import { isExpired } from "./expiration";
import { IChat, IParticipant } from "@/types";

export interface AuthContext {
  chat: IChat & { _id: ObjectId };
  participant: IParticipant & { _id: ObjectId };
  sessionHash: string;
}

export type AuthFailure = {
  error: string;
  status: number;
};

/**
 * Authorize an anonymous participant request against a chat.
 * Resolves sessionHash from HTTP-only cookie, locates the chat,
 * checks expiration, validates membership and optional creator requirement.
 */
export async function authorizeParticipant(
  chatIdentifier: string,
  options: { requireCreator?: boolean } = {}
): Promise<{ auth: AuthContext | null; failure: AuthFailure | null }> {
  const sessionHash = await getSessionHash();
  if (!sessionHash) {
    return {
      auth: null,
      failure: { error: "No anonymous session found. Please join the chat first.", status: 401 },
    };
  }

  const db = await getDb();
  const chatsCol = db.collection("chats");
  const participantsCol = db.collection("participants");

  // Determine query by ObjectId or publicToken
  let chatQuery: Record<string, unknown>;
  if (ObjectId.isValid(chatIdentifier) && chatIdentifier.length === 24) {
    chatQuery = { _id: new ObjectId(chatIdentifier) };
  } else {
    chatQuery = { publicToken: chatIdentifier };
  }

  const chat = (await chatsCol.findOne(chatQuery)) as (IChat & { _id: ObjectId }) | null;
  if (!chat) {
    return {
      auth: null,
      failure: { error: "Chat not found.", status: 404 },
    };
  }

  // Authoritative server-side expiration check
  if (chat.status === "expired" || isExpired(chat.expiresAt)) {
    if (chat.status !== "expired") {
      await chatsCol.updateOne({ _id: chat._id }, { $set: { status: "expired" } });
    }
    return {
      auth: null,
      failure: {
        error: "This chat has expired. Temporary chats automatically disappear after 3 days.",
        status: 410,
      },
    };
  }

  if (chat.status === "ended") {
    return {
      auth: null,
      failure: { error: "This chat has been ended by the creator.", status: 410 },
    };
  }

  // Find participant record matching this chat and the secure sessionHash
  const participant = (await participantsCol.findOne({
    chatId: chat._id.toString(),
    sessionHash,
  })) as (IParticipant & { _id: ObjectId }) | null;

  if (!participant) {
    return {
      auth: null,
      failure: { error: "You are not a participant of this chat.", status: 403 },
    };
  }

  if (options.requireCreator && !participant.isCreator) {
    return {
      auth: null,
      failure: { error: "Only the chat creator can perform this action.", status: 403 },
    };
  }

  // Silently touch lastSeenAt
  participantsCol
    .updateOne({ _id: participant._id }, { $set: { lastSeenAt: new Date() } })
    .catch(() => {});

  return {
    auth: { chat, participant, sessionHash },
    failure: null,
  };
}
