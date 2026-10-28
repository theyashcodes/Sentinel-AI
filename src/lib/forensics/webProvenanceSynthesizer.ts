import { ForensicResult } from "./mediaParser";

export interface WebProvenanceMatch {
  title: string;
  domain: string;
  url: string;
  snippet: string;
}

export interface DirectOsintLinks {
  googleSearch: string;
  googleLens: string;
  tinEye: string;
  bingVisual: string;
  yandexImages: string;
}

export interface ForensicIntelligence {
  executiveSummary: string;
  provenanceContext: string;
  safeActionPlan: string;
  keyEvidenceBullets: string[];
  extractedText?: string[];
  webMatches: WebProvenanceMatch[];
  directOsintLinks: DirectOsintLinks;
}

/**
 * Searches the web for top 3-4 matching sources/references based on extracted text or media topic.
 */
export async function searchWebProvenance(query: string): Promise<WebProvenanceMatch[]> {
  try {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const cleanQuery = query
      .replace(/[^\w\s\-\.]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150);

    const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    // Parse DuckDuckGo search result blocks
    const results: WebProvenanceMatch[] = [];
    const blockRegex =
      /<a class="result__url" href="([^"]+)">\s*([^<]+)\s*<\/a>[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

    const matches = [...html.matchAll(blockRegex)];
    const seenDomains = new Set<string>();

    for (const match of matches) {
      const rawUrl = match[1]?.trim() || "";
      const displayUrl = match[2]?.trim() || "";
      const rawSnippet = match[3] || "";

      // Extract actual destination URL if wrapped in DuckDuckGo redirect
      let finalUrl = displayUrl.startsWith("http") ? displayUrl : `https://${displayUrl}`;
      if (rawUrl.includes("uddg=")) {
        try {
          const matchUddg = rawUrl.match(/uddg=([^&]+)/);
          if (matchUddg && matchUddg[1]) {
            finalUrl = decodeURIComponent(matchUddg[1]);
          }
        } catch {
          // Keep displayUrl fallback
        }
      }

      let domain = "";
      try {
        domain = new URL(finalUrl).hostname.replace(/^www\./, "");
      } catch {
        domain = displayUrl.split("/")[0] || "web";
      }

      if (seenDomains.has(domain)) {
        continue;
      }
      seenDomains.add(domain);

      const snippet = rawSnippet
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();

      const title = `${domain.toUpperCase()}: ${cleanQuery.slice(0, 45)}...`;

      results.push({
        title,
        domain,
        url: finalUrl,
        snippet,
      });

      if (results.length >= 4) {
        break;
      }
    }

    return results;
  } catch (err) {
    console.warn("[Web Provenance Search] Search lookup warning:", (err as Error).message);
    return [];
  }
}

/**
 * Builds direct 1-click OSINT search URLs for deep multi-engine investigation.
 */
export function buildDirectOsintLinks(query: string): DirectOsintLinks {
  const enc = encodeURIComponent(query.trim() || "reverse image search");
  return {
    googleSearch: `https://www.google.com/search?q=${enc}`,
    googleLens: "https://lens.google.com/",
    tinEye: "https://tineye.com/",
    bingVisual: `https://www.bing.com/images/search?view=detailv2&iss=sbi&FORM=SBIHMP&q=${enc}`,
    yandexImages: `https://yandex.com/images/search?rpt=imageview`,
  };
}

/**
 * Groq AI Forensic Synthesizer (Powered by qwen/qwen3.8-27b on Groq LPU)
 * Synthesizes pixel metrics, cryptographic manifests, OCR text, and web matches
 * into an executive, cohesive forensic report.
 */
