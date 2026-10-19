import { NextRequest, NextResponse } from "next/server";
import { URLScanRequestSchema, UrlNormalizer } from "@/lib/scanner/url/normalizer";
import { EvidenceGatherer } from "@/lib/scanner/url/gatherer";
import { ThreatAnalyzer, UrlScannerPromptBuilder, PreScanEvidence } from "@/lib/ai/core";
import { db } from "@/lib/db";
import crypto from "crypto";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { auth } from "@/lib/auth";
import { QRDecoder } from "@/modules/scanner/qr/services/decoder";
import { QRSecurityChecker } from "@/modules/scanner/qr/services/security-checker";
import { MLInferenceService } from "@/lib/ml/client";

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

    // Validate if it is a URL
    let isUrl = true;
    let hostname = "";
    let securityChecks;

    // Extract URL if surrounded by extra text / pandas formatting
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

      securityChecks = QRSecurityChecker.analyzeUrl(urlCandidate);
    } catch {
      isUrl = false;
      securityChecks = {
        isShortener: false,
        isPunycode: false,
        isUnicodeSpoof: false,
        isHttp: false,
        isSuspiciousTld: false,
        warnings: [{
          code: "INVALID_URL",
          title: "Invalid URL Format",
          description: `The QR code contains plain text or an invalid URL structure: "${decodedText}"`,
          severity: "high" as const
        }]
      };
    }

    // Hash payload and IP for tracking
    payloadHash = crypto.createHash('sha256').update(decodedText).digest('hex');
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // If it is NOT a URL, save as UNKNOWN scan and return
    if (!isUrl) {
      const scan = await db.scan.create({
        data: {
          type: "QR",
          status: "COMPLETED",
          riskLevel: "UNKNOWN",
          payloadHash,
          ipHash,
          userId,
          payload: decodedText,
          evidenceMetadata: { securityChecks: securityChecks as unknown as InputJsonValue }
        }
      });

      return NextResponse.json({
        scanId: scan.id,
        decodedText,
        extractedUrl: decodedText,
        securityChecks,
        normalized: decodedText,
        riskLevel: "UNKNOWN",
        confidence: 0,
        threatType: "INVALID_URL",
        reasoning: "The scanned QR code does not point to a valid web address. No security analysis can be performed on plain text.",
        indicators: ["Plain Text / Non-URL Payload"],
        report: "### Decoded Plain Text\n\n```\n" + decodedText + "\n```\n\nThis QR code contains non-URL text and cannot be routed through our URL Scanning engine."
      });
    }

    // 1. Run Machine Learning Threat Detection (Primary Detection Engine)
    const mlVerdict = await MLInferenceService.predict(normalizedUrl);

    // 2. Gather Evidence from destination URL without blocking on network failures
    let evidenceNetworkNotes = "";
    let evidence: unknown = null;
    try {
      evidence = await EvidenceGatherer.gather(normalizedUrl, hostname);
      if (evidence) {
        evidenceNetworkNotes = "WHOIS and DNS gathered.";
      }
    } catch {
      mlVerdict.indicators.push("QR destination host is currently unreachable/offline");
    }

    // Combine any QR structural warnings with ML indicators
    if (securityChecks.warnings && securityChecks.warnings.length > 0) {
      securityChecks.warnings.forEach((w: { description: string }) => {
        if (!mlVerdict.indicators.includes(w.description)) {
          mlVerdict.indicators.push(w.description);
        }
      });
    }

    // 3. Persist scan history and link scan results
    let scanId = "qr-" + Date.now();
    try {
      const scan = await db.$transaction(async (tx) => {
        const newScan = await tx.scan.create({
          data: {
            type: "QR",
            status: "COMPLETED",
            riskLevel: mlVerdict.riskLevel,
            payloadHash,
            ipHash,
            userId,
            payload: normalizedUrl,
            evidenceMetadata: { securityChecks: securityChecks as unknown as InputJsonValue },
          },
        });

        await tx.scanResult.create({
          data: {
            scanId: newScan.id,
            aiProvider: "SENTINEL_ML_CORE",
            aiModel: "HistGradientBoosting-Threat-v1",
            inferenceTimeMs: 15,
            confidenceScore: mlVerdict.confidence,
            threatCategory: mlVerdict.threatType,
            analysisMetadata: {
              probabilities: mlVerdict.probabilities,
              riskScore: mlVerdict.riskScore,
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

    return NextResponse.json({
      scanId,
      decodedText,
      extractedUrl: normalizedUrl,
      securityChecks,
      normalized: normalizedUrl,
      riskLevel: mlVerdict.riskLevel,
      confidence: mlVerdict.confidence,
      threatType: mlVerdict.threatType,
      reasoning: mlVerdict.reasoning,
      indicators: mlVerdict.indicators,
      report: mlVerdict.technicalReasoning + (evidenceNetworkNotes ? ` | ${evidenceNetworkNotes}` : ""),
      evidence,
    });

  } catch (error) {
    console.error("QR Scan General Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
