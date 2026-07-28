export interface PreScanEvidence {
  whois?: Record<string, unknown> | null;
  dns?: Record<string, unknown> | null;
  ocrText?: string;
  tls?: Record<string, unknown> | null;
  headers?: Record<string, unknown> | null;
  redirects?: string[];
  finalUrl?: string;
  statusCode?: number;
}

export class EvidenceProcessor {
  static process(rawEvidence: PreScanEvidence): string {
    const structuredEvidence = {
      tls: rawEvidence.tls ? { valid: true, details: rawEvidence.tls } : { valid: false, reason: "Missing or invalid" },
      whois: rawEvidence.whois ? { available: true, domainAgeDays: rawEvidence.whois.ageDays } : { available: false },
      dns: rawEvidence.dns ? rawEvidence.dns : { available: false },
      http: {
        status: rawEvidence.statusCode || null,
        redirects: rawEvidence.redirects || [],
        headers: rawEvidence.headers || null
      },
      blacklists: {
        virustotal: "unimplemented",
        phishtank: "unimplemented",
        urlhaus: "unimplemented"
      },
      pageAnalysis: {
        ocrText: rawEvidence.ocrText || null
      }
    };
    
    return JSON.stringify(structuredEvidence, null, 2);
  }
}
