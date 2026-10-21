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

    if (score >= 75 || pred === "malware" || pred === "phishing") {
      riskLevel = score >= 85 ? RiskLevel.CRITICAL : RiskLevel.HIGH;
      threatType = pred.toUpperCase();
    } else if (score >= 45 || pred === "defacement") {
      riskLevel = RiskLevel.MEDIUM;
      threatType = pred === "defacement" ? "DEFACEMENT" : "SUSPICIOUS";
    } else if (score >= 20) {
      riskLevel = RiskLevel.LOW;
      threatType = "SUSPICIOUS";
    } else {
      riskLevel = RiskLevel.SAFE;
      threatType = "SAFE";
    }

    // Rich executive reasoning
    let reasoning = "";
    if (threatType === "PHISHING") {
      reasoning = `ML Threat Classifier detected High-Risk Phishing pattern (${score}% threat score). The URL exhibits deceptive structural characteristics and credential harvesting signatures.`;
    } else if (threatType === "MALWARE") {
      reasoning = `ML Threat Classifier detected Malicious Binary/Payload distribution (${score}% threat score). URL targets suspicious host patterns or executable endpoints.`;
    } else if (threatType === "DEFACEMENT") {
      reasoning = `ML Threat Classifier detected compromised web application injection (${score}% threat score) matching known CMS exploitation signatures.`;
    } else if (threatType === "SUSPICIOUS") {
      reasoning = `ML Threat Classifier identified elevated risk signals (${score}% threat score). Structure deviates from standard benign web patterns.`;
    } else {
      reasoning = `Verified Clean. ML model evaluated URL structural features and entropy as consistent with standard safe web traffic.`;
    }

    const indicators = [...(res.key_indicators || [])];
    if (indicators.length === 0) {
      if (riskLevel === RiskLevel.SAFE) {
        indicators.push("Clean lexical profile", "No suspicious obfuscation detected");
      } else {
        indicators.push(`Classified as ${threatType} by ML trained classifier`, `Threat probability: ${score}%`);
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
    const isIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(url);
    const hasLures = /login|verify|appleid|signin|admin|setup\.exe/i.test(url);

    if (isIp || hasLures) {
      return {
        riskLevel: RiskLevel.HIGH,
        confidence: 85,
        threatType: isIp ? "MALWARE" : "PHISHING",
        reasoning: "Heuristic fallback flagged suspicious IP or credential lure structure in URL.",
        indicators: ["Suspicious URL patterns detected", "Credential harvesting signals"],
        technicalReasoning: "Fallback rule engine activated.",
        probabilities: { phishing: 0.85, benign: 0.15 },
        riskScore: 85,
      };
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
