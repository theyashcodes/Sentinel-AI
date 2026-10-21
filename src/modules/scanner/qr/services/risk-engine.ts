// Sentinel AI • Explainable QR Code Risk Scoring & Threat Classification Engine
// Phase 2 & 3: Transparent, weighted 0-100 risk score with verifiable evidence attribution

import {
  ParsedUrlDetails,
  URLSecurityAnalyzer,
  HOMOGLYPH_MAP,
  HIGH_ABUSE_TLDS
} from "./url-security";
import {
  ScoreBreakdown,
  SignalEvidenceItem,
  ThreatClassification,
  QRScanWarning
} from "../types/qr-scanner";

// Centralized Configurable Threat Classification Policy
export const RISK_THRESHOLDS = {
  SAFE: { min: 0, max: 19, label: "SAFE" as ThreatClassification, color: "emerald" },
  LOW: { min: 20, max: 39, label: "LOW" as ThreatClassification, color: "sky" },
  SUSPICIOUS: { min: 40, max: 59, label: "SUSPICIOUS" as ThreatClassification, color: "amber" },
  HIGH: { min: 60, max: 79, label: "HIGH" as ThreatClassification, color: "orange" },
  CRITICAL: { min: 80, max: 100, label: "CRITICAL" as ThreatClassification, color: "rose" },
} as const;

export interface RiskEvaluationResult {
  riskScore: number;         // 0 - 100 (0 = Safe, 100 = Critical Threat)
  authenticityScore: number; // 0 - 100 (100 - riskScore)
  threatLevel: ThreatClassification;
  confidence: number;        // 0 - 100 (measurement confidence)
  confidenceType: "HEURISTIC_ESTIMATE" | "CALIBRATED_EVIDENCE";
  confidenceLabel: string;
  threatType: string;
  reasoning: string;
  indicators: string[];
  scoreBreakdown: ScoreBreakdown;
  signalEvidence: SignalEvidenceItem[];
  warnings: QRScanWarning[];
}

// Known Safe Top-Tier Platforms (for reputation dampener only, never blind pass)
const VERIFIED_TOP_TIER_PLATFORMS = new Set([
  "google.com", "google.co.in", "google.co.uk", "youtube.com",
  "github.com", "microsoft.com", "apple.com", "wikipedia.org",
  "cloudflare.com", "amazon.com", "amazon.in"
]);

// Credential-harvesting keywords
const CREDENTIAL_LURES = [
  "login", "signin", "sign-in", "log-in", "verify", "verification",
  "account-update", "secure-account", "wallet", "seed-phrase", "private-key",
  "banking", "netbanking", "kyc", "authenticate", "auth-check", "passcode",
  "billing-confirm", "claim-reward", "lottery-claim"
];

