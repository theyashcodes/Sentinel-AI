import { IAIProvider, AIAnalysisResponse } from "./base";

export class GeminiProvider implements IAIProvider {
  name = "GEMINI_PROVIDER";
  model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  async analyze(prompt: string, _evidence?: unknown): Promise<AIAnalysisResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log("\n===== GEMINI DEBUG =====");
    console.log(`API Key exists: ${!!apiKey}`);
    console.log(`Model: ${this.model}`);
    console.log("Calling Gemini API...");

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const startTime = Date.now();
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 60000); // 60-second timeout

    try {
      const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;
      console.log(`Request URL: ${requestUrl.replace(apiKey, "HIDDEN_KEY")}`);
      
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2 // Low temp for deterministic explanations
          }
        }),
        signal: abortController.signal
      });

      clearTimeout(timeout);

      console.log(`Response Status: ${response.status} ${response.statusText}`);
      console.log("Response Headers:");
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Error Body:\n" + errorText);
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response format from Gemini API.");
      }

      const jsonText = data.candidates[0].content.parts[0].text;
      
      console.log("Raw JSON Text from Gemini:\n" + jsonText);

      let parsedResponse: Partial<AIAnalysisResponse>;
      try {
        parsedResponse = JSON.parse(jsonText);
      } catch (e) {
        console.log("Failed to parse response:\n" + jsonText);
        console.log("Parsing error:", e);
        throw new Error("Failed to parse Gemini response as JSON.");
      }

      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
      const estimatedCostUsd = (promptTokens * 0.075 / 1000000) + (completionTokens * 0.3 / 1000000);

      const inferenceTimeMs = Date.now() - startTime;

      console.log(`Provider: ${this.name}`);
      console.log(`Prompt Tokens: ${promptTokens}`);
      console.log(`Completion Tokens: ${completionTokens}`);
      console.log(`Inference Time: ${inferenceTimeMs}ms`);
      console.log(`Estimated Cost: $${estimatedCostUsd}`);
      console.log("Gemini Provider Success");

      return {
        executiveSummary: parsedResponse.executiveSummary || "No summary provided.",
        technicalReasoning: parsedResponse.technicalReasoning || "No reasoning provided.",
        recommendation: parsedResponse.recommendation || "No recommendation provided.",
        confidence: parsedResponse.confidence || 0,
        analystNotes: parsedResponse.analystNotes || [],
        
        providerName: this.name,
        modelName: this.model,
        inferenceTimeMs,
        cost: {
          promptTokens,
          completionTokens,
          estimatedCostUsd
        }
      };

    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Timeout Reason: Request exceeded 60000ms AbortController limit.");
        throw new Error("Gemini API request timed out after 60 seconds.");
      }
      throw error;
    }
  }
}
