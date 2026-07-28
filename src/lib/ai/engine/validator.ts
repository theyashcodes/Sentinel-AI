import { z } from "zod";

export const AIAnalysisResponseSchema = z.object({
  threatCategory: z.enum(["PHISHING", "MALWARE", "SPAM", "SAFE", "UNKNOWN"]),
  confidenceScore: z.number().min(0).max(1),
  reasoning: z.string(),
  indicators: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ParsedAIResponse = z.infer<typeof AIAnalysisResponseSchema>;

export class AIResponseValidator {
  static parse(rawJsonString: string): ParsedAIResponse {
    try {
      const parsed = JSON.parse(rawJsonString);
      return AIAnalysisResponseSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
