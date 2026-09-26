import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/userAuth";
import { getDb } from "@/lib/mongodb";
import { purgeChatData } from "@/lib/purge";
import { IUser } from "@/types";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const db = await getDb();
    const usersCol = db.collection<IUser>("users");

    const fullUser = await usersCol.findOne({ username: user.username });
    if (fullUser && fullUser.managedChatIds && fullUser.managedChatIds.length > 0) {
      for (const chatId of fullUser.managedChatIds) {
        try {
          await purgeChatData(chatId);
        } catch (e) {
          console.error(`Failed to purge chat ${chatId} during account deletion:`, e);
        }
      }
    }

    await usersCol.deleteOne({ username: user.username });

    const res = NextResponse.json({
      success: true,
      message: "Account and associated data deleted successfully.",
    });

    res.cookies.set({
      name: "ghostchat_user_session",
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
