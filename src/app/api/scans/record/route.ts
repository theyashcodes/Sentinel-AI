import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  try {
    let session = null;
    try {
      session = await auth.api.getSession({ headers: req.headers });
    } catch {}

    if (!session?.user?.id) {
      try {
        session = await auth.api.getSession({ headers: await headers() });
      } catch {}
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type = "FILE",
      payload,
      riskLevel = "SAFE",
      threatCategory = "DIAGNOSTIC",
      confidenceScore = 95,
      aiProvider = "SENTINEL_SECURITY_CORE",
      aiModel = "BioAcoustic-Deepfake-v2",
      analysisMetadata = {},
    } = body;

    if (!payload) {
      return NextResponse.json({ error: "Payload is required" }, { status: 400 });
    }

    const payloadHash = createHash("sha256").update(String(payload)).digest("hex");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const ipHash = createHash("sha256").update(ip).digest("hex");

    const validRiskLevels = ["UNKNOWN", "SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const normalizedRisk = validRiskLevels.includes(riskLevel) ? riskLevel : "SAFE";

    const validScanTypes = ["URL", "MESSAGE", "QR", "SCREENSHOT", "FILE"];
    const normalizedType = validScanTypes.includes(type) ? type : "FILE";

    const scan = await db.$transaction(async (tx) => {
      const newScan = await tx.scan.create({
        data: {
          type: normalizedType as any,
          status: "COMPLETED",
          riskLevel: normalizedRisk as any,
          payloadHash,
          ipHash,
          userId: session.user.id,
          payload: String(payload).slice(0, 500),
        },
      });

      await tx.scanResult.create({
        data: {
          scanId: newScan.id,
          aiProvider: String(aiProvider).slice(0, 100),
          aiModel: String(aiModel).slice(0, 100),
          confidenceScore: Number(confidenceScore) || 95,
          threatCategory: String(threatCategory).slice(0, 100),
          analysisMetadata,
        },
      });

      return newScan;
    });

    return NextResponse.json({ success: true, scanId: scan.id });
  } catch (error) {
    console.error("Failed to record scan audit log:", error);
    return NextResponse.json(
      { error: "Failed to record scan log", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
