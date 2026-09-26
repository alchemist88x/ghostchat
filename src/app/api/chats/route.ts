import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/userAuth";
import { getDb } from "@/lib/mongodb";
import { getOrCreateSessionToken } from "@/lib/session";
import { generateSecureToken, generateAnonymousId } from "@/lib/crypto";
import { generateAnonymousIdentity } from "@/lib/names";
import { calculateExpirationDate } from "@/lib/expiration";
import { createChatSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";
import { IChat, IParticipant } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = createChatSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { type, name, icon, maxParticipants } = parseResult.data;

    // Session resolution and rate limiting
    const { sessionHash } = await getOrCreateSessionToken();
    const rateCheck = await checkRateLimit("chatCreation", sessionHash);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. You can only create up to 10 chats per hour." },
        { status: 429 }
      );
    }

    const db = await getDb();
    const chatsCol = db.collection<IChat>("chats");
    const participantsCol = db.collection<IParticipant>("participants");

    const now = new Date();
    const expiresAt = calculateExpirationDate(now);
    const publicToken = generateSecureToken(24);
    const creatorAnonymousId = generateAnonymousId();
    const identity = generateAnonymousIdentity();

    const finalMaxParticipants =
      type === "personal" ? 2 : Math.min(Math.max(maxParticipants || 50, 2), 100);

    // Create Chat document
    const newChat: IChat = {
      publicToken,
      type,
      name: name || (type === "personal" ? "Anonymous Chat" : "Anonymous Group"),
      icon: icon || (type === "personal" ? "🔒" : "💬"),
      maxParticipants: finalMaxParticipants,
      createdAt: now,
      expiresAt,
      status: "active",
    };

    const chatInsertResult = await chatsCol.insertOne(newChat);
    const chatId = chatInsertResult.insertedId.toString();

    // Create Creator Participant document
    const creatorParticipant: IParticipant = {
      chatId,
      anonymousId: creatorAnonymousId,
      displayName: identity.fullName,
      isCreator: true,
      joinedAt: now,
      lastSeenAt: now,
      sessionHash,
    };

    const participantInsertResult = await participantsCol.insertOne(creatorParticipant);
    // Link creator id to chat
    await chatsCol.updateOne(
      { _id: chatInsertResult.insertedId },
      { $set: { createdByParticipantId: creatorAnonymousId } }
    );

    // If logged in as registered user, link chat to managedChatIds
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.username) {
      const usersCol = db.collection("users");
      await usersCol.updateOne(
        { username: currentUser.username },
        { $addToSet: { managedChatIds: chatId } }
      );
    }

    logEvent("chat.created", {
      chatId,
      type,
      maxParticipants: finalMaxParticipants,
    });

    return NextResponse.json(
      {
        success: true,
        chat: {
          id: chatId,
          publicToken,
          type,
          name: newChat.name,
          icon: newChat.icon,
          maxParticipants: finalMaxParticipants,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          status: "active",
        },
        participant: {
          id: participantInsertResult.insertedId.toString(),
          anonymousId: creatorAnonymousId,
          displayName: identity.fullName,
          avatarEmoji: identity.emoji,
          isCreator: true,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating chat:", err);
    return NextResponse.json(
      { error: "Internal server error while creating chat." },
      { status: 500 }
    );
  }
}
