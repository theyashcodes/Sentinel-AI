import * as dotenv from 'dotenv';
dotenv.config();

import { UrlScannerPromptBuilder } from '../src/lib/ai/templates/url-scanner';
import { EvidenceGatherer } from '../src/lib/scanner/url/gatherer';
import { EvidenceProcessor } from '../src/lib/ai/processors/evidence';
import { RuleEngine } from '../src/lib/ai/processors/rules';
import { ThreatScoringEngine } from '../src/lib/ai/engine/scoring';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No GEMINI_API_KEY in .env");
  process.exit(1);
}

const model = "gemini-2.5-flash";
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

async function runTest() {
  const url = "https://google.com";
  console.log(`Gathering evidence for ${url}...`);
  const evidence = await EvidenceGatherer.gather(url, "google.com");
  const processedEvidence = EvidenceProcessor.process(evidence);

  const ruleScore = RuleEngine.evaluate({
    payload: url,
    evidence: evidence
  });

  const { riskLevel, threatType, confidence } = ThreatScoringEngine.calculateFinalRisk(ruleScore.score, ruleScore.confidence);

  const promptBuilder = new UrlScannerPromptBuilder();
  const prompt = promptBuilder.build({
    payload: url,
    evidence: processedEvidence,
    ruleVerdict: { ruleScore: ruleScore.score, riskLevel, threatType, confidence }
  });

  console.log("Endpoint URL:", apiKey ? endpoint.replace(apiKey, "HIDDEN_KEY") : endpoint);
  
  const bodyData = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  };
  
  console.log("Request Body:", JSON.stringify(bodyData, null, 2));

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 30000);

  try {
    const fetchStart = Date.now();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);
    
    console.log(`\nTotal Request Time: ${Date.now() - fetchStart}ms`);
    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    console.log("Response Headers:");
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    const text = await response.text();
    console.log("\nRaw Response Body:");
    console.log(text);
    
  } catch (err) {
    clearTimeout(timeoutId);
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`\nFetch failed: ${error.message}`);
    if (error.name === 'AbortError') {
      console.error("The request timed out after 30 seconds.");
    }
  }
}

runTest();
