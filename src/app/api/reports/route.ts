import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authorizeParticipant } from "@/lib/auth";
import { reportSchema } from "@/lib/validations";
import { IReport } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = reportSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid report data", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { chatId, messageId, reason, details } = parseResult.data;

    // Validate reporter is a participant in this chat
    const { auth, failure } = await authorizeParticipant(chatId);
    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    const db = await getDb();
    const reportsCol = db.collection<IReport>("reports");

    const report: IReport = {
      chatId: auth.chat._id.toString(),
      messageId,
      reportedByParticipantId: auth.participant.anonymousId,
      reason,
      details,
      createdAt: new Date(),
    };

    await reportsCol.insertOne(report);

    return NextResponse.json({
      success: true,
      message: "Thank you for reporting. Our moderation system will review this report.",
    });
  } catch (err) {
    console.error("Error submitting report:", err);
    return NextResponse.json({ error: "Failed to submit report." }, { status: 500 });
  }
}
