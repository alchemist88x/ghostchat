import { NextRequest, NextResponse } from "next/server";
import { authorizeParticipant } from "@/lib/auth";
import { createChatTokenRequest } from "@/lib/ably";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  return handleToken(req, params);
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  return handleToken(req, params);
}

async function handleToken(req: NextRequest, paramsPromise: Promise<{ id: string }>) {
  try {
    const { id } = await paramsPromise;
    const { auth, failure } = await authorizeParticipant(id);

    if (failure || !auth) {
      return NextResponse.json({ error: failure?.error || "Unauthorized" }, { status: failure?.status || 401 });
    }

    const tokenRequest = await createChatTokenRequest(
      auth.chat.publicToken,
      auth.participant.anonymousId
    );

    if (!tokenRequest) {
      return NextResponse.json({
        enabled: false,
        message: "Realtime Ably service is not configured with an API key.",
      });
    }

    return NextResponse.json(tokenRequest);
  } catch (err) {
    console.error("Error creating Ably token request:", err);
    return NextResponse.json(
      { error: "Failed to generate realtime access token." },
      { status: 500 }
    );
  }
}
