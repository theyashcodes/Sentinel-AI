import { NextRequest, NextResponse } from "next/server";
import { URLScanRequestSchema, UrlNormalizer } from "@/lib/scanner/url/normalizer";
import { EvidenceGatherer } from "@/lib/scanner/url/gatherer";
import { db } from "@/lib/db";
import crypto from "crypto";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { RiskLevel } from "@prisma/client";
import { auth } from "@/lib/auth";
import { QRDecoder } from "@/modules/scanner/qr/services/decoder";
import { QRSecurityChecker } from "@/modules/scanner/qr/services/security-checker";
import { MLInferenceService, SentinelScanVerdict } from "@/lib/ml/client";
import { QRScanResponse } from "@/modules/scanner/qr/types/qr-scanner";

export async function POST(req: NextRequest) {
  let decodedText = "";
  let normalizedUrl = "";
  let payloadHash = "";
  let ipHash = "";
  let userId: string | null = null;

  try {
    // Authenticate user via session token
    const session = await auth.api.getSession({ headers: req.headers });
    if (session) {
      userId = session.user.id;
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No QR found", message: "No image file uploaded." }, { status: 400 });
    }

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Large file", message: "The file is too large. Maximum size allowed is 10MB." }, { status: 400 });
    }

    // Check format: png, jpg, jpeg, webp
    const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported format", message: "Please upload a valid image file (PNG, JPG, or JPEG)." }, { status: 400 });
    }

    // Read to buffer and decode QR Code
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      decodedText = await QRDecoder.decodeImageData(buffer, file.type);
    } catch (err) {
      console.error("QR DECODING STACK TRACE ERROR:", err instanceof Error ? err.stack : err);
      return NextResponse.json({
        error: "No QR found",
        message: err instanceof Error ? err.message : "Failed to decode QR code. Please make sure the image contains a clear QR code."
      }, { status: 400 });
    }

    // Validate if payload is or contains a URL
    let isUrl = true;
    let hostname = "";

    // Extract URL if surrounded by extra text / formatting
    let urlCandidate = decodedText.trim();
    const urlMatch = decodedText.match(/(https?:\/\/[^\s"'<>]+)/i);
    if (urlMatch && urlMatch[1]) {
      urlCandidate = urlMatch[1];
    }

    try {
      const normalized = UrlNormalizer.normalize(urlCandidate);
      normalizedUrl = normalized.normalized;
      hostname = normalized.hostname;

      URLScanRequestSchema.parse({ url: normalizedUrl });

      if (!hostname || (!hostname.includes(".") && hostname !== "localhost")) {
        throw new Error("Invalid hostname");
      }
    } catch {
      isUrl = false;
    }

    // Hash payload and IP for tracking
    payloadHash = crypto.createHash('sha256').update(decodedText).digest('hex');
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // If it is NOT a URL, save as UNKNOWN scan and return
    if (!isUrl) {
      const fallbackEvaluation = QRSecurityChecker.evaluateSecurity(decodedText);
      const scan = await db.scan.create({
        data: {
          type: "QR",
          status: "COMPLETED",
          riskLevel: "UNKNOWN",
          payloadHash,
          ipHash,
          userId,
          payload: decodedText,
          evidenceMetadata: { securityChecks: fallbackEvaluation.securityChecks as unknown as InputJsonValue }
        }
      });

      const responsePayload: QRScanResponse = {
        scanId: scan.id,
        decodedText,
        extractedUrl: decodedText,
        securityChecks: fallbackEvaluation.securityChecks,
        normalized: decodedText,
        riskScore: 50,
        authenticityScore: 50,
        riskLevel: "UNKNOWN",
        confidence: 0,
        threatType: "INVALID_URL",
        reasoning: "The scanned QR code contains plain text or non-standard formatting. No URL security analysis can be performed.",
        indicators: ["Plain Text / Non-URL Payload"],
        report: "### Decoded Plain Text\n\n```\n" + decodedText + "\n```\n\nThis QR code contains non-URL text.",
        scoreBreakdown: fallbackEvaluation.riskResult.scoreBreakdown,
        signalEvidence: fallbackEvaluation.riskResult.signalEvidence,
        evidence: null,
      };

      return NextResponse.json(responsePayload);
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Run Explainable QR & URL Security Evaluation Engine
    // ─────────────────────────────────────────────────────────────
    const evaluation = QRSecurityChecker.evaluateSecurity(urlCandidate);
    const { parsed, riskResult, securityChecks } = evaluation;

    // Log intermediate signals in development mode (Phase 1 Req 3)
    if (process.env.NODE_ENV !== "production") {
      console.log(`[QR SCAN DEBUG] Input: "${urlCandidate}" | Host: "${parsed.hostname}" | Registrable: "${parsed.domainInfo.registrableDomain}"`);
      console.log(`[QR SCAN DEBUG] RiskScore: ${riskResult.riskScore}/100 | Level: ${riskResult.threatLevel} | Brand: ${parsed.brandAudit.isImpersonating} | Homoglyph: ${parsed.homoglyphAudit.hasHomoglyphSpoof} | SSRF: ${parsed.ssrfTarget}`);
      console.log(`[QR SCAN DEBUG] Breakdown:`, riskResult.scoreBreakdown);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Run Machine Learning Threat Detection (Independent Signal)
    // ─────────────────────────────────────────────────────────────
    let mlVerdict: SentinelScanVerdict | null = null;
    try {
      mlVerdict = await MLInferenceService.predict(normalizedUrl);
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
        evidence = await EvidenceGatherer.gather(normalizedUrl, hostname);
        if (evidence) {
          evidenceNetworkNotes = "DNS and perimeter telemetry gathered.";
        }
      } catch {
        riskResult.indicators.push("QR destination host is currently unreachable/offline");
      }
    }

    // Combine any ML indicators without duplicate strings
    if (mlVerdict && mlVerdict.indicators) {
      for (const ind of mlVerdict.indicators) {
        if (!riskResult.indicators.includes(ind)) {
          riskResult.indicators.push(ind);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Map Threat Level to Prisma RiskLevel Enum
    // ─────────────────────────────────────────────────────────────
    let dbRiskLevel: RiskLevel = RiskLevel.SAFE;
    switch (riskResult.threatLevel) {
      case "CRITICAL": dbRiskLevel = RiskLevel.CRITICAL; break;
      case "HIGH": dbRiskLevel = RiskLevel.HIGH; break;
      case "SUSPICIOUS": dbRiskLevel = RiskLevel.MEDIUM; break;
      case "LOW": dbRiskLevel = RiskLevel.LOW; break;
      case "SAFE": default: dbRiskLevel = RiskLevel.SAFE; break;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Persist Scan in Database
    // ─────────────────────────────────────────────────────────────
    let scanId = "qr-" + Date.now();
    try {
      const scan = await db.$transaction(async (tx) => {
        const newScan = await tx.scan.create({
          data: {
            type: "QR",
            status: "COMPLETED",
            riskLevel: dbRiskLevel,
            payloadHash,
            ipHash,
            userId,
            payload: normalizedUrl,
            evidenceMetadata: {
              securityChecks: securityChecks as unknown as InputJsonValue,
              scoreBreakdown: riskResult.scoreBreakdown as unknown as InputJsonValue,
            },
          },
        });

        await tx.scanResult.create({
          data: {
            scanId: newScan.id,
            aiProvider: "SENTINEL_QR_SECURITY_CORE",
            aiModel: "PSL-WeightedRisk-v2",
            inferenceTimeMs: 12,
            confidenceScore: riskResult.confidence,
            threatCategory: riskResult.threatType,
            analysisMetadata: {
              riskScore: riskResult.riskScore,
              authenticityScore: riskResult.authenticityScore,
              scoreBreakdown: riskResult.scoreBreakdown,
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
      console.warn("QR DB Logging warning:", dbErr);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Return Explainable Structured Response
    // ─────────────────────────────────────────────────────────────
    const responsePayload: QRScanResponse = {
      scanId,
      decodedText,
      extractedUrl: normalizedUrl,
      securityChecks,
      normalized: normalizedUrl,
      riskScore: riskResult.riskScore,
      authenticityScore: riskResult.authenticityScore,
      riskLevel: riskResult.threatLevel,
      confidence: riskResult.confidence,
      threatType: riskResult.threatType,
      reasoning: riskResult.reasoning,
      indicators: riskResult.indicators,
      report: `${riskResult.reasoning} | Engine: Sentinel Multi-Vector Risk Classifier${evidenceNetworkNotes ? ` | ${evidenceNetworkNotes}` : ""}`,
      scoreBreakdown: riskResult.scoreBreakdown,
      signalEvidence: riskResult.signalEvidence,
      evidence: evidence as any,
      mlProbability: mlVerdict?.probabilities,
    };

    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error("QR Scan General Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
