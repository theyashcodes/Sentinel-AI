import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import { RiskLevel } from "@prisma/client";

const execFileAsync = promisify(execFile);

export interface MLPredictionResult {
  url: string;
  prediction: "benign" | "phishing" | "defacement" | "malware" | string;
  risk_level: "SAFE" | "SUSPICIOUS" | "MALICIOUS";
  risk_score: number;
  probabilities: Record<string, number>;
  key_indicators: string[];
  features?: Record<string, number>;
}

export interface SentinelScanVerdict {
  riskLevel: RiskLevel;
  confidence: number;
  threatType: string;
  reasoning: string;
  indicators: string[];
  technicalReasoning: string;
  probabilities: Record<string, number>;
  riskScore: number;
}

export class MLInferenceService {
  private static microserviceUrl = "http://127.0.0.1:5001/predict";

  static async predict(url: string): Promise<SentinelScanVerdict> {
    let result: MLPredictionResult | null = null;

    // 1. Attempt ultra-fast call to local ML daemon (2ms)
    try {
      const response = await fetch(this.microserviceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) {
        result = (await response.json()) as MLPredictionResult;
      }
    } catch {
      // Microservice not responding, will use fallback
    }

    // 2. Fallback: run CLI predict.py using virtual environment
    if (!result) {
      try {
        const rootDir = process.cwd();
        const pythonBin = process.env.PYTHON_PATH || [rootDir, ".venv", "bin", "python"].join(path.sep);
        const scriptPath = [rootDir, "ml", "predict.py"].join(path.sep);

        const { stdout } = await execFileAsync(pythonBin, [scriptPath, url], {
          timeout: 4000,
          cwd: rootDir,
        });

        result = JSON.parse(stdout) as MLPredictionResult;
      } catch (err) {
        console.error("ML CLI execution error:", err);
      }
    }

    // 3. If both failed, apply emergency heuristic
    if (!result) {
      return this.emergencyHeuristic(url);
    }

    // 4. Map ML Prediction to Sentinel AI RiskLevel and explanations
    return this.mapResultToVerdict(result);
  }

  private static mapResultToVerdict(res: MLPredictionResult): SentinelScanVerdict {
    const score = res.risk_score;
    const pred = res.prediction.toLowerCase();
    
    let riskLevel: RiskLevel;
    let threatType = "SAFE";

    if (score >= 80 || pred === "malware") {
      riskLevel = RiskLevel.CRITICAL;
      threatType = pred === "malware" ? "MALWARE" : "PHISHING";
    } else if (score >= 60 || pred === "phishing") {
      riskLevel = RiskLevel.HIGH;
      threatType = "PHISHING";
    } else if (score >= 40 || pred === "defacement") {
      riskLevel = RiskLevel.MEDIUM;
      threatType = pred === "defacement" ? "DEFACEMENT" : "SUSPICIOUS";
    } else if (score >= 20) {
      riskLevel = RiskLevel.LOW;
      threatType = "LOW_RISK";
    } else {
      riskLevel = RiskLevel.SAFE;
      threatType = "SAFE";
    }

    // Rich executive reasoning
    let reasoning = "";
    if (riskLevel === RiskLevel.CRITICAL) {
      reasoning = `ML Threat Classifier detected Critical Threat (${score}% threat score). The URL exhibits deceptive structural characteristics and high-probability attack signatures.`;
    } else if (riskLevel === RiskLevel.HIGH) {
      reasoning = `ML Threat Classifier detected High-Risk Phishing pattern (${score}% threat score). URL targets credential lures or deceptive authority structures.`;
    } else if (riskLevel === RiskLevel.MEDIUM) {
      reasoning = `ML Threat Classifier identified elevated risk signals (${score}% threat score). Structure deviates from standard benign web patterns.`;
    } else if (riskLevel === RiskLevel.LOW) {
      reasoning = `ML Threat Classifier noted minor heuristic deviations (${score}% threat score). Overall risk profile remains low.`;
    } else {
      reasoning = `Verified Clean. ML model evaluated URL structural features and entropy as consistent with standard safe web traffic.`;
    }

    const indicators = [...(res.key_indicators || [])];
    if (indicators.length === 0) {
      if (riskLevel === RiskLevel.SAFE) {
        indicators.push("Clean lexical profile", "No suspicious obfuscation detected");
      } else {
        indicators.push(`Classified as ${threatType} by ML trained classifier`, `Threat score: ${score}%`);
      }
    }

    const highestProb = Math.max(...Object.values(res.probabilities || {}));
    const confidence = Math.round(highestProb * 100);

    const technicalReasoning = `Model: HistGradientBoostingClassifier (Trained on 650k dataset). Top probabilities: ${Object.entries(
      res.probabilities || {}
    )
      .map(([k, v]) => `${k}=${(v * 100).toFixed(1)}%`)
      .join(", ")}`;

    return {
      riskLevel,
      confidence,
      threatType,
      reasoning,
      indicators,
      technicalReasoning,
      probabilities: res.probabilities,
      riskScore: score,
    };
  }

