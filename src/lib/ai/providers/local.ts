import { IAIProvider, AIAnalysisResponse } from "./base";
import { PreScanEvidence } from "../processors/evidence";

export class LocalProvider implements IAIProvider {
  name = "LOCAL_PROVIDER";
  model = "heuristics-v1";

  async analyze(prompt: string, evidence?: unknown): Promise<AIAnalysisResponse> {
    const preScanEvidence = evidence as PreScanEvidence;
    
    const targetUrl = preScanEvidence?.finalUrl || "";
    const isHttps = targetUrl.toLowerCase().startsWith("https");
    const reasoningParts: string[] = [];
    const indicators: string[] = [];

    if (preScanEvidence?.whois) {
      const ageDays = preScanEvidence.whois.ageDays as number | undefined;
      if (ageDays !== undefined) {
        if (ageDays < 7) {
          reasoningParts.push(`Domain was registered very recently (${ageDays} days ago).`);
          indicators.push("new-domain");
        } else if (ageDays < 30) {
          reasoningParts.push(`Domain is less than a month old (${ageDays} days).`);
          indicators.push("recent-domain");
        } else {
          reasoningParts.push(`Domain age is established (${ageDays} days).`);
        }
      }
    } else {
      reasoningParts.push("WHOIS data is missing or hidden.");
      indicators.push("missing-whois");
    }

    if (preScanEvidence?.tls) {
      reasoningParts.push("Valid HTTPS certificate present.");
    } else if (isHttps) {
      reasoningParts.push("HTTPS was requested but no valid TLS certificate was found.");
      indicators.push("invalid-tls");
    } else {
      reasoningParts.push("Domain does not use HTTPS, exposing data to interception.");
      indicators.push("no-https");
    }

    if (preScanEvidence?.redirects && preScanEvidence.redirects.length > 0) {
      reasoningParts.push(`Encountered ${preScanEvidence.redirects.length} redirects.`);
      if (preScanEvidence.redirects.length > 3) {
        indicators.push("excessive-redirects");
      }
    } else {
      reasoningParts.push("No suspicious redirects.");
    }

    if (preScanEvidence?.headers) {
      const headers = preScanEvidence.headers as Record<string, string>;
      if (headers['strict-transport-security']) {
        reasoningParts.push("Security headers present.");
      } else {
        reasoningParts.push("Standard security headers (HSTS) are missing.");
        indicators.push("missing-hsts");
      }
    }

    let threatType = "SAFE";
    try {
      const match = prompt.match(/"threatType":\s*"([^"]+)"/);
      if (match && match[1]) threatType = match[1];
    } catch {}

    if (threatType !== "SAFE") {
      reasoningParts.push("Phishing indicators detected based on gathered intelligence.");
    } else {
      reasoningParts.push("No phishing indicators detected.");
    }

    // Extract ruleVerdict from prompt JSON if possible, or just generate a basic fallback response
    let confidence = 50;
    try {
      const match = prompt.match(/"confidence":\s*(\d+)/);
      if (match && match[1]) confidence = parseInt(match[1], 10);
    } catch {}

    const startTime = Date.now();

    return {
      executiveSummary: "Analysis completed using Local Provider fallback.",
      technicalReasoning: reasoningParts.join(" "),
      recommendation: "Review the evidence manually as the primary AI analyst is unavailable.",
      confidence,
      analystNotes: [
        "Primary AI provider failed or timed out.",
        "This is a fallback automated analysis."
      ],
      providerName: this.name,
      modelName: this.model,
      inferenceTimeMs: Date.now() - startTime,
      cost: {
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0
      }
    };
  }
}
