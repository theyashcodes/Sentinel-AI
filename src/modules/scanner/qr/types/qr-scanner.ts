export interface QRScanWarning {
  code: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface QRScanSecurityCheckResult {
  isShortener: boolean;
  isPunycode: boolean;
  isUnicodeSpoof: boolean;
  isHttp: boolean;
  isSuspiciousTld: boolean;
  isSsrfTarget?: boolean;
  hasNestedRedirect?: boolean;
  hasUserInfo?: boolean;
  hasBrandMismatch?: boolean;
  warnings: QRScanWarning[];
}

export interface DNSData {
  a?: string[];
  aaaa?: string[];
  mx?: Array<{ exchange: string; priority: number }>;
  txt?: string[][];
}

export interface TLSSubjectIssuer {
  CN?: string;
  O?: string;
}

export interface TLSData {
  subject?: TLSSubjectIssuer;
  issuer?: TLSSubjectIssuer;
  valid_from?: string;
  valid_to?: string;
}

export interface QREvidence {
  whois?: Record<string, unknown> | null;
  dns?: DNSData | null;
  tls?: TLSData | null;
  headers?: Record<string, unknown> | null;
  redirects?: string[];
  finalUrl?: string;
  statusCode?: number;
  staticRedirectCandidate?: string | null;
  ssrfProtected?: boolean;
}

export interface ScoreBreakdown {
  brandImpersonationScore: number; // 0 - 25
  unicodeConfusableScore: number;  // 0 - 20
  redirectRiskScore: number;       // 0 - 20
  urlStructureScore: number;       // 0 - 15
  domainReputationScore: number;   // 0 - 15
  contextualLureScore: number;     // 0 - 5
  totalRiskScore: number;          // 0 - 100
}

export interface SignalEvidenceItem {
  dimension: string;
  pointsAwarded: number;
  maxPoints: number;
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
}

export type ThreatClassification = "SAFE" | "LOW" | "SUSPICIOUS" | "HIGH" | "CRITICAL" | "UNKNOWN";

export interface QRScanResponse {
  scanId: string;
  decodedText: string;
  extractedUrl: string;
  securityChecks: QRScanSecurityCheckResult;
  normalized: string;
  riskScore: number; // 0 - 100 (higher = more danger)
  authenticityScore: number; // 0 - 100 (100 - riskScore)
  riskLevel: ThreatClassification;
  confidence: number; // 0 - 100 (justified measurement confidence)
  threatType: string;
  reasoning: string;
  indicators: string[];
  report: string;
  scoreBreakdown: ScoreBreakdown;
  signalEvidence: SignalEvidenceItem[];
  evidence?: QREvidence | null;
  mlProbability?: Record<string, number>;
  createdAt?: string;
}
