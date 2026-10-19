import { NextRequest, NextResponse } from "next/server";
import { dissectEmailHeaders } from "@/lib/email/emailParser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let rawText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No .eml file provided" },
          { status: 400 }
        );
      }
      const buffer = await file.arrayBuffer();
      rawText = Buffer.from(buffer).toString("utf8");
    } else {
      const body = await req.json();
      rawText = body.rawText || body.headers || "";
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Please provide raw email headers or upload a .eml file." },
        { status: 400 }
      );
    }

    const report = dissectEmailHeaders(rawText);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[Email Forensic Audit Error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to dissect email headers" },
      { status: 500 }
    );
  }
}
