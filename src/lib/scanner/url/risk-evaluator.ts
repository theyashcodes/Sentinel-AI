// Sentinel AI • Canonical URL Risk Assessment & Verdict Evaluator
// Enforces 100% mathematical and semantic consistency across score, badge, colors, and verdict text.

export type CanonicalThreatLevel = "SAFE" | "LOW" | "SUSPICIOUS" | "HIGH" | "CRITICAL";

export interface CanonicalScoreThreshold {
  min: number;
  max: number;
  level: CanonicalThreatLevel;
  label: string;
  colorName: "emerald" | "sky" | "amber" | "orange" | "rose";
  hexColor: string;
  badgeClasses: string;
}

export const CANONICAL_THRESHOLDS: Record<CanonicalThreatLevel, CanonicalScoreThreshold> = {
  SAFE: {
    min: 0,
    max: 19,
    level: "SAFE",
    label: "Safe",
    colorName: "emerald",
    hexColor: "#10b981",
    badgeClasses: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  LOW: {
    min: 20,
    max: 39,
    level: "LOW",
    label: "Low Risk",
    colorName: "sky",
    hexColor: "#0284c7",
    badgeClasses: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  SUSPICIOUS: {
    min: 40,
    max: 59,
    level: "SUSPICIOUS",
    label: "Suspicious",
    colorName: "amber",
    hexColor: "#f59e0b",
    badgeClasses: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  HIGH: {
    min: 60,
    max: 79,
    level: "HIGH",
    label: "High Risk",
    colorName: "orange",
    hexColor: "#ea580c",
    badgeClasses: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  CRITICAL: {
    min: 80,
    max: 100,
    level: "CRITICAL",
    label: "Critical Threat",
    colorName: "rose",
    hexColor: "#e11d48",
    badgeClasses: "bg-rose-50 text-rose-700 border border-rose-200",
  },
};

export function getThreatLevelFromScore(score: number): CanonicalThreatLevel {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  if (clamped >= CANONICAL_THRESHOLDS.CRITICAL.min) return "CRITICAL";
  if (clamped >= CANONICAL_THRESHOLDS.HIGH.min) return "HIGH";
  if (clamped >= CANONICAL_THRESHOLDS.SUSPICIOUS.min) return "SUSPICIOUS";
  if (clamped >= CANONICAL_THRESHOLDS.LOW.min) return "LOW";
  return "SAFE";
}

export interface CanonicalAssessmentParams {
  rawScore: number;
  threatCategory?: string;
  isAuthenticPlatform?: boolean;
  isReservedDocDomain?: boolean;
  isReservedDocIp?: boolean;
  isSsrfTarget?: boolean;
  isRedirectUntrusted?: boolean;
  brandAudit?: {
    isImpersonating: boolean;
    targetBrand?: string;
    brandLocation?: string;
    registrableDomain: string;
  };
  hasUserInfo?: boolean;
  userInfoString?: string;
  actualHostname?: string;
  isHttp?: boolean;
  indicators?: string[];
  primaryDriver?: string;
}

export interface CanonicalAssessmentResult {
  riskScore: number;
  authenticityScore: number;
  riskLevel: CanonicalThreatLevel;
  verdict: string;
  reasons: string[];
  threatType: string;
  threshold: CanonicalScoreThreshold;
}

/**
 * Single Canonical Risk Assessment Function
 * Guarantees zero contradictory results (e.g. 85/100 can NEVER say 'Verified Clean').
 */
export function evaluateCanonicalRisk(params: CanonicalAssessmentParams): CanonicalAssessmentResult {
  let score = Math.min(100, Math.max(0, Math.round(params.rawScore)));

  // 1. Top-tier Authentic Platform Guard:
  // Legitimate domains (Google, Microsoft, Apple, GitHub, etc.) with authentic registrable domains
  // must never be scored as malicious due to normal login/account path keywords.
  if (params.isAuthenticPlatform && !params.brandAudit?.isImpersonating && !params.hasUserInfo) {
    score = Math.min(score, 5);
  }

  // 2. RFC 2606 / RFC 6761 Reserved Documentation Domain Guard:
  // example.com / example.org test endpoints are not confirmed phishing websites unless forwarding to untrusted host
  if (params.isReservedDocDomain && !params.brandAudit?.isImpersonating && !params.hasUserInfo && !params.isRedirectUntrusted) {
    score = Math.min(score, 10);
  }

  // 3. RFC 5737 Reserved Documentation IP Guard:
  if (params.isReservedDocIp) {
    score = Math.min(score, 20);
  }

  // 4. Strong Brand Impersonation Floor:
  // A domain masquerading as a brand in subdomains or user-info must have at least a SUSPICIOUS score
  if (params.brandAudit?.isImpersonating && (params.brandAudit.brandLocation === "subdomain" || params.brandAudit.brandLocation === "userinfo")) {
    score = Math.max(score, CANONICAL_THRESHOLDS.SUSPICIOUS.min);
  }

  // Derive riskLevel strictly from score
  const riskLevel = getThreatLevelFromScore(score);
  const threshold = CANONICAL_THRESHOLDS[riskLevel];
  const authenticityScore = 100 - score;

  // Determine threat category
  let threatType = params.threatCategory || "SAFE";
  if (params.isSsrfTarget) {
    threatType = params.isReservedDocIp ? "RESERVED_IP_SSRF" : "SSRF_PROHIBITED";
  } else if (params.brandAudit?.isImpersonating) {
    threatType = "BRAND_IMPERSONATION";
  } else if (params.hasUserInfo) {
    threatType = "AUTHORITY_SPOOFING";
  } else if (params.isRedirectUntrusted) {
    threatType = "MALICIOUS_REDIRECT";
  } else if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
    threatType = params.threatCategory || "SUSPICIOUS_URL";
  } else if (riskLevel === "SAFE") {
    threatType = "SAFE";
  }

  // Synthesize consistent Executive Verdict and Reasons
  const reasons: string[] = [];
  let verdict = "";

  if (riskLevel === "CRITICAL") {
    verdict = `Critical Threat (${score}/100 Risk Score). High-probability malicious threat detected. ${params.primaryDriver || "Severe security anomalies observed."} End-user interaction strongly advised against.`;
    reasons.push(
      params.primaryDriver || "Critical structural threats or credential harvesting patterns identified",
      "Calculated risk exceeds safe operational threshold (80-100/100)"
    );
  } else if (riskLevel === "HIGH") {
    verdict = `High Risk Threat (${score}/100 Risk Score). Elevated deceptive patterns observed. ${params.primaryDriver || "URL exhibits credential harvesting or deceptive authority signatures."} Proceed with extreme caution.`;
    reasons.push(
      params.primaryDriver || "High-risk deceptive patterns or phishing vectors identified",
      "Calculated risk in high threat tier (60-79/100)"
    );
  } else if (riskLevel === "SUSPICIOUS") {
    if (params.brandAudit?.isImpersonating) {
      verdict = `Suspicious Brand Impersonation (${score}/100 Risk Score). Hostname deceptively masquerades as "${params.brandAudit.targetBrand}" while registered to untrusted host "${params.brandAudit.registrableDomain}". Potential phishing lure.`;
      reasons.push(
        `Brand impersonation: masquerades as ${params.brandAudit.targetBrand} on third-party domain ${params.brandAudit.registrableDomain}`,
        params.hasUserInfo
          ? `User-info authority prefix disguises true destination: "${params.actualHostname}"`
          : `Subdomain mimics brand structure on foreign base domain`
      );
    } else if (params.hasUserInfo) {
      verdict = `Suspicious Authority Pattern (${score}/100 Risk Score). URL injects authority user-info (${params.userInfoString}@) to visually mask actual destination "${params.actualHostname}".`;
      reasons.push(`Authority abuse: user-info masking actual host ${params.actualHostname}`);
    } else {
      verdict = `Suspicious Activity (${score}/100 Risk Score). Elevated risk signals detected. The URL uses ambiguous masking, unencrypted protocols, or redirect parameters.`;
      reasons.push(params.primaryDriver || "Structural or contextual indicators deviate from standard safe patterns");
    }
  } else if (riskLevel === "LOW") {
    if (params.isReservedDocIp) {
      verdict = `Low Risk Profile (${score}/100 Risk Score). Destination is in an RFC 5737 reserved test/documentation IP range. Outbound requests are blocked per SSRF defense policy.`;
      reasons.push("RFC 5737 documentation/test IP range", "SSRF protection blocks external probes");
    } else if (params.isSsrfTarget) {
      verdict = `Low Risk Profile (${score}/100 Risk Score). Destination points to a local or private address (${params.actualHostname}). Protected from outbound requests by SSRF boundary.`;
      reasons.push("Private / loopback network destination", "SSRF protection policy enforced");
    } else if (params.isHttp) {
      verdict = `Low Risk Profile (${score}/100 Risk Score). Cleartext HTTP protocol in use without TLS encryption. No active brand spoofing or malicious indicators identified.`;
      reasons.push("Cleartext HTTP protocol lacks in-transit encryption", "Lexical domain structure is otherwise benign");
    } else {
      verdict = `Low Risk Profile (${score}/100 Risk Score). Minor non-standard parameters or shortening observed, but no active brand spoofing or malicious attacks identified.`;
      reasons.push("Minor non-standard URL structure", "No confirmed attack signatures");
    }
  } else {
    // SAFE
    if (params.isAuthenticPlatform) {
      verdict = `Verified Clean (${score}/100 Risk Score). Authenticated top-tier platform domain. Destination structure and parameters match expected canonical standards.`;
      reasons.push("Verified authentic platform infrastructure", "Standard canonical web navigation structure");
    } else if (params.isReservedDocDomain) {
      verdict = `Verified Clean (${score}/100 Risk Score). Destination belongs to an RFC 2606 reserved documentation domain. No spoofing detected.`;
      reasons.push("RFC 2606 reserved documentation domain", "Benign documentation test destination");
    } else {
      verdict = `Verified Clean (${score}/100 Risk Score). Destination structure matches expected canonical web standards with no detected spoofing or malicious redirects.`;
      reasons.push("Clean lexical profile", "No deceptive hostname or spoofing indicators");
    }
  }

  // Append any extra contextual indicators
  if (params.indicators) {
    for (const ind of params.indicators) {
      if (!reasons.includes(ind)) {
        reasons.push(ind);
      }
    }
  }

  return {
    riskScore: score,
    authenticityScore,
    riskLevel,
    verdict,
    reasons,
    threatType,
    threshold,
  };
}
