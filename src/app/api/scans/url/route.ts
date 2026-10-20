import { NextRequest, NextResponse } from "next/server";
import { URLScanRequestSchema, UrlNormalizer } from "@/lib/scanner/url/normalizer";
import { EvidenceGatherer } from "@/lib/scanner/url/gatherer";
import { MLInferenceService } from "@/lib/ml/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  let payloadHash = "";
  let ipHash = "";
  let normalizedUrl = "Unknown URL";
  let userId: string | null = null;

  try {
    // Authenticate user via session if present
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (session) {
        userId = session.user.id;
      }
    } catch {
      // unauthenticated scan (e.g. public API or extension without cookie)
    }

    const body = await req.json();
    const parseResult = URLScanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid URL", details: parseResult.error }, { status: 400 });
    }

    const { url } = parseResult.data;
    const normalized = UrlNormalizer.normalize(url);
    normalizedUrl = normalized.normalized;

    // Hash payload and IP for anonymous tracking
    payloadHash = crypto.createHash("sha256").update(normalized.normalized).digest("hex");
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    ipHash = crypto.createHash("sha256").update(ip).digest("hex");

    // 1. Run Machine Learning Threat Detection (Primary Detection Engine)
    const mlVerdict = await MLInferenceService.predict(normalized.normalized);

    // 2. Gather Network Evidence (WHOIS, DNS, TLS) asynchronously without blocking on failures
    let evidenceNetworkNotes = "";
    try {
      const evidence = await EvidenceGatherer.gather(normalized.normalized, normalized.hostname);
      if (evidence?.whois) {
        evidenceNetworkNotes += " WHOIS record inspected.";
      }
      if (evidence?.dns) {
        evidenceNetworkNotes += " DNS lookup completed.";
      }
    } catch (networkError) {
      const errStr = networkError instanceof Error ? networkError.message : String(networkError);
      if (errStr.includes("ENOTFOUND") || errStr.includes("EHOSTUNREACH")) {
        mlVerdict.indicators.push("Target host is currently offline or unresolvable (common for deactivated threat domains)");
      }
    }

    // 3. Persist Scan and Result in Database
    let scanId = "local-" + Date.now();
    try {
      const scan = await db.$transaction(async (tx) => {
        const newScan = await tx.scan.create({
          data: {
            type: "URL",
            status: "COMPLETED",
            riskLevel: mlVerdict.riskLevel,
            payloadHash,
            ipHash,
            userId,
            payload: normalized.normalized,
          },
        });

        await tx.scanResult.create({
          data: {
            scanId: newScan.id,
            aiProvider: "SENTINEL_ML_CORE",
            aiModel: "HistGradientBoosting-Threat-v1",
            inferenceTimeMs: 12,
            confidenceScore: mlVerdict.confidence,
            threatCategory: mlVerdict.threatType,
            analysisMetadata: {
              probabilities: mlVerdict.probabilities,
              riskScore: mlVerdict.riskScore,
              evidenceNotes: evidenceNetworkNotes,
            },
          },
        });

        return newScan;
      });
      scanId = scan.id;
    } catch (dbErr) {
      console.warn("DB logging fallback:", dbErr);
    }

    return NextResponse.json({
      scanId,
      normalized: normalized.normalized,
      riskLevel: mlVerdict.riskLevel,
      confidence: mlVerdict.confidence,
      threatType: mlVerdict.threatType,
      reasoning: mlVerdict.reasoning,
      indicators: mlVerdict.indicators,
      report: mlVerdict.technicalReasoning + (evidenceNetworkNotes ? ` | ${evidenceNetworkNotes}` : ""),
    });
  } catch (error) {
    console.error("URL Scan Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Scan Failed", message: errorMessage },
      { status: 500 }
    );
  }
}
