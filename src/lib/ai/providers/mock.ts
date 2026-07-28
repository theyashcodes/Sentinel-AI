import { IAIProvider, AIAnalysisResponse } from "./base";

export class MockProvider implements IAIProvider {
  name = "MOCK_PROVIDER";
  model = "mock-model-v1";

  async analyze(prompt: string, evidence?: unknown): Promise<AIAnalysisResponse> {
    // Artificial delay to simulate network request
    await new Promise(resolve => setTimeout(resolve, 800));

    // Deterministic mock logic based on simple keywords
    const isPhishing = prompt.toLowerCase().includes("phishing") || prompt.includes("suspicious");
    
    let confidence = 50;
    try {
      const match = prompt.match(/"confidence":\s*(\d+)/);
      if (match && match[1]) confidence = parseInt(match[1], 10);
    } catch (e) {}

    const startTime = Date.now();
    
    return {
      executiveSummary: isPhishing 
        ? "Mock summary: Phishing keywords detected." 
        : "Mock summary: No malicious patterns detected.",
      technicalReasoning: "Mocked technical reasoning based on prompt contents.",
      recommendation: isPhishing ? "Block this URL." : "Allow this URL.",
      confidence,
      analystNotes: [
        "This is a mocked response.",
        isPhishing ? "Found suspicious keywords." : "Looks clean."
      ],
      providerName: this.name,
      modelName: this.model,
      inferenceTimeMs: Date.now() - startTime,
      cost: {
        promptTokens: 150,
        completionTokens: 45,
        estimatedCostUsd: 0.0002
      }
    };
  }
}
