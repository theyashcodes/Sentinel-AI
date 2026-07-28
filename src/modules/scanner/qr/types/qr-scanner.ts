export interface QRScanWarning {
  code: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface QRScanSecurityCheckResult {
  isShortener: boolean;
  isPunycode: boolean;
  isUnicodeSpoof: boolean;
  isHttp: boolean;
  isSuspiciousTld: boolean;
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
}

export interface QRScanResponse {
  scanId: string;
  decodedText: string;
  extractedUrl: string;
  securityChecks: QRScanSecurityCheckResult;
  normalized: string;
  riskLevel: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
  confidence: number;
  threatType: string;
  reasoning: string;
  indicators: string[];
  report: string;
  evidence?: QREvidence | null;
  createdAt?: string;
}

