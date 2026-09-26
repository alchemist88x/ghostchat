import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getOrCreateSessionToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/userAuth";
import { generateAnonymousId } from "@/lib/crypto";
import { generateAnonymousIdentity } from "@/lib/names";
import { isExpired } from "@/lib/expiration";
import { checkRateLimit } from "@/lib/rate-limit";
import { broadcastChatEvent } from "@/lib/ably";
import { logEvent } from "@/lib/logger";
import { IChat, IParticipant } from "@/types";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const requestedDisplayName = typeof body.displayName === "string" ? body.displayName.trim() : undefined;

    const { sessionHash } = await getOrCreateSessionToken();

    // Rate limit join attempts
    const rateCheck = await checkRateLimit("joinAttempts", sessionHash);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many join attempts. Please try again later." },
        { status: 429 }
      );
    }

    const db = await getDb();
    const chatsCol = db.collection<IChat>("chats");
    const participantsCol = db.collection<IParticipant>("participants");

    // Locate chat by publicToken or ObjectId
    let chatQuery: Record<string, unknown>;
    if (ObjectId.isValid(id) && id.length === 24) {
      chatQuery = { _id: new ObjectId(id) };
    } else {
      chatQuery = { publicToken: id };
    }

    const chat = await chatsCol.findOne(chatQuery);
    if (!chat) {
      return NextResponse.json(
        { error: "This invitation link is invalid. The link may have been copied incorrectly." },
        { status: 404 }
      );
    }

    // Expiration check
    if (chat.status === "expired" || isExpired(chat.expiresAt)) {
      if (chat.status !== "expired") {
        await chatsCol.updateOne({ _id: chat._id }, { $set: { status: "expired" } });
      }
      return NextResponse.json(
        { error: "This chat has expired. Temporary chats automatically disappear after 3 days." },
        { status: 410 }
      );
    }

    if (chat.status === "ended") {
      return NextResponse.json(
        { error: "This chat has been ended by the creator." },
        { status: 410 }
      );
    }

    const chatIdStr = chat._id!.toString();

    // Link joined chat to logged-in user account if authenticated
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.username) {
      const usersCol = db.collection("users");
      await usersCol.updateOne(
        { username: currentUser.username },
        { $addToSet: { managedChatIds: chatIdStr } }
      );
    }

    // Check if user is already a participant in this chat
    const existingParticipant = await participantsCol.findOne({
      chatId: chatIdStr,
      sessionHash,
    });

    if (existingParticipant) {
      // User is already a participant, allow resuming conversation
      await participantsCol.updateOne(
        { _id: existingParticipant._id },
        { $set: { lastSeenAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        alreadyMember: true,
        chat: {
          id: chatIdStr,
          publicToken: chat.publicToken,
          type: chat.type,
          name: chat.name,
          icon: chat.icon,
          maxParticipants: chat.maxParticipants,
          expiresAt: chat.expiresAt,
          status: chat.status,
        },
        participant: {
          id: existingParticipant._id?.toString(),
          anonymousId: existingParticipant.anonymousId,
          displayName: existingParticipant.displayName,
          isCreator: existingParticipant.isCreator,
        },
      });
    }

    // Atomic participant count verification
    const currentCount = await participantsCol.countDocuments({ chatId: chatIdStr });

    if (chat.type === "personal" && currentCount >= 2) {
      return NextResponse.json(
        {
          error: "This personal chat is already full. Only two people can participate in this conversation.",
        },
        { status: 403 }
      );
    }

    if (chat.type === "group" && currentCount >= chat.maxParticipants) {
      return NextResponse.json(
        { error: `This group has reached its participant limit of ${chat.maxParticipants}.` },
        { status: 403 }
      );
    }

    // Generate anonymous identity
    const generatedIdentity = generateAnonymousIdentity();
    const finalDisplayName =
      requestedDisplayName && requestedDisplayName.length > 0 && requestedDisplayName.length <= 40
        ? requestedDisplayName
        : generatedIdentity.fullName;

    const newAnonymousId = generateAnonymousId();
    const now = new Date();

    const newParticipant: IParticipant = {
      chatId: chatIdStr,
      anonymousId: newAnonymousId,
      displayName: finalDisplayName,
      isCreator: false,
      joinedAt: now,
      lastSeenAt: now,
      sessionHash,
    };

    const insertResult = await participantsCol.insertOne(newParticipant);
    const participantId = insertResult.insertedId.toString();

    // Broadcast realtime event
    await broadcastChatEvent(chat.publicToken, "participant:joined", {
      participant: {
        id: participantId,
        anonymousId: newAnonymousId,
        displayName: finalDisplayName,
        joinedAt: now.toISOString(),
      },
      currentCount: currentCount + 1,
    });

    logEvent("participant.joined", {
      chatId: chatIdStr,
      participantId: newAnonymousId,
    });

    return NextResponse.json({
      success: true,
      chat: {
        id: chatIdStr,
        publicToken: chat.publicToken,
        type: chat.type,
        name: chat.name,
        icon: chat.icon,
        maxParticipants: chat.maxParticipants,
        expiresAt: chat.expiresAt,
        status: chat.status,
      },
      participant: {
        id: participantId,
        anonymousId: newAnonymousId,
        displayName: finalDisplayName,
        isCreator: false,
      },
    });
  } catch (err) {
    console.error("Error joining chat:", err);
    return NextResponse.json({ error: "Failed to join chat." }, { status: 500 });
  }
}
