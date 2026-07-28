import { aiRegistry } from "../providers/registry";
import { EvidenceProcessor, PreScanEvidence } from "../processors/evidence";
import { RuleEngine } from "../processors/rules";
import { ThreatScoringEngine } from "./scoring";
import { IPromptBuilder } from "../templates/base";
import { RiskLevel } from "@prisma/client";
import { AIAnalysisResponse } from "../providers/base";
import { QRScanWarning } from "@/modules/scanner/qr/types/qr-scanner";

export interface AnalysisRequest {
  payload: string;
  evidence?: PreScanEvidence;
  promptBuilder: IPromptBuilder;
  maxRetries?: number;
  qrSecurityWarnings?: QRScanWarning[];
}

export interface AnalysisResult {
  riskLevel: RiskLevel;
  finalScore: number;
  threatType: string;
  confidence: number;
  aiResponse: AIAnalysisResponse;
  cost: {
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
  };
}

export class ThreatAnalyzer {
  static async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    // 1. Process Evidence
    const processedEvidence = EvidenceProcessor.process(request.evidence || {});

    // 2. Evaluate Heuristics (Rule Engine) FIRST (Source of truth)
    const ruleVerdict = RuleEngine.evaluate({
      payload: request.payload,
      evidence: request.evidence,
      qrSecurityWarnings: request.qrSecurityWarnings
    });

    // 3. Determine Deterministic Threat Output
    const { riskLevel, finalScore, threatType, confidence } = ThreatScoringEngine.calculateFinalRisk(ruleVerdict.score, ruleVerdict.confidence);

    // 4. Build Prompt with structured Rule Engine output
    const prompt = request.promptBuilder.build({
      payload: request.payload,
      evidence: processedEvidence,
      // Inject deterministic results so prompt builder can include them
      ruleVerdict: { ruleScore: ruleVerdict.score, riskLevel, threatType, confidence }
    });

    // 5. Call AI Provider with Fallback Logic
    let aiResponse: AIAnalysisResponse | undefined;
    const primaryProvider = aiRegistry.getActive();
    
    try {
      // Primary attempt
      console.log(`\nAnalyzer:\nAttempting ${primaryProvider.name}...`);
      aiResponse = await primaryProvider.analyze(prompt, request.evidence);
      console.log(`${primaryProvider.name} succeeded.`);
    } catch (error) {
      console.log(`${primaryProvider.name} failed.`);
      console.error(`Exact error message:`, error instanceof Error ? error.message : error);
      
      // Fallback attempt
      console.log(`Falling back to Local Provider.`);
      const fallbackProvider = aiRegistry.get("LOCAL");
      if (fallbackProvider && fallbackProvider.name !== primaryProvider.name) {
        try {
          aiResponse = await fallbackProvider.analyze(prompt, request.evidence);
          aiResponse.fallbackReason = error instanceof Error ? error.message : "Unknown error";
        } catch {
          throw new Error("Both Primary and Fallback AI Providers failed.");
        }
      } else {
        throw new Error("Primary AI Provider failed and no suitable fallback was found.");
      }
    }

    if (!aiResponse) {
      throw new Error("AI response is undefined despite successful execution.");
    }

    return {
      riskLevel,
      finalScore,
      threatType,
      confidence,
      aiResponse,
      cost: aiResponse.cost
    };
  }
}
