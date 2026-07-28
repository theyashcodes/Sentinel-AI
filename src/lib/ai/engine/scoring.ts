import { RiskLevel } from "@prisma/client";

export class ThreatScoringEngine {
  /**
   * Determines final risk level, threat type, and confidence based on heuristic rule engine output.
   * @param ruleScore Heuristic score from 0 to 100
   * @param ruleConfidence Heuristic confidence score from 0 to 100
   */
  static calculateFinalRisk(ruleScore: number, ruleConfidence: number): { riskLevel: RiskLevel, finalScore: number, threatType: string, confidence: number } {
    const finalScore = Math.min(Math.max(ruleScore, 0), 100);
    const confidence = Math.min(Math.max(ruleConfidence, 0), 100);
    
    let riskLevel: RiskLevel = RiskLevel.UNKNOWN;
    let threatType = "SAFE";
    
    // Final classifications based on explicit risk bands:
    // 0–20 SAFE
    // 21–40 LOW
    // 41–60 MEDIUM
    // 61–80 HIGH
    // 81–100 CRITICAL
    
    if (finalScore <= 20) {
      riskLevel = RiskLevel.SAFE;
      threatType = "SAFE";
    } else if (finalScore <= 40) {
      riskLevel = RiskLevel.LOW;
      threatType = "SUSPICIOUS";
    } else if (finalScore <= 60) {
      riskLevel = RiskLevel.MEDIUM;
      threatType = "SUSPICIOUS";
    } else if (finalScore <= 80) {
      riskLevel = RiskLevel.HIGH;
      threatType = "PHISHING";
    } else {
      riskLevel = RiskLevel.CRITICAL;
      threatType = "PHISHING";
    }

    return { riskLevel, finalScore, threatType, confidence };
  }
}
