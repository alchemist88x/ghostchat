import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

interface RouteProps {
  params: Promise<{ filename: string | string[] }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { filename } = await params;
    const fullKey = Array.isArray(filename) ? filename.join("/") : String(filename);

    const db = await getDb();
    const uploadsCol = db.collection("local_uploads");

    // Search by full storage key or exact filename
    const record = await uploadsCol.findOne({
      $or: [{ key: fullKey }, { key: fullKey.replace(/^\//, "") }],
    });
    if (!record || !record.data) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const buffer = Buffer.from(record.data as string, "base64");
    const contentType = (record.mime as string) || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error serving local upload:", err);
    return NextResponse.json({ error: "Failed to load file." }, { status: 500 });
  }
}
