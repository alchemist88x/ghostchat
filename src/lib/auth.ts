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

  // Import getCurrentUser helper dynamically to avoid circular dependencies
  const { getCurrentUser } = await import("./userAuth");
  const currentUser = await getCurrentUser();

  const orConditions: Record<string, unknown>[] = [];
  if (sessionHash) {
    orConditions.push({ sessionHash });
  }
  if (currentUser) {
    if (currentUser.id) orConditions.push({ userId: currentUser.id });
    if (currentUser.username) orConditions.push({ username: currentUser.username });
  }

  if (orConditions.length === 0) {
    return {
      auth: null,
      failure: { error: "No session or account credentials found.", status: 401 },
    };
  }

  // Find participant record matching this chat and either secure sessionHash or registered account
  let participant = (await participantsCol.findOne({
    chatId: chat._id.toString(),
    $or: orConditions,
  })) as (IParticipant & { _id: ObjectId }) | null;

  // Fallback: If user is logged in and owns/manages this chat but participant record lacks userId/username
  if (!participant && currentUser && currentUser.managedChatIds?.includes(chat._id.toString())) {
    participant = (await participantsCol.findOne({
      chatId: chat._id.toString(),
      isCreator: true,
    })) as (IParticipant & { _id: ObjectId }) | null;

    if (participant && sessionHash) {
      // Bind current device sessionHash & user details to participant record
      await participantsCol.updateOne(
        { _id: participant._id },
        {
          $set: {
            sessionHash,
            userId: currentUser.id,
            username: currentUser.username,
            lastSeenAt: new Date(),
          },
        }
      );
    }
  }

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

  // Touch lastSeenAt and ensure sessionHash & user details are synced to current device
  const updatePayload: Record<string, unknown> = { lastSeenAt: new Date() };
  if (sessionHash && participant.sessionHash !== sessionHash) {
    updatePayload.sessionHash = sessionHash;
  }
  if (currentUser && !participant.username) {
    updatePayload.username = currentUser.username;
    if (currentUser.id) updatePayload.userId = currentUser.id;
  }

  participantsCol
    .updateOne({ _id: participant._id }, { $set: updatePayload })
    .catch(() => {});

  return {
    auth: { chat, participant, sessionHash },
    failure: null,
  };
}
