import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/userAuth";
import { getDb } from "@/lib/mongodb";
import { getOrCreateSessionToken } from "@/lib/session";
import { IChat, IParticipant } from "@/types";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const { sessionHash } = await getOrCreateSessionToken();
    const db = await getDb();

    const chatsCol = db.collection<IChat>("chats");
    const participantsCol = db.collection<IParticipant>("participants");
    const usersCol = db.collection("users");

    // Collect chat IDs from session participants
    const sessionParticipants = await participantsCol.find({ sessionHash }).toArray();
    const sessionChatIds = sessionParticipants.map((p) => p.chatId).filter(Boolean);

    let allChatIds: string[] = [...sessionChatIds];

    if (user && user.username) {
      if (user.managedChatIds) {
        allChatIds = Array.from(new Set([...allChatIds, ...user.managedChatIds]));
      }

      // Sync any session chats into logged-in user's managedChatIds
      if (sessionChatIds.length > 0) {
        await usersCol.updateOne(
          { username: user.username },
          { $addToSet: { managedChatIds: { $each: sessionChatIds } } }
        );
      }
    }

    let managedChats: unknown[] = [];
    if (allChatIds.length > 0) {
      const validObjectIds = allChatIds
        .filter((id) => ObjectId.isValid(id) && id.length === 24)
        .map((id) => new ObjectId(id));

      const rawChats = await chatsCol
        .find({ _id: { $in: validObjectIds as any }, status: "active" })
        .sort({ createdAt: -1 })
        .toArray();

      managedChats = rawChats.map((c) => ({
        id: c._id?.toString(),
        publicToken: c.publicToken,
        type: c.type,
        name: c.name,
        icon: c.icon,
        maxParticipants: c.maxParticipants,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      }));
    }

    return NextResponse.json({
      user: user
        ? {
            id: user.id,
            username: user.username,
          }
        : null,
      managedChats,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}
