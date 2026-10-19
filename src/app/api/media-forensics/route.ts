import { NextRequest, NextResponse } from "next/server";
import { analyzeMediaProvenance } from "@/lib/forensics/mediaParser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No media file provided. Please upload an image (PNG, JPEG, WebP) or video (MP4, WebM, MOV)." },
        { status: 400 }
      );
    }

    // Limit to 50MB to support short video clips
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 50MB limit. Please upload a smaller media file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const forensicReport = await analyzeMediaProvenance(buffer, file.name);

    return NextResponse.json(forensicReport);
  } catch (err) {
    console.error("[Media Forensics Error]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to dissect media forensics",
      },
      { status: 500 }
    );
  }
}
