import { PreScanEvidence } from "./evidence";
import { QRScanWarning } from "@/modules/scanner/qr/types/qr-scanner";

export interface HeuristicContext {
  payload: string;
  evidence: PreScanEvidence | undefined;
  qrSecurityWarnings?: QRScanWarning[];
}

export interface RuleEngineOutput {
  score: number;
  confidence: number;
}

export class RuleEngine {
  static evaluate(context: HeuristicContext): RuleEngineOutput {
    let score = 0;
    let confidence = 100;
    
    const lowerPayload = context.payload.toLowerCase();
    
    // Missing Evidence Checks (Reduces confidence)
    if (!context.evidence) {
      confidence -= 20; 
    } else {
      const whois = context.evidence.whois as { ageDays?: number } | null;
      if (!whois || whois.ageDays === undefined) {
        confidence -= 5;
      }
      
      // Missing VirusTotal, OCR (Currently unimplemented in evidence gatherer but required by rules)
      confidence -= 10; // VirusTotal unavailable
      confidence -= 5;  // OCR unavailable
    }
    
    // Trust Bonuses
    const trustedDomains = [
      "accounts.google.com",
      "login.live.com",
      "login.microsoftonline.com",
      "id.atlassian.com",
      "github.com",
      "linkedin.com",
      "paypal.com",
      "apple.com",
      "auth.openai.com"
    ];
    
    let isTrusted = false;
    for (const domain of trustedDomains) {
      try {
        const urlObj = new URL(lowerPayload.startsWith('http') ? lowerPayload : 'http://' + lowerPayload);
        if (urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)) {
          isTrusted = true;
          break;
        }
      } catch {
        if (lowerPayload.includes(domain)) isTrusted = true;
      }
    }

    if (isTrusted) {
      score -= 100; // Strong trust bonus to counteract any heuristics
    }
    
    // Keyword heuristics
    const phishingKeywords = ["login", "update", "verify", "secure", "account", "banking", "free"];
    for (const kw of phishingKeywords) {
      if (lowerPayload.includes(kw)) {
        score += 10;
      }
    }
    
    if (context.evidence) {
      // 1. WHOIS Age
      const whois = context.evidence.whois as { ageDays?: number } | null;
      if (whois && whois.ageDays !== undefined) {
        if (whois.ageDays < 7) {
          score += 50;
        } else if (whois.ageDays < 30) {
          score += 30;
        } else if (whois.ageDays < 90) {
          score += 15;
        }
      }

      // 2. TLS/SSL
      if (!context.evidence.tls && lowerPayload.startsWith("https")) {
        score += 40; // Missing or invalid TLS on HTTPS
      } else if (!lowerPayload.startsWith("https") && !lowerPayload.startsWith("http://localhost")) {
        score += 20; // Plain HTTP (excluding localhost)
      }

      // 3. Redirects
      if (context.evidence.redirects) {
        if (context.evidence.redirects.length > 3) {
          score += 25; // Too many redirects is suspicious
        }
      }
    }

    // ===== QR Pre-Scan Security Check Penalties =====
    // These come from QRSecurityChecker.analyzeUrl() and must impact the risk score
    if (context.qrSecurityWarnings && context.qrSecurityWarnings.length > 0) {
      for (const warning of context.qrSecurityWarnings) {
        switch (warning.code) {
          case "HTTP_UNENCRYPTED":
            score += 15; // HTTP instead of HTTPS
            break;
          case "URL_SHORTENER":
            // HTTPS shorteners (severity: medium) are commonly used by legitimate apps
            // HTTP shorteners (severity: high) are more suspicious
            score += warning.severity === "high" ? 25 : 10;
            break;
          case "PUNYCODE_DOMAIN":
            score += 30; // IDN homograph attack vector
            break;
          case "UNICODE_SPOOFING":
            score += 35; // Unicode spoofing is very suspicious
            break;
          case "SUSPICIOUS_TLD":
            score += 20; // High-risk TLD
            break;
          case "INVALID_URL":
            score += 10; // Non-URL payload
            break;
        }
      }
    }

    score = Math.max(0, Math.min(score, 100));
    confidence = Math.max(0, Math.min(confidence, 100));
    
    return { score, confidence };
  }
}
