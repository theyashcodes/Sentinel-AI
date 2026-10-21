import { NextRequest, NextResponse } from "next/server";
import { URLScanRequestSchema, UrlNormalizer } from "@/lib/scanner/url/normalizer";
import { EvidenceGatherer } from "@/lib/scanner/url/gatherer";
import { MLInferenceService, SentinelScanVerdict } from "@/lib/ml/client";
import { QRSecurityChecker } from "@/modules/scanner/qr/services/security-checker";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { RiskLevel } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/client";

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

    // ─────────────────────────────────────────────────────────────
    // 1. Run Explainable Multi-Vector Security Evaluation Engine
    // ─────────────────────────────────────────────────────────────
    const evaluation = QRSecurityChecker.evaluateSecurity(normalized.normalized);
    const { parsed, riskResult, securityChecks } = evaluation;

    // ─────────────────────────────────────────────────────────────
    // 2. Run Machine Learning Threat Detection (Independent Signal)
    // ─────────────────────────────────────────────────────────────
    let mlVerdict: SentinelScanVerdict | null = null;
    try {
      mlVerdict = await MLInferenceService.predict(normalized.normalized);
    } catch (mlErr) {
      console.warn("ML Inference warning (proceeding with explainable engine):", mlErr);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Evidence Gathering & SSRF Gate
    // ─────────────────────────────────────────────────────────────
    let evidenceNetworkNotes = "";
    let evidence: unknown = null;

    if (parsed.ssrfTarget) {
      evidenceNetworkNotes = "Network probing blocked due to SSRF policy.";
      evidence = {
        ssrfProtected: true,
        headers: { "x-sentinel-ssrf-block": "Prohibited private or loopback destination. Network scan aborted." }
      };
    } else {
      try {
        evidence = await EvidenceGatherer.gather(normalized.normalized, normalized.hostname);
        if (evidence) {
          evidenceNetworkNotes = "DNS and perimeter telemetry gathered.";
        }
      } catch {
        riskResult.indicators.push("Target host is currently unreachable/offline");
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Synthesize Engine Signals with ML Classification
    // ─────────────────────────────────────────────────────────────
    let finalRiskLevel = riskResult.threatLevel;
    let finalRiskScore = riskResult.riskScore;
    const finalConfidence = riskResult.confidence;
    const finalConfidenceType = riskResult.confidenceType;
    const finalConfidenceLabel = riskResult.confidenceLabel;
    let finalThreatType = riskResult.threatType;

    if (mlVerdict) {
      if (mlVerdict.riskScore > finalRiskScore) {
        finalRiskScore = mlVerdict.riskScore;
      }

      if (mlVerdict.riskLevel === RiskLevel.CRITICAL && finalRiskLevel !== "CRITICAL") {
        finalRiskLevel = "CRITICAL";
        finalThreatType = mlVerdict.threatType;
      } else if (mlVerdict.riskLevel === RiskLevel.HIGH && (finalRiskLevel === "SAFE" || finalRiskLevel === "LOW" || finalRiskLevel === "SUSPICIOUS")) {
        finalRiskLevel = "HIGH";
        finalThreatType = mlVerdict.threatType;
      } else if (mlVerdict.riskLevel === RiskLevel.MEDIUM && (finalRiskLevel === "SAFE" || finalRiskLevel === "LOW")) {
        finalRiskLevel = "SUSPICIOUS";
        if (finalThreatType === "BENIGN" || finalThreatType === "SAFE") {
          finalThreatType = mlVerdict.threatType;
        }
      }

      if (mlVerdict.indicators) {
        for (const ind of mlVerdict.indicators) {
          if (!riskResult.indicators.includes(ind)) {
            riskResult.indicators.push(ind);
          }
        }
      }
    }

    const scoreBreakdown = {
      ...riskResult.scoreBreakdown,
      totalRiskScore: finalRiskScore,
    };
    const authenticityScore = Math.max(0, 100 - finalRiskScore);

    // ─────────────────────────────────────────────────────────────
    // 5. Map Threat Level to Prisma RiskLevel Enum
    // ─────────────────────────────────────────────────────────────
    let dbRiskLevel: RiskLevel = RiskLevel.SAFE;
    switch (finalRiskLevel) {
      case "CRITICAL": dbRiskLevel = RiskLevel.CRITICAL; break;
      case "HIGH": dbRiskLevel = RiskLevel.HIGH; break;
      case "SUSPICIOUS": dbRiskLevel = RiskLevel.MEDIUM; break;
      case "LOW": dbRiskLevel = RiskLevel.LOW; break;
      case "SAFE": default: dbRiskLevel = RiskLevel.SAFE; break;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Persist Scan and Result in Database
    // ─────────────────────────────────────────────────────────────
    let scanId = "url-" + Date.now();
    try {
      const scan = await db.$transaction(async (tx) => {
        const newScan = await tx.scan.create({
          data: {
            type: "URL",
            status: "COMPLETED",
            riskLevel: dbRiskLevel,
            payloadHash,
            ipHash,
            userId,
            payload: normalized.normalized,
            evidenceMetadata: {
              securityChecks: securityChecks as unknown as InputJsonValue,
              scoreBreakdown: scoreBreakdown as unknown as InputJsonValue,
            },
          },
        });

        await tx.scanResult.create({
          data: {
            scanId: newScan.id,
            aiProvider: "SENTINEL_URL_SECURITY_CORE",
            aiModel: "PSL-WeightedRisk-v2",
            inferenceTimeMs: 12,
            confidenceScore: finalConfidence,
            threatCategory: finalThreatType,
            analysisMetadata: {
              riskScore: finalRiskScore,
              authenticityScore,
              scoreBreakdown,
              signalEvidence: riskResult.signalEvidence,
              probabilities: mlVerdict?.probabilities,
              securityChecks,
              evidence,
            } as unknown as InputJsonValue,
          },
        });

        return newScan;
      });
      scanId = scan.id;
    } catch (dbErr) {
      console.warn("URL DB Logging warning:", dbErr);
    }

    // ─────────────────────────────────────────────────────────────
    // 7. Return Explainable Structured Response
    // ─────────────────────────────────────────────────────────────
    let cleanReasoning = riskResult.reasoning.replace(/\(\d+\/100 Risk Score\)/g, `(${finalRiskScore}/100 Risk Score)`);

    const reasoningText = (mlVerdict && mlVerdict.threatType !== "SAFE" && mlVerdict.reasoning)
      ? `${mlVerdict.reasoning} ${cleanReasoning}`.trim()
      : cleanReasoning;

    return NextResponse.json({
      scanId,
      normalized: normalized.normalized,
      riskScore: finalRiskScore,
      authenticityScore,
      riskLevel: finalRiskLevel,
      confidence: finalConfidence,
      confidenceType: finalConfidenceType,
      confidenceLabel: finalConfidenceLabel,
      threatType: finalThreatType,
      reasoning: reasoningText,
      indicators: riskResult.indicators,
      report: `${reasoningText} | Engine: Sentinel Multi-Vector Risk Classifier${evidenceNetworkNotes ? ` | ${evidenceNetworkNotes}` : ""}`,
      scoreBreakdown,
      signalEvidence: riskResult.signalEvidence,
      securityChecks,
      evidence,
      mlProbability: mlVerdict?.probabilities,
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