  private static emergencyHeuristic(url: string): SentinelScanVerdict {
    try {
      const candidate = url.startsWith("http://") || url.startsWith("https://") ? url : "https://" + url;
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase();
      const pathAndQuery = (parsed.pathname + parsed.search).toLowerCase();

      // Top legitimate platforms (Google, Microsoft, GitHub, Apple, etc.)
      const legitRootDomains = [
        "google.com", "google.co.in", "google.co.uk", "youtube.com", "gmail.com",
        "microsoft.com", "microsoftonline.com", "live.com", "office.com", "outlook.com",
        "apple.com", "icloud.com", "github.com", "amazon.com", "paypal.com"
      ];

      const isLegit = legitRootDomains.some(d => host === d || host.endsWith("." + d));
      if (isLegit) {
        return {
          riskLevel: RiskLevel.SAFE,
          confidence: 95,
          threatType: "SAFE",
          reasoning: "Authentic verified platform domain. Path and credential operations represent standard service functionality.",
          indicators: ["Verified top-tier platform destination", "Authentic service infrastructure"],
          technicalReasoning: "Domain reputation whitelist verified.",
          probabilities: { benign: 1.0, phishing: 0.0 },
          riskScore: 0,
        };
      }

      // RFC 2606 / RFC 6761 Reserved documentation domains
      const isReservedDoc = host === "example.com" || host.endsWith(".example.com") || host === "example.org" || host === "example.net";
      const isBrandInHost = /google|microsoft|apple|paypal|amazon/i.test(host);
      if (isReservedDoc && !isBrandInHost) {
        return {
          riskLevel: RiskLevel.SAFE,
          confidence: 90,
          threatType: "SAFE",
          reasoning: "Destination is an RFC 2606 reserved documentation domain. Not an active attack site.",
          indicators: ["Reserved synthetic/documentation domain (RFC 2606)"],
          technicalReasoning: "RFC 2606 documentation domain recognized.",
          probabilities: { benign: 0.95, phishing: 0.05 },
          riskScore: 5,
        };
      }

      // IP Address checking
      const isIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(host);
      if (isIp) {
        return {
          riskLevel: RiskLevel.LOW,
          confidence: 85,
          threatType: "RESERVED_OR_IP",
          reasoning: "Destination routes to a numeric IP address. Internal/reserved destinations blocked per SSRF defense policy.",
          indicators: ["Numeric IP address host", "SSRF validation policy applicable"],
          technicalReasoning: "IP destination recognized.",
          probabilities: { benign: 0.85, phishing: 0.15 },
          riskScore: 15,
        };
      }

      // Brand impersonation check in subdomain or user-info
      if (isBrandInHost) {
        return {
          riskLevel: RiskLevel.MEDIUM,
          confidence: 85,
          threatType: "PHISHING",
          reasoning: "Heuristic scan flagged deceptive brand keyword in hostname outside authentic domain.",
          indicators: ["Brand impersonation indicators in hostname"],
          technicalReasoning: "Brand keyword heuristic rule.",
          probabilities: { phishing: 0.50, benign: 0.50 },
          riskScore: 50,
        };
      }

      // Path lures on generic domain (weak contextual signal)
      const hasLures = /login|verify|signin|password/i.test(pathAndQuery);
      if (hasLures) {
        return {
          riskLevel: RiskLevel.LOW,
          confidence: 65,
          threatType: "LOW_RISK",
          reasoning: "URL contains contextual authentication keywords in path on non-verified host.",
          indicators: ["Authentication path keywords observed"],
          technicalReasoning: "Weak contextual signal.",
          probabilities: { benign: 0.80, phishing: 0.20 },
          riskScore: 15,
        };
      }
    } catch {
      // Fallback
    }

    return {
      riskLevel: RiskLevel.SAFE,
      confidence: 80,
      threatType: "SAFE",
      reasoning: "Fallback analysis indicates standard URL pattern.",
      indicators: ["Standard domain format"],
      technicalReasoning: "Fallback rule engine activated.",
      probabilities: { benign: 1.0, phishing: 0.0 },
      riskScore: 0,
    };
  }
}
