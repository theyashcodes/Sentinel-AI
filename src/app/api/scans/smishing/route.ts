import { NextRequest, NextResponse } from "next/server";
import { auditSmishingMessage } from "@/lib/scanner/smishing";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sender } = body;

    const rawMessage = typeof message === "string" ? message.trim() : "";
    const rawSender = typeof sender === "string" ? sender.trim() : "";

    if (!rawMessage && !rawSender) {
      return NextResponse.json(
        { error: "Please enter an SMS/WhatsApp message or a phone number/TRAI header to scan." },
        { status: 400 }
      );
    }

    const effectiveMessage = rawMessage || "[Standalone Telecom Forensic Lookup]";

    // Run Smishing & Phone Intelligence Engine
    const result = auditSmishingMessage(effectiveMessage, rawSender || undefined);

    // Map risk score to database enum
    let dbRiskLevel: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "SAFE";
    if (result.riskScore >= 85) dbRiskLevel = "CRITICAL";
    else if (result.riskScore >= 65) dbRiskLevel = "HIGH";
    else if (result.riskScore >= 40) dbRiskLevel = "MEDIUM";
    else if (result.riskScore >= 20) dbRiskLevel = "LOW";

    // Attempt user session retrieval
    let session = null;
    try {
      session = await auth.api.getSession({ headers: req.headers });
    } catch {}

    if (!session?.user?.id) {
      try {
        session = await auth.api.getSession({ headers: await headers() });
      } catch {}
    }

    // Record scan in database if user is authenticated
    if (session?.user?.id) {
      const payloadHash = createHash("sha256").update(String(message)).digest("hex");
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
      const ipHash = createHash("sha256").update(ip).digest("hex");

      try {
        await db.$transaction(async (tx) => {
          const newScan = await tx.scan.create({
            data: {
              type: "MESSAGE",
              status: "COMPLETED",
              riskLevel: dbRiskLevel,
              payloadHash,
              ipHash,
              userId: session.user.id,
              payload: message.slice(0, 500),
            },
          });

          await tx.scanResult.create({
            data: {
              scanId: newScan.id,
              aiProvider: "SENTINEL_SMISHING_NLP",
              aiModel: "Trai-DLT-PhoneIntel-v2",
              confidenceScore: Math.min(100, Math.max(70, result.riskScore)),
              threatCategory: result.category,
              analysisMetadata: {
                panicScore: result.panicScore,
                extractedUrls: result.extractedUrls,
                extractedApks: result.extractedApks,
                extractedPhones: result.extractedPhoneNumbers,
                phoneIntelligence: result.phoneIntelligence,
                safetyAdvisory: result.safetyAdvisory,
                legalReference: result.legalReference,
              } as any,
            },
          });
        });
      } catch (dbErr) {
        console.warn("[Smishing DB Record]", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error("[Smishing Scan API Error]", err);
    return NextResponse.json(
      { error: "Failed to complete Smishing analysis", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
