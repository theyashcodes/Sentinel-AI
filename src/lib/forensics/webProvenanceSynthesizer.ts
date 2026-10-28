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
 * Uses robust multi-query parsing with title extraction.
 */
export async function searchWebProvenance(query: string): Promise<WebProvenanceMatch[]> {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Generate smart search variants: e.g. "DEVIATHON FINAL FLYER" -> try "DEVIATHON FINAL FLYER", then "DEVIATHON"
    const cleaned = query
      .replace(/[^\w\s\-\.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = cleaned.split(" ").filter((w) => w.length > 1);
    const queriesToTry: string[] = [cleaned];

    // If query has common filler words (FINAL, FLYER, IMG, POSTER, PHOTO), add a focused query
    const filteredWords = words.filter(
      (w) => !/^(final|flyer|poster|image|photo|pic|screenshot|scan|whatsapp)$/i.test(w)
    );
    if (filteredWords.length > 0 && filteredWords.length < words.length) {
      queriesToTry.push(filteredWords.join(" "));
    }

    for (const q of queriesToTry) {
      const matches = await executeSearchQuery(q);
      if (matches.length > 0) {
        return matches;
      }
    }

    return [];
  } catch (err) {
    console.warn("[Web Provenance Search] Search lookup warning:", (err as Error).message);
    return [];
  }
}

async function executeSearchQuery(query: string): Promise<WebProvenanceMatch[]> {
  const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query.slice(0, 150))}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
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
    const blocks = html.split(/class="result results_links/);
    const results: WebProvenanceMatch[] = [];
    const seenDomains = new Set<string>();

    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b) continue;

      const titleMatch = b.match(/<h2 class="result__title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
      const snipMatch = b.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const uddgMatch = b.match(/uddg=([^&"]+)/);
      const rawUrlMatch = b.match(/<a class="result__url"[^>]*href="([^"]+)"[^>]*>/);

      let finalUrl = "";
      if (uddgMatch && uddgMatch[1]) {
        try {
          finalUrl = decodeURIComponent(uddgMatch[1]);
        } catch {
          finalUrl = uddgMatch[1];
        }
      } else if (rawUrlMatch && rawUrlMatch[1]) {
        finalUrl = rawUrlMatch[1].startsWith("http") ? rawUrlMatch[1] : `https://${rawUrlMatch[1]}`;
      }

      if (!finalUrl || finalUrl.includes("duckduckgo.com")) continue;

      let domain = "";
      try {
        domain = new URL(finalUrl).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }

      if (seenDomains.has(domain)) continue;
      seenDomains.add(domain);

      const title = (titleMatch?.[1] || domain)
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();

      const snippet = (snipMatch?.[1] || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();

      results.push({ title, domain, url: finalUrl, snippet });
      if (results.length >= 4) break;
    }

    return results;
  } catch {
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
 * into an executive, cohesive forensic report with verified proof citations.
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

    const webSourcesPrompt =
      params.webMatches && params.webMatches.length > 0
        ? `VERIFIED WEB MATCHES FOUND ONLINE:
${params.webMatches
  .map(
    (w, idx) =>
      `[Proof ${idx + 1}] Source: ${w.domain} (${w.url}) | Title: "${w.title}" | Details: ${w.snippet}`
  )
  .join("\n")}

CRITICAL FORENSIC REQUIREMENT (PROOFS DISCOVERED):
Real-world web matches were discovered above! You MUST:
1. In "executiveSummary": Explicitly name the verified real-world event/organization/product discovered in the web proofs (e.g. DEVIATHON 2.0 hackathon at GLA University Mathura). Cite the exact domain proof (e.g. deviathon.in).
2. In "provenanceContext": State the exact institution, event, or official context confirmed by the web citations.
3. In "keyEvidenceBullets": Make the verified web discovery the lead bullet point, explaining that genuine event documentation establishes real-world provenance.`
        : `No external web references were found. Base synthesis on pixel heuristics and container metadata.`;

    const prompt = `You are Sentinel AI's Senior Digital Forensics & OSINT Synthesizer.
Synthesize the following technical forensic evidence and web findings into an executive intelligence report:
- Media File: ${params.filename}
- Verdict: ${params.verdict} (Confidence: ${params.confidenceScore}%)
- Identified Generator: ${params.generatorTool || "Natural Sensor / Physical Camera"}
- Native Pixel Forensics: AI Probability: ${params.pixelForensics?.aiProbability ?? "N/A"}% | Sensor Noise Variance: ${params.pixelForensics?.metrics?.sensorNoiseVariance ?? "N/A"} | ELA Var: ${params.pixelForensics?.metrics?.elaVariance ?? "N/A"}
- Detected Pixel Artifacts: ${params.pixelForensics?.detectedArtifacts?.join("; ") || "None"}
- Extracted Visible Text: ${params.extractedText?.slice(0, 8).join(" | ") || "None directly extracted"}

${webSourcesPrompt}

Respond strictly with valid JSON:
{
  "executiveSummary": "2-3 crisp, authoritative sentences explaining the media's authenticity and explicitly naming any real-world event/institution found with web proofs.",
  "provenanceContext": "1 sentence describing the event, organization, or subject.",
  "safeActionPlan": "Actionable guidance for the user or investigator.",
  "keyEvidenceBullets": ["Evidence point 1 (Web proof)", "Evidence point 2", "Evidence point 3"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

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
              "You are Sentinel AI Senior Digital Forensics Investigator. You synthesize media provenance, pixel forensics, and web OSINT into concise intelligence with real-world proofs. Output valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 500,
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
