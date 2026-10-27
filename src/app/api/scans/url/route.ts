import { NextRequest, NextResponse } from "next/server";
import { URLScanRequestSchema, UrlNormalizer } from "@/lib/scanner/url/normalizer";
import { EvidenceGatherer } from "@/lib/scanner/url/gatherer";
import { MLInferenceService, SentinelScanVerdict } from "@/lib/ml/client";
import { QRSecurityChecker } from "@/modules/scanner/qr/services/security-checker";
import { URLSecurityAnalyzer } from "@/modules/scanner/qr/services/url-security";
import { evaluateCanonicalRisk } from "@/lib/scanner/url/risk-evaluator";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { RiskLevel } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { handleApiError, ValidationError } from "@/lib/errors";
import { assertRateLimit, scanRateLimit } from "@/lib/rate-limit";

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

    // Velocity defense: enforce scan rate limits (25 scans/min)
    await assertRateLimit(req, scanRateLimit, userId || undefined);

    const body = await req.json();
    const parseResult = URLScanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid URL provided for security evaluation", parseResult.error.issues);
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
      const notTestedHeadersAudit = EvidenceGatherer.evaluateSecurityHeaders(
        null,
        normalized.protocol === "https",
        true
      );
      evidence = {
        ssrfProtected: true,
        networkRedirectStatus: "BLOCKED_SSRF",
        securityHeadersAudit: notTestedHeadersAudit,
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
    // 4. Canonical Risk Synthesis & Verdict Generation
    // ─────────────────────────────────────────────────────────────
    const isAuthenticPlatform =
      !parsed.brandAudit.isImpersonating &&
      (parsed.domainInfo.registrableDomain === "google.com" ||
        parsed.domainInfo.registrableDomain === "microsoft.com" ||
        parsed.domainInfo.registrableDomain === "microsoftonline.com" ||
        parsed.domainInfo.registrableDomain === "github.com" ||
        parsed.domainInfo.registrableDomain === "apple.com" ||
        parsed.domainInfo.registrableDomain === "amazon.com" ||
        parsed.domainInfo.registrableDomain === "paypal.com");

    const isReservedDocDomain =
      parsed.hostname === "example.com" ||
      parsed.hostname.endsWith(".example.com") ||
      parsed.hostname === "example.org" ||
      parsed.hostname.endsWith(".example.org") ||
      parsed.hostname === "example.net" ||
      parsed.hostname.endsWith(".example.net");

    const isReservedDocIp = URLSecurityAnalyzer.isReservedDocumentationIp(parsed.hostname);

    // Initial composite score candidate
    let compositeScore = riskResult.riskScore;
    if (mlVerdict && mlVerdict.riskScore > compositeScore) {
      // Do not allow raw ML lure score to override authentic platforms or reserved documentation targets
      if (!isAuthenticPlatform && !isReservedDocDomain) {
        compositeScore = mlVerdict.riskScore;
      }
    }

    const topEvidence = riskResult.signalEvidence
      .filter((e) => e.pointsAwarded > 0)
      .sort((a, b) => b.pointsAwarded - a.pointsAwarded)[0];

    const isSsrfEnforced = parsed.ssrfTarget || Boolean((evidence as any)?.ssrfProtected);
    if (Boolean((evidence as any)?.ssrfProtected) && !parsed.ssrfTarget) {
      riskResult.indicators.push("SSRF Protection Triggered: redirect or resolution targeted prohibited internal network");
    }

    const canonicalAssessment = evaluateCanonicalRisk({
      rawScore: compositeScore,
      threatCategory: mlVerdict && mlVerdict.threatType !== "SAFE" ? mlVerdict.threatType : riskResult.threatType,
      isAuthenticPlatform,
      isReservedDocDomain,
      isReservedDocIp,
      isSsrfTarget: isSsrfEnforced,
      brandAudit: parsed.brandAudit,
      hasUserInfo: parsed.hasUserInfo,
      userInfoString: parsed.userInfoString,
      actualHostname: parsed.hostname,
      isHttp: parsed.protocol === "http",
      indicators: riskResult.indicators,
      primaryDriver: topEvidence?.title || (mlVerdict && mlVerdict.riskScore >= 60 ? mlVerdict.reasoning : undefined),
    });

    const finalRiskScore = canonicalAssessment.riskScore;
    const finalRiskLevel = canonicalAssessment.riskLevel;
    const finalThreatType = canonicalAssessment.threatType;
    const finalReasoning = canonicalAssessment.verdict;
    const authenticityScore = canonicalAssessment.authenticityScore;

    // Signal Attribution breakdown
    const scoreBreakdown = {
      ...riskResult.scoreBreakdown,
      totalRiskScore: finalRiskScore,
    };

    const finalSecurityChecks = {
      ...securityChecks,
      networkRedirectStatus: (evidence as any)?.networkRedirectStatus || securityChecks.networkRedirectStatus || "NOT_TESTED",
      securityHeadersAudit: (evidence as any)?.securityHeadersAudit,
    };

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
              securityChecks: finalSecurityChecks as unknown as InputJsonValue,
              scoreBreakdown: scoreBreakdown as unknown as InputJsonValue,
            },
          },
        });

        await tx.scanResult.create({
          data: {
            scanId: newScan.id,
            aiProvider: "SENTINEL_URL_SECURITY_CORE",
            aiModel: "CanonicalRisk-v2",
            inferenceTimeMs: 12,
            confidenceScore: riskResult.confidence,
            threatCategory: finalThreatType,
            analysisMetadata: {
              riskScore: finalRiskScore,
              riskLevel: finalRiskLevel,
              authenticityScore,
              scoreBreakdown,
              signalEvidence: riskResult.signalEvidence,
              probabilities: mlVerdict?.probabilities,
              securityChecks: finalSecurityChecks,
              evidence,
              reasoning: finalReasoning,
              indicators: canonicalAssessment.reasons,
              threatCategory: finalThreatType,
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
    // 7. Return Consistent Explainable Structured Response
    // ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      scanId,
      normalized: normalized.normalized,
      parsedHostname: normalized.hostname,
      displayHostname: normalized.displayHostname,
      domain: normalized.domain,
      subdomain: normalized.subdomain,
      hasUserInfo: normalized.hasUserInfo,
      userInfo: normalized.userInfo,
      explanation: normalized.explanation,
      riskScore: finalRiskScore,
      authenticityScore,
      riskLevel: finalRiskLevel,
      confidence: riskResult.confidence,
      confidenceType: riskResult.confidenceType,
      confidenceLabel: riskResult.confidenceLabel,
      threatType: finalThreatType,
      reasoning: finalReasoning,
      verdict: finalReasoning,
      reasons: canonicalAssessment.reasons,
      indicators: canonicalAssessment.reasons,
      report: `${finalReasoning} | Engine: Sentinel Multi-Vector Risk Classifier${evidenceNetworkNotes ? ` | ${evidenceNetworkNotes}` : ""}`,
      scoreBreakdown,
      signalEvidence: riskResult.signalEvidence,
      securityChecks: finalSecurityChecks,
      evidence,
      mlProbability: mlVerdict?.probabilities,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
