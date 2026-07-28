export interface AIAnalysisCost {
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
}

export interface AIAnalysisResponse {
  executiveSummary: string;
  technicalReasoning: string;
  recommendation: string;
  confidence: number;
  analystNotes: string[];
  
  // Provider Metadata
  providerName: string;
  modelName: string;
  inferenceTimeMs: number;
  fallbackReason?: string;
  cost: AIAnalysisCost;
}

export interface IAIProvider {
  name: string;
  model: string;
  analyze(prompt: string, evidence?: unknown): Promise<AIAnalysisResponse>;
}
