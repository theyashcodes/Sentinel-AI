import { NextRequest, NextResponse } from "next/server";
import { URLScanRequestSchema, UrlNormalizer } from "@/lib/scanner/url/normalizer";
import { EvidenceGatherer } from "@/lib/scanner/url/gatherer";
import { ThreatAnalyzer, UrlScannerPromptBuilder, PreScanEvidence } from "@/lib/ai/core";
import { db } from "@/lib/db";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { QRDecoder } from "@/modules/scanner/qr/services/decoder";
import { QRSecurityChecker } from "@/modules/scanner/qr/services/security-checker";

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

    try {
      const normalized = UrlNormalizer.normalize(decodedText);
      normalizedUrl = normalized.normalized;
      hostname = normalized.hostname;

      URLScanRequestSchema.parse({ url: normalizedUrl });

      if (!hostname || (!hostname.includes(".") && hostname !== "localhost")) {
        throw new Error("Invalid hostname");
      }

      securityChecks = QRSecurityChecker.analyzeUrl(decodedText);
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
          evidenceMetadata: { securityChecks: securityChecks as unknown as Prisma.InputJsonValue }
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

    // Gather Evidence from destination URL
    let evidence;
    try {
      evidence = await EvidenceGatherer.gather(normalizedUrl, hostname);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      let specificReason = "An unknown network error occurred.";
      let technicalFindings = "The connection could not be established.";

      if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("NXDOMAIN") || errorMessage.includes("Host not found") || errorMessage.includes("DNS lookup failed")) {
        specificReason = "The domain could not be resolved via DNS.";
        technicalFindings = "DNS lookup failed for the hostname. The domain may not exist, might have expired, or is currently experiencing DNS resolution issues.";
      } else if (errorMessage.includes("ECONNREFUSED")) {
        specificReason = "The server refused the connection.";
        technicalFindings = "The host was resolved, but the target server actively refused the connection. The service might be down or heavily firewalled.";
      } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timed out")) {
        specificReason = "The connection timed out.";
        technicalFindings = "The server took too long to respond. The host might be offline, dropping packets, or experiencing high load.";
      } else if (errorMessage.includes("ECONNRESET")) {
        specificReason = "The connection was reset by the peer.";
        technicalFindings = "The connection was established but abruptly terminated by the remote server, possibly due to a firewall or load balancer rule.";
      } else if (errorMessage.includes("tls") || errorMessage.includes("CERT_") || errorMessage.includes("SSL")) {
        specificReason = "The TLS handshake failed.";
        technicalFindings = "The server's SSL/TLS certificate is invalid, expired, or untrusted, preventing a secure connection.";
      } else if (errorMessage.includes("HTTP")) {
        specificReason = "The HTTP request failed.";
        technicalFindings = "The server was reached but an HTTP-level error prevented successful data retrieval.";
      }

      // ===== Smart UNREACHABLE Assessment =====
      // Instead of blindly returning UNKNOWN/0, use structural pre-scan data
      // to provide a meaningful baseline assessment.
      const highSeverityWarnings = securityChecks.warnings.filter((w: { severity: string }) => w.severity === "high").length;
      const mediumSeverityWarnings = securityChecks.warnings.filter((w: { severity: string }) => w.severity === "medium").length;
      const usesHttps = normalizedUrl.startsWith("https://");

      // Check if this is a UPI payment URL (BHIM, Google Pay, PhonePe, etc.)
      const isUpiPayment = decodedText.toLowerCase().startsWith("upi://");

      let unreachableRiskLevel: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" = "UNKNOWN";
      let unreachableConfidence = 30; // Base confidence is low since we couldn't reach the server

      if (isUpiPayment) {
        // UPI payment QR codes from official apps are inherently safe
        unreachableRiskLevel = "SAFE";
        unreachableConfidence = 70;
        specificReason = "This is a UPI payment QR code. The payment link could not be reached for full verification, but UPI payment URLs are a standard, regulated payment protocol in India.";
      } else if (highSeverityWarnings === 0 && usesHttps) {
        // No high-severity structural issues + HTTPS = likely safe, just unreachable
        unreachableRiskLevel = "SAFE";
        unreachableConfidence = 50; // Moderate confidence — structurally fine, but couldn't verify content
      } else if (highSeverityWarnings === 0 && mediumSeverityWarnings <= 1) {
        // Minor structural issues only
        unreachableRiskLevel = "LOW";
        unreachableConfidence = 40;
      } else if (highSeverityWarnings >= 2) {
        // Multiple high-severity structural issues — suspicious even without content
        unreachableRiskLevel = "MEDIUM";
        unreachableConfidence = 45;
      } else {
        // Mixed signals
        unreachableRiskLevel = "LOW";
        unreachableConfidence = 35;
      }

      const scan = await db.scan.create({
        data: {
          type: "QR",
          status: "COMPLETED",
          riskLevel: unreachableRiskLevel,
          payloadHash,
          ipHash,
          userId,
          payload: normalizedUrl,
          evidenceMetadata: { error: errorMessage, securityChecks: securityChecks as unknown as Prisma.InputJsonValue }
        }
      });

      return NextResponse.json({
        scanId: scan.id,
        decodedText,
        extractedUrl: normalizedUrl,
        securityChecks,
        normalized: normalizedUrl,
        riskLevel: unreachableRiskLevel,
        confidence: unreachableConfidence,
        threatType: "UNREACHABLE",
        reasoning: specificReason,
        indicators: [
          `Status: UNREACHABLE`,
          `Structural Assessment: ${unreachableRiskLevel}`,
          `Confidence: ${unreachableConfidence}%`,
          `Error: ${errorMessage.replace("Network Error: ", "")}`
        ],
        report: `### Threat Assessment\nThe target URL is currently UNREACHABLE. Based on structural pre-scan analysis (URL format, protocol, domain reputation), the link appears to be **${unreachableRiskLevel}**. However, content-level verification could not be performed.\n\n### Technical Findings\n${technicalFindings}\n\n### Pre-Scan Structural Analysis\n- Protocol: ${usesHttps ? "HTTPS (Encrypted)" : "HTTP (Unencrypted)"}\n- High-severity flags: ${highSeverityWarnings}\n- Medium-severity flags: ${mediumSeverityWarnings}${isUpiPayment ? "\n- Payment Type: UPI (Unified Payments Interface)" : ""}`
      });
    }

    // AI Analysis using existing Prompt Builder & Analyzer
    const promptBuilder = new UrlScannerPromptBuilder();
    const analysisResult = await ThreatAnalyzer.analyze({
      payload: normalizedUrl,
      evidence: evidence as PreScanEvidence,
      promptBuilder,
      qrSecurityWarnings: securityChecks.warnings
    });

    // Persist scan history and link scan results
    const scan = await db.$transaction(async (tx) => {
      const newScan = await tx.scan.create({
        data: {
          type: "QR",
          status: "COMPLETED",
          riskLevel: analysisResult.riskLevel,
          payloadHash,
          ipHash,
          userId,
          payload: normalizedUrl,
          evidenceMetadata: { securityChecks: securityChecks as unknown as Prisma.InputJsonValue }
        }
      });

      await tx.scanResult.create({
        data: {
          scanId: newScan.id,
          aiProvider: analysisResult.aiResponse.providerName,
          aiModel: analysisResult.aiResponse.modelName,
          inferenceTimeMs: analysisResult.aiResponse.inferenceTimeMs,
          tokenUsage: analysisResult.cost.promptTokens + analysisResult.cost.completionTokens,
          confidenceScore: analysisResult.confidence,
          threatCategory: analysisResult.threatType,
          analysisMetadata: {
            ...(analysisResult.aiResponse as unknown as Record<string, unknown>),
            evidence
          } as unknown as Prisma.InputJsonValue,
          processingCost: analysisResult.cost.estimatedCostUsd
        }
      });

      return newScan;
    });

    return NextResponse.json({
      scanId: scan.id,
      decodedText,
      extractedUrl: normalizedUrl,
      securityChecks,
      normalized: normalizedUrl,
      riskLevel: analysisResult.riskLevel,
      confidence: analysisResult.confidence,
      threatType: analysisResult.threatType,
      reasoning: analysisResult.aiResponse.executiveSummary,
      indicators: analysisResult.aiResponse.analystNotes,
      report: analysisResult.aiResponse.technicalReasoning,
      evidence
    });

  } catch (error) {
    console.error("QR Scan General Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