export class QRRiskEngine {
  /**
   * Evaluates comprehensive risk signals and computes an explainable 0-100 score
   */
  static evaluate(parsed: ParsedUrlDetails): RiskEvaluationResult {
    const evidenceList: SignalEvidenceItem[] = [];
    const warnings: QRScanWarning[] = [];
    const indicators: string[] = [];

    // ─────────────────────────────────────────────────────────────
    // DIMENSION 1: Brand Impersonation and Hostname Mismatch (0 - 25)
    // ─────────────────────────────────────────────────────────────
    let brandScore = 0;
    if (parsed.brandAudit.isImpersonating) {
      if (parsed.brandAudit.brandLocation === "subdomain") {
        brandScore = 25;
        const isFullDomain = parsed.brandAudit.impersonationPattern === "FULL_DOMAIN_IN_SUBDOMAIN";
        evidenceList.push({
          dimension: "Brand Impersonation",
          pointsAwarded: 25,
          maxPoints: 25,
          title: isFullDomain ? "Full Legitimate Domain Mimicry in Subdomain" : "Subdomain Brand Spoofing",
          description: isFullDomain
            ? `Hostname embeds full authentic domain in subdomains ("${parsed.domainInfo.subdomain}") while registered domain is "${parsed.domainInfo.registrableDomain}".`
            : `Hostname masquerades as "${parsed.brandAudit.targetBrand}" inside subdomains, while registered domain is "${parsed.domainInfo.registrableDomain}".`,
          severity: "critical",
        });
        warnings.push({
          code: isFullDomain ? "FULL_DOMAIN_MASQUERADE_SUBDOMAIN" : "BRAND_MASQUERADE_SUBDOMAIN",
          title: `Brand Impersonation (${parsed.brandAudit.targetBrand})`,
          description: `The URL uses "${parsed.brandAudit.targetBrand}" in subdomains to deceive users, but actually points to "${parsed.domainInfo.registrableDomain}".`,
          severity: "high",
        });
        indicators.push(`Brand spoofing: claims ${parsed.brandAudit.targetBrand} on untrusted host ${parsed.domainInfo.registrableDomain}`);
      } else if (parsed.brandAudit.brandLocation === "userinfo") {
        brandScore = 20;
        evidenceList.push({
          dimension: "Brand Impersonation",
          pointsAwarded: 20,
          maxPoints: 25,
          title: "Authority User-Info Brand Lure",
          description: `URL authority injects "${parsed.brandAudit.targetBrand}" in username/password field to visually disguise the actual host.`,
          severity: "high",
        });
        warnings.push({
          code: "BRAND_MASQUERADE_USERINFO",
          title: "User-Info Brand Masking",
          description: `URL tricks eye with @ symbol to make ${parsed.brandAudit.targetBrand} appear as the destination host.`,
          severity: "high",
        });
        indicators.push(`User-info authority spoofing targeting ${parsed.brandAudit.targetBrand}`);
      } else if (parsed.brandAudit.brandLocation === "path") {
        brandScore = 15;
        evidenceList.push({
          dimension: "Brand Impersonation",
          pointsAwarded: 15,
          maxPoints: 25,
          title: "Path Brand Lure on Foreign Host",
          description: `URL path targets "${parsed.brandAudit.targetBrand}" login on foreign domain "${parsed.domainInfo.registrableDomain}".`,
          severity: "medium",
        });
        indicators.push(`Suspicious ${parsed.brandAudit.targetBrand} path on third-party domain`);
      }
    } else {
      evidenceList.push({
        dimension: "Brand Impersonation",
        pointsAwarded: 0,
        maxPoints: 25,
        title: "No Brand Mismatch",
        description: "No unauthorized brand masquerading or deceptive hostname mismatch detected.",
        severity: "info",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DIMENSION 2: Unicode Confusables & Suspicious Punycode (0 - 20)
    // ─────────────────────────────────────────────────────────────
    let unicodeScore = 0;
    if (parsed.homoglyphAudit.hasHomoglyphSpoof) {
      if (parsed.homoglyphAudit.hasMixedScripts) {
        unicodeScore = 20;
        evidenceList.push({
          dimension: "Unicode & IDN Security",
          pointsAwarded: 20,
          maxPoints: 20,
          title: "Mixed-Script Homoglyph Attack",
          description: `Domain mixes Latin with non-Latin lookalike characters (${parsed.homoglyphAudit.confusableCharsFound.join(", ")}) to spoof a visually indistinguishable target.`,
          severity: "critical",
        });
        warnings.push({
          code: "HOMOGLYPH_SPOOF",
          title: "Homograph Domain Deception",
          description: `Visual homoglyphs detected: characters like "${parsed.homoglyphAudit.confusableCharsFound.join(", ")}" replace standard Latin letters.`,
          severity: "high",
        });
        indicators.push(`Homoglyph confusable attack: mixed script substitution (${parsed.homoglyphAudit.confusableCharsFound.join(", ")})`);
      } else {
        unicodeScore = 15;
        evidenceList.push({
          dimension: "Unicode & IDN Security",
          pointsAwarded: 15,
          maxPoints: 20,
          title: "Deceptive Unicode Confusables",
          description: `Hostname contains confusable glyphs mapping to Latin lookalikes.`,
          severity: "high",
        });
        indicators.push("Suspicious confusable characters found in domain labels");
      }
    } else if (parsed.homoglyphAudit.isPunycode) {
      unicodeScore = 8;
      evidenceList.push({
        dimension: "Unicode & IDN Security",
        pointsAwarded: 8,
        maxPoints: 20,
        title: "Punycode IDN Encoded Domain",
        description: "Domain utilizes Punycode (xn--) encoding. Inspected labels did not show overt mixed-script confusables.",
        severity: "low",
      });
      warnings.push({
        code: "PUNYCODE_DOMAIN",
        title: "Punycode Encoded Host",
        description: "Punycode hostname detected. Verify intended character set before interaction.",
        severity: "low",
      });
    } else {
      evidenceList.push({
        dimension: "Unicode & IDN Security",
        pointsAwarded: 0,
        maxPoints: 20,
        title: "Clean ASCII / Standard Encoding",
        description: "Standard ASCII representation without deceptive Unicode confusables or Punycode masking.",
        severity: "info",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DIMENSION 3: Redirect Risk & Chain Behaviour (0 - 20)
    // ─────────────────────────────────────────────────────────────
    let redirectScore = 0;
    const { redirectAudit, isShortener } = parsed;

    if (redirectAudit.redirect_chain_verified) {
      // Active Network Redirect Chain Verified via HTTP
      redirectScore = 15;
      evidenceList.push({
        dimension: "Redirect Integrity",
        pointsAwarded: 15,
        maxPoints: 20,
        title: "Active HTTP Redirect Chain Verified",
        description: `Controlled HTTP request verified redirection to: ${redirectAudit.normalizedCandidate || "target destination"}.`,
        severity: "medium",
      });
      warnings.push({
        code: "HTTP_REDIRECT_CHAIN_VERIFIED",
        title: "Verified HTTP Redirection",
        description: `Observed network redirect chain verified over active HTTP transport.`,
        severity: "medium",
      });
    } else if (redirectAudit.redirect_chain_observed) {
      // Multiple chained nested parameters parsed statically (depth >= 2)
      redirectScore = 18;
      evidenceList.push({
        dimension: "Redirect Integrity",
        pointsAwarded: 18,
        maxPoints: 20,
        title: "Multi-Hop Chained Redirect Parameters",
        description: `Deeply nested redirect parameters detected (depth ${redirectAudit.hopDepth}). Statically masks final landing page.`,
        severity: "critical",
      });
      warnings.push({
        code: "NESTED_REDIRECT_CHAIN",
        title: "Multi-Layer Nested Redirection",
        description: `URL contains chained redirect parameters leading to: ${redirectAudit.normalizedCandidate}`,
        severity: "high",
      });
      indicators.push(`Deeply nested redirect chain targeting ${redirectAudit.normalizedCandidate}`);
    } else if (redirectAudit.redirect_destination_untrusted) {
      // Untrusted Cross-Origin Redirect Destination
      // Distinguish high-abuse TLD / raw IP targets from standard cross-origin targets
      const candidateHost = redirectAudit.normalizedCandidate ? new URL(redirectAudit.normalizedCandidate).hostname : "";
      const candidateDomainInfo = URLSecurityAnalyzer.parseDomain(candidateHost);
      const isCandidateHighAbuse = HIGH_ABUSE_TLDS.has(candidateDomainInfo.tld) || candidateDomainInfo.isIpAddress;
      const isHttpTarget = redirectAudit.normalizedCandidate?.startsWith("http://");
      const isAuthEndpoint = /oauth|authorize|login|signin|auth/i.test(parsed.pathname);
      const isSuspiciousHost = /evil|tracker|hack|phish|steal|token/i.test(candidateHost);

      let penalty = 12;
      if (isCandidateHighAbuse || isSuspiciousHost) {
        penalty = 18;
      } else if (isHttpTarget || isAuthEndpoint) {
        penalty = 15;
      }
      redirectScore = penalty;

      evidenceList.push({
        dimension: "Redirect Integrity",
        pointsAwarded: penalty,
        maxPoints: 20,
        title: "Untrusted Cross-Origin Redirect Destination",
        description: `URL query parameter forwards traffic to an external, untrusted third-party domain: ${candidateHost || redirectAudit.candidateUrl}`,
        severity: (isCandidateHighAbuse || isSuspiciousHost || isHttpTarget) ? "high" : "medium",
      });
      warnings.push({
        code: "UNTRUSTED_CROSS_ORIGIN_REDIRECT",
        title: "Untrusted Cross-Origin Redirection",
        description: `Potential open redirect vector forwarding to third-party host: ${candidateHost}${isHttpTarget ? " over unencrypted HTTP" : ""}`,
        severity: (isCandidateHighAbuse || isSuspiciousHost || isHttpTarget) ? "high" : "medium",
      });
      indicators.push(`Untrusted cross-origin redirect destination: ${candidateHost}`);
    } else if (redirectAudit.redirect_parameter_present && (redirectAudit.isSameOrigin || redirectAudit.isSameRegistrableDomain || redirectAudit.isReservedSyntheticDomain)) {
      // Safe / Benign Navigation or Synthetic RFC 2606 / RFC 6761 Destination (0 points)
      redirectScore = 0;
      evidenceList.push({
        dimension: "Redirect Integrity",
        pointsAwarded: 0,
        maxPoints: 20,
        title: redirectAudit.isReservedSyntheticDomain ? "Reserved Synthetic Destination (RFC 2606)" : "Internal Safe Redirection Parameter",
        description: redirectAudit.isReservedSyntheticDomain
          ? `Destination is a reserved synthetic test domain (${redirectAudit.normalizedCandidate}). Network status: NOT TESTED (static analysis).`
          : `Redirect parameter targets same origin or internal registrable domain (${parsed.domainInfo.registrableDomain}). No open redirect vulnerability.`,
        severity: "info",
      });
    } else if (redirectAudit.redirect_parameter_present) {
      // Redirect parameter present without untrusted cross-origin destination (e.g. relative path, benign parameter name)
      redirectScore = 0;
      evidenceList.push({
        dimension: "Redirect Integrity",
        pointsAwarded: 0,
        maxPoints: 20,
        title: "Benign Navigation Parameter",
        description: "Redirect/navigation parameter detected with no untrusted external destination.",
        severity: "info",
      });
    }

    // Link Shortener Check (can coexist with redirect parameters or stand alone)
    if (isShortener) {
      const shortenerAdd = redirectScore > 0 ? 8 : 10;
      redirectScore = Math.min(20, redirectScore + shortenerAdd);
      evidenceList.push({
        dimension: "Redirect Integrity",
        pointsAwarded: shortenerAdd,
        maxPoints: 20,
        title: "Known Link Shortener Service",
        description: `Host (${parsed.domainInfo.registrableDomain}) is a public shortening service that obscures the real destination.`,
        severity: "medium",
      });
      warnings.push({
        code: "URL_SHORTENER",
        title: "Shortened Link Destination",
        description: `Uses link shortener ${parsed.domainInfo.registrableDomain} to mask destination URL.`,
        severity: "medium",
      });
      indicators.push(`Link shortener masks real destination (${parsed.domainInfo.registrableDomain})`);
    }

    if (redirectScore === 0 && !isShortener && !redirectAudit.redirect_parameter_present) {
      evidenceList.push({
        dimension: "Redirect Integrity",
        pointsAwarded: 0,
        maxPoints: 20,
        title: "Direct Destination",
        description: "Direct web target with no redirect query parameters, shortener masking, or observed chains.",
        severity: "info",
      });
    }

    redirectScore = Math.min(20, redirectScore);

    // ─────────────────────────────────────────────────────────────
    // DIMENSION 4: URL Structure, User-Info Abuse & SSRF (0 - 15)
    // ─────────────────────────────────────────────────────────────
    let structureScore = 0;
    if (parsed.ssrfTarget) {
      structureScore = 15;
      evidenceList.push({
        dimension: "Structure & SSRF Defense",
        pointsAwarded: 15,
        maxPoints: 15,
        title: "SSRF Internal Network Prohibited Target",
        description: `Destination points to private, loopback, or cloud metadata network (${parsed.hostname}). Network access blocked.`,
        severity: "critical",
      });
      warnings.push({
        code: "SSRF_PROHIBITED_TARGET",
        title: "SSRF Protection Triggered",
        description: `Host ${parsed.hostname} is a prohibited internal/loopback address. Automated fetch aborted.`,
        severity: "critical",
      });
      indicators.push(`SSRF Block: prohibited destination (${parsed.hostname})`);
    } else if (parsed.hasUserInfo) {
      structureScore = 12;
      evidenceList.push({
        dimension: "Structure & SSRF Defense",
        pointsAwarded: 12,
        maxPoints: 15,
        title: "User-Info Authority Abuse",
        description: `URL contains credentials or deceptive user-info (${parsed.userInfoString}@) in the authority section.`,
        severity: "high",
      });
      warnings.push({
        code: "USERINFO_IN_URL",
        title: "User-Info Authority Pattern",
        description: "The @ symbol in the URL authority section is used to confuse human readers about the actual host.",
        severity: "high",
      });
      indicators.push("Deceptive user-info @ authority notation detected");
    } else if (parsed.domainInfo.isIpAddress) {
      structureScore = 10;
      evidenceList.push({
        dimension: "Structure & SSRF Defense",
        pointsAwarded: 10,
        maxPoints: 15,
        title: "Numeric IP Address Host",
        description: `Destination uses raw IP (${parsed.hostname}) instead of a verified registered domain.`,
        severity: "medium",
      });
      warnings.push({
        code: "RAW_IP_HOST",
        title: "Raw IP Address Destination",
        description: `URL routes directly to an IP address (${parsed.hostname}) rather than a named domain.`,
        severity: "medium",
      });
    } else if (parsed.domainInfo.subdomain && parsed.domainInfo.subdomain.split(".").some(lbl => ["com", "net", "org", "gov", "edu", "co", "io", "me", "info", "biz"].includes(lbl.toLowerCase()))) {
      structureScore = 6;
      evidenceList.push({
        dimension: "Structure & SSRF Defense",
        pointsAwarded: 6,
        maxPoints: 15,
        title: "Deceptive Subdomain TLD Mimicry",
        description: `Hostname embeds deceptive top-level domain labels inside its subdomain ("${parsed.domainInfo.subdomain}") to simulate an authentic destination.`,
        severity: "medium",
      });
      warnings.push({
        code: "DECEPTIVE_SUBDOMAIN_NESTING",
        title: "Deceptive Subdomain Structure",
        description: `Subdomain "${parsed.domainInfo.subdomain}" contains TLD-like domain formatting designed to mislead users.`,
        severity: "medium",
      });
      indicators.push(`Deceptive TLD-in-subdomain structure (${parsed.domainInfo.subdomain})`);
    } else if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
      structureScore = 5;
      evidenceList.push({
        dimension: "Structure & SSRF Defense",
        pointsAwarded: 5,
        maxPoints: 15,
        title: "Non-Standard Web Port",
        description: `URL targets uncommon web port :${parsed.port}.`,
        severity: "low",
      });
    } else {
      evidenceList.push({
        dimension: "Structure & SSRF Defense",
        pointsAwarded: 0,
        maxPoints: 15,
        title: "Standard URL Structure",
        description: "Well-formed URL structure adhering to standard web protocols and ports.",
        severity: "info",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DIMENSION 5: Domain Reputation & Threat Intelligence (0 - 15)
    // ─────────────────────────────────────────────────────────────
    let reputationScore = 0;
    const isVerifiedPlatform = VERIFIED_TOP_TIER_PLATFORMS.has(parsed.domainInfo.registrableDomain);

    if (parsed.isHighAbuseTld) {
      // High-abuse TLD combined with brand spoofing or lures is high risk
      if (brandScore > 0 || parsed.redirectAudit.hasNestedRedirect) {
        reputationScore = 15;
        evidenceList.push({
          dimension: "Reputation & Telemetry",
          pointsAwarded: 15,
          maxPoints: 15,
          title: "High-Abuse TLD Combined with Threat Pattern",
          description: `Top-level domain (.${parsed.domainInfo.tld}) has extreme historical abuse rates for phishing campaigns.`,
          severity: "high",
        });
        warnings.push({
          code: "HIGH_ABUSE_TLD_COMPOUNDED",
          title: "High-Risk TLD Compound Threat",
          description: `The .${parsed.domainInfo.tld} TLD combined with deceptive structure indicates malicious intent.`,
          severity: "high",
        });
        indicators.push(`High-abuse TLD (.${parsed.domainInfo.tld}) combined with suspicious patterns`);
      } else {
        reputationScore = 6;
        evidenceList.push({
          dimension: "Reputation & Telemetry",
          pointsAwarded: 6,
          maxPoints: 15,
          title: "High-Abuse TLD Alert",
          description: `Domain uses top-level domain (.${parsed.domainInfo.tld}) frequently observed in unsolicited spam.`,
          severity: "low",
        });
      }
    } else if (parsed.protocol === "http") {
      // Unencrypted HTTP for sensitive contexts
      reputationScore = 6;
      evidenceList.push({
        dimension: "Reputation & Telemetry",
        pointsAwarded: 6,
        maxPoints: 15,
        title: "Unencrypted Connection (HTTP)",
        description: "Cleartext HTTP lacks TLS encryption, susceptible to on-path interception.",
        severity: "medium",
      });
      warnings.push({
        code: "HTTP_UNENCRYPTED",
        title: "Unencrypted Protocol (HTTP)",
        description: "Communication is unencrypted. Login credentials or tokens can be intercepted.",
        severity: "medium",
      });
      indicators.push("Cleartext HTTP protocol without TLS");
    } else if (isVerifiedPlatform && brandScore === 0) {
      reputationScore = 0;
      evidenceList.push({
        dimension: "Reputation & Telemetry",
        pointsAwarded: 0,
        maxPoints: 15,
        title: "Verified Top-Tier Web Platform",
        description: `Registrable domain (${parsed.domainInfo.registrableDomain}) belongs to verified top-tier infrastructure.`,
        severity: "info",
      });
    } else {
      reputationScore = 0;
      evidenceList.push({
        dimension: "Reputation & Telemetry",
        pointsAwarded: 0,
        maxPoints: 15,
        title: "Reputation Telemetry Neutral",
        description: "No negative blacklist hits; missing or standard reputation treated neutrally.",
        severity: "info",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DIMENSION 6: Contextual Signals & Phishing Lures (0 - 5)
    // ─────────────────────────────────────────────────────────────
    let lureScore = 0;
    const lowerPathAndQuery = (parsed.pathname + parsed.search).toLowerCase();
    const matchedLures = CREDENTIAL_LURES.filter((l) => lowerPathAndQuery.includes(l));

    // Only penalize credential lures if the domain is NOT a top-tier verified platform
    if (matchedLures.length > 0 && !isVerifiedPlatform) {
      lureScore = Math.min(5, matchedLures.length * 2);
      evidenceList.push({
        dimension: "Contextual Lures",
        pointsAwarded: lureScore,
        maxPoints: 5,
        title: "Credential Harvesting Lure Keywords",
        description: `Path/query contains sensitive lures: "${matchedLures.slice(0, 3).join(", ")}".`,
        severity: "medium",
      });
      indicators.push(`Credential harvesting language detected: [${matchedLures.slice(0, 3).join(", ")}]`);
    } else {
      evidenceList.push({
        dimension: "Contextual Lures",
        pointsAwarded: 0,
        maxPoints: 5,
        title: "Clean Contextual Profile",
        description: "No overt credential-harvesting keywords or urgency lures detected in path or parameters.",
        severity: "info",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // TOTAL RISK SCORE CALCULATION
    // ─────────────────────────────────────────────────────────────
    let totalRiskScore = brandScore + unicodeScore + redirectScore + structureScore + reputationScore + lureScore;

    // Apply Verified Platform Dampener if domain is clean
    if (isVerifiedPlatform && brandScore === 0 && unicodeScore === 0 && redirectScore === 0) {
      totalRiskScore = Math.max(0, totalRiskScore - 5);
    }

    // Clamp between 0 and 100
    totalRiskScore = Math.min(100, Math.max(0, Math.round(totalRiskScore)));

    // ─────────────────────────────────────────────────────────────
    // THREAT CLASSIFICATION & PRINCIPLED RISK POLICY
    // ─────────────────────────────────────────────────────────────
    let threatLevel: ThreatClassification = "SAFE";
    if (totalRiskScore >= RISK_THRESHOLDS.CRITICAL.min) {
      threatLevel = "CRITICAL";
    } else if (totalRiskScore >= RISK_THRESHOLDS.HIGH.min) {
      threatLevel = "HIGH";
    } else if (totalRiskScore >= RISK_THRESHOLDS.SUSPICIOUS.min) {
      threatLevel = "SUSPICIOUS";
    } else if (totalRiskScore >= RISK_THRESHOLDS.LOW.min) {
      threatLevel = "LOW";
    } else {
      threatLevel = "SAFE";
    }

    // PRINCIPLED SECURITY POLICY FOR STRONG BRAND IMPERSONATION:
    // A verified brand impersonation attack (e.g. masquerading as a financial/tech brand
    // in subdomains or authority on an unauthorized third-party registrable domain) represents an
    // active phishing lure. It must NEVER be classified as SAFE or LOW RISK.
    // Confirmed strong brand impersonation enforces a non-negotiable classification floor of SUSPICIOUS.
    if (parsed.brandAudit.isImpersonating && (parsed.brandAudit.brandLocation === "subdomain" || parsed.brandAudit.brandLocation === "userinfo")) {
      if (threatLevel === "SAFE" || threatLevel === "LOW") {
        threatLevel = "SUSPICIOUS";
      }
      // Maintain mathematical and semantic consistency between riskScore, authenticityScore, and classification
      if (totalRiskScore < RISK_THRESHOLDS.SUSPICIOUS.min) {
        totalRiskScore = RISK_THRESHOLDS.SUSPICIOUS.min;
      }
    }

    // PRINCIPLED SECURITY POLICY FOR UNTRUSTED CROSS-ORIGIN REDIRECTS:
    if (parsed.redirectAudit.redirect_destination_untrusted) {
      const candidateHost = parsed.redirectAudit.normalizedCandidate ? new URL(parsed.redirectAudit.normalizedCandidate).hostname : "";
      const isSuspiciousRedirect = /evil|tracker|hack|phish|steal|token/i.test(candidateHost) ||
        parsed.redirectAudit.normalizedCandidate?.startsWith("http://") ||
        /oauth|authorize|login|signin|auth/i.test(parsed.pathname);

      if (isSuspiciousRedirect) {
        if (threatLevel === "SAFE" || threatLevel === "LOW") {
          threatLevel = "SUSPICIOUS";
        }
        if (totalRiskScore < RISK_THRESHOLDS.SUSPICIOUS.min) {
          totalRiskScore = RISK_THRESHOLDS.SUSPICIOUS.min;
        }
      } else if (threatLevel === "SAFE") {
        threatLevel = "LOW";
        if (totalRiskScore < RISK_THRESHOLDS.LOW.min) {
          totalRiskScore = RISK_THRESHOLDS.LOW.min;
        }
      }
    }

    // Authenticity Score is mathematically defined as (100 - totalRiskScore)
    const authenticityScore = 100 - totalRiskScore;

    // Threat Type Classification
    let threatType = "SAFE";
    if (parsed.ssrfTarget) {
      threatType = "SSRF_PROHIBITED";
    } else if (parsed.brandAudit.isImpersonating) {
      threatType = "BRAND_IMPERSONATION";
    } else if (parsed.homoglyphAudit.hasHomoglyphSpoof) {
      threatType = "HOMOGRAPH_PHISHING";
    } else if (parsed.redirectAudit.redirect_destination_untrusted || parsed.redirectAudit.redirect_chain_observed || parsed.redirectAudit.redirect_chain_verified) {
      threatType = "MALICIOUS_REDIRECT";
    } else if (totalRiskScore >= 40) {
      threatType = "SUSPICIOUS_URL";
    }

    // ─────────────────────────────────────────────────────────────
    // EXECUTIVE REASONING SYNTHESIS
    // ─────────────────────────────────────────────────────────────
    let reasoning = "";
    if (threatLevel === "CRITICAL" || threatLevel === "HIGH") {
      const topEvidence = evidenceList
        .filter((e) => e.pointsAwarded > 0)
        .sort((a, b) => b.pointsAwarded - a.pointsAwarded)[0];
      reasoning = `High-probability threat detected (${totalRiskScore}/100 Risk Score). Primary driver: ${topEvidence ? topEvidence.title : "Deceptive URL features"}. Not safe for end-user interaction.`;
    } else if (parsed.brandAudit.isImpersonating && (parsed.brandAudit.brandLocation === "subdomain" || parsed.brandAudit.brandLocation === "userinfo")) {
      reasoning = `Brand impersonation threat detected (${totalRiskScore}/100 Risk Score). Hostname deceptively masquerades as "${parsed.brandAudit.targetBrand}" on unauthorized host "${parsed.domainInfo.registrableDomain}". Potential phishing vector.`;
    } else if (parsed.redirectAudit.redirect_destination_untrusted) {
      reasoning = `Untrusted cross-origin redirect detected (${totalRiskScore}/100 Risk Score). The URL forwards user sessions or credentials to an external host: "${parsed.redirectAudit.normalizedCandidate || "untrusted target"}". Potential open redirect vulnerability.`;
    } else if (threatLevel === "SUSPICIOUS") {
      reasoning = `Elevated risk signals detected (${totalRiskScore}/100 Risk Score). The URL uses ambiguous masking, unencrypted protocols, or redirect parameters. Proceed with caution.`;
    } else if (threatLevel === "LOW") {
      reasoning = `Low risk profile (${totalRiskScore}/100 Risk Score). Minor non-standard parameters or shortening observed, but no active brand spoofing or homoglyph attacks identified.`;
    } else {
      reasoning = `Verified Clean (${totalRiskScore}/100 Risk Score). Destination structure matches expected canonical web standards with no detected spoofing or malicious redirects.`;
    }

    // Measurement Confidence (Evidence Depth)
    // Requirement 6: If confidence is not derived from a calibrated model or defensible evidence calculation,
    // label it as a heuristic confidence estimate or calibrate against verifiable signals.
    let confidence = 60;
    let confidenceType: "HEURISTIC_ESTIMATE" | "CALIBRATED_EVIDENCE" = "HEURISTIC_ESTIMATE";
    let confidenceLabel = "Heuristic Confidence Estimate";

    if (parsed.redirectAudit.redirect_chain_verified) {
      // Active Network Redirect Telemetry Verified
      confidence = 90;
      confidenceType = "CALIBRATED_EVIDENCE";
      confidenceLabel = "Calibrated Evidence-Based Confidence";
    } else {
      // Static Lexical & Syntactic Heuristic Analysis
      if (parsed.domainInfo.registrableDomain) confidence += 5;
      if (parsed.protocol === "https" || parsed.protocol === "http") confidence += 5;
      confidence = Math.min(70, confidence);
      confidenceType = "HEURISTIC_ESTIMATE";
      confidenceLabel = "Heuristic Confidence Estimate";
    }

    const scoreBreakdown: ScoreBreakdown = {
      brandImpersonationScore: brandScore,
      unicodeConfusableScore: unicodeScore,
      redirectRiskScore: redirectScore,
      urlStructureScore: structureScore,
      domainReputationScore: reputationScore,
      contextualLureScore: lureScore,
      totalRiskScore,
    };

    return {
      riskScore: totalRiskScore,
      authenticityScore,
      threatLevel,
      confidence,
      confidenceType,
      confidenceLabel,
      threatType,
      reasoning,
      indicators: indicators.length > 0 ? indicators : ["Standard canonical structure", "Clean lexical profile"],
      scoreBreakdown,
      signalEvidence: evidenceList,
      warnings,
    };
  }
}
