import * as dotenv from 'dotenv';
dotenv.config();

import { GeminiProvider } from '../src/lib/ai/providers/gemini';
import { UrlScannerPromptBuilder } from '../src/lib/ai/templates/url-scanner';
import { EvidenceGatherer } from '../src/lib/scanner/url/gatherer';
import { EvidenceProcessor } from '../src/lib/ai/processors/evidence';
import { RuleEngine } from '../src/lib/ai/processors/rules';
import { ThreatScoringEngine } from '../src/lib/ai/engine/scoring';

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

  console.log("Prompt Length:", prompt.length);

  const provider = new GeminiProvider();
  
  try {
    const start = Date.now();
    console.log("Calling GeminiProvider.analyze()...");
    const response = await provider.analyze(prompt, evidence);
    console.log(`Success in ${Date.now() - start}ms:`, JSON.stringify(response, null, 2));
  } catch (err: any) {
    console.error("Error from provider:", err.message);
  }
}

runTest();
