export interface PromptTemplateContext {
  payload: string;
  evidence: string;
  ruleVerdict?: {
    ruleScore: number;
    riskLevel: string;
    threatType: string;
    confidence: number;
  };
}

export interface IPromptBuilder {
  build(context: PromptTemplateContext): string;
}