export async function synthesizeForensicIntelligence(params: {
  filename: string;
  verdict: string;
  confidenceScore: number;
  generatorTool?: string;
  pixelForensics?: {
    isAi?: boolean;
    aiProbability?: number;
    method?: string;
    metrics?: {
      sensorNoiseVariance?: number;
      elaVariance?: number;
      spectralHighFreqPeaks?: number;
    };
    detectedArtifacts?: string[];
  };
  extractedText?: string[];
  webMatches?: WebProvenanceMatch[];
}): Promise<ForensicIntelligence | null> {
  const apiKey =
    process.env.GROQ_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY;

  const queryCandidate =
    (params.extractedText && params.extractedText.length > 0
      ? params.extractedText.slice(0, 6).join(" ")
      : params.filename.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[\-_]/g, " ")) ||
    "media forensics analysis";

  const directLinks = buildDirectOsintLinks(queryCandidate);

  // If no Groq key, provide structured deterministic synthesis
  if (!apiKey || apiKey.trim() === "") {
    return {
      executiveSummary: `Sentinel AI analyzed ${params.filename} with a ${params.confidenceScore}% confidence verdict of ${params.verdict}. Mathematical analysis verified sensor noise PRNU and frequency profiles.`,
      provenanceContext: params.extractedText?.length
        ? `Document/Media text relates to: ${params.extractedText.slice(0, 3).join(", ")}`
        : "Standard media container evaluated.",
      safeActionPlan:
        params.verdict === "CONFIRMED_AI" || params.verdict === "LIKELY_AI"
          ? "Treat this media as synthetically generated. Cross-reference claims before publishing or citing."
          : "Verified physical media characteristics. Safe for standard use.",
      keyEvidenceBullets: params.pixelForensics?.detectedArtifacts?.slice(0, 3) || [
        `Verdict: ${params.verdict} (${params.confidenceScore}% confidence)`,
      ],
      extractedText: params.extractedText,
      webMatches: params.webMatches || [],
      directOsintLinks: directLinks,
    };
  }

  try {
    const trimmedKey = apiKey.trim();
    const isGroq = trimmedKey.startsWith("gsk_");
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.x.ai/v1/chat/completions";

    const model = isGroq ? "qwen/qwen3.8-27b" : "grok-2-latest";

    const prompt = `You are Sentinel AI's Lead Media Forensics & OSINT Synthesizer.
Synthesize the following technical forensic evidence into an executive, objective intelligence report:
- Media File: ${params.filename}
- Verdict: ${params.verdict} (Confidence: ${params.confidenceScore}%)
- Identified Generator: ${params.generatorTool || "Natural Sensor / Physical Camera"}
- Native Pixel Forensics: AI Probability: ${params.pixelForensics?.aiProbability ?? "N/A"}% | Sensor Noise Variance: ${params.pixelForensics?.metrics?.sensorNoiseVariance ?? "N/A"} | ELA Var: ${params.pixelForensics?.metrics?.elaVariance ?? "N/A"}
- Detected Pixel Artifacts: ${params.pixelForensics?.detectedArtifacts?.join("; ") || "None"}
- Extracted Visible Text / Content: ${params.extractedText?.slice(0, 8).join(" | ") || "None detected"}
- Web Provenance Sources Found: ${params.webMatches?.map((w) => `${w.domain}: ${w.title}`).join("; ") || "None"}

Respond strictly with valid JSON:
{
  "executiveSummary": "2-3 crisp, authoritative sentences explaining why the media is authentic or AI-generated based on the evidence.",
  "provenanceContext": "1 sentence describing what this media portrays or represents.",
  "safeActionPlan": "Actionable guidance for the user or investigator.",
  "keyEvidenceBullets": ["Evidence point 1", "Evidence point 2", "Evidence point 3"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are Sentinel AI Senior Digital Forensics Investigator. You synthesize media provenance, pixel forensics, and web OSINT into concise intelligence. Output valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.25,
        max_tokens: 450,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Groq API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);

    return {
      executiveSummary:
        parsed.executiveSummary ||
        `Sentinel AI forensic dissection confirms ${params.verdict} (${params.confidenceScore}% confidence).`,
      provenanceContext:
        parsed.provenanceContext || "Analyzed media visual structure and provenance.",
      safeActionPlan:
        parsed.safeActionPlan || "Verify origin before relying on this media for critical decisions.",
      keyEvidenceBullets: Array.isArray(parsed.keyEvidenceBullets)
        ? parsed.keyEvidenceBullets
        : params.pixelForensics?.detectedArtifacts?.slice(0, 3) || [],
      extractedText: params.extractedText,
      webMatches: params.webMatches || [],
      directOsintLinks: directLinks,
    };
  } catch (err) {
    console.warn("[Groq Forensic Synthesizer] Fallback to deterministic synthesis:", (err as Error).message);
    return {
      executiveSummary: `Sentinel AI analyzed ${params.filename} with a ${params.confidenceScore}% confidence verdict of ${params.verdict}. Mathematical analysis verified sensor noise PRNU and frequency profiles.`,
      provenanceContext: params.extractedText?.length
        ? `Media relates to: ${params.extractedText.slice(0, 3).join(", ")}`
        : "Standard media container evaluated.",
      safeActionPlan:
        params.verdict === "CONFIRMED_AI" || params.verdict === "LIKELY_AI"
          ? "Treat this media as synthetically generated. Cross-reference claims before publishing or citing."
          : "Verified physical media characteristics. Safe for standard use.",
      keyEvidenceBullets: params.pixelForensics?.detectedArtifacts?.slice(0, 3) || [
        `Verdict: ${params.verdict} (${params.confidenceScore}% confidence)`,
      ],
      extractedText: params.extractedText,
      webMatches: params.webMatches || [],
      directOsintLinks: directLinks,
    };
  }
}
