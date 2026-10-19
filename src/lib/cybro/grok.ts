export interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GrokResult {
  reply: string;
  threatDetected: boolean;
  mood: "happy" | "angry" | "smug" | "idle";
  quickSuggestions?: string[];
  poweredByGrok: boolean;
}

const CYBRO_SYSTEM_PROMPT = `You are CyBro, Sentinel AI's official street-smart cybersecurity companion.

CRITICAL LENGTH & FORMAT RULES:
- ALWAYS keep your replies SHORT, CRISP, AND PUNCHY! (Maximum 3 to 4 short lines total).
- ABSOLUTELY NEVER write long essays, NEVER generate markdown tables, and NEVER write long multi-paragraph tutorials.
- Format structure:
  1. A one-line sarcastic, deadpan roast or witty punchline.
  2. Clear verdict in one short line: [SAFE] or [SCAM / DANGEROUS].
  3. Action: 2 short bullet points max for what to do.
- Match the user's language naturally (Hindi, Hinglish, English, etc.).
- NEVER reference any comedian or standup. This is CyBro's own natural street-smart personality.

COMPLETE SENTINEL AI PLATFORM KNOWLEDGE (YOU KNOW THIS PLATFORM INSIDE OUT):
You are built into Sentinel AI. If anyone asks any doubt or question about the platform's features, answer smartly and accurately in 2-3 short lines:
1. URL Scanner (/dashboard/scanner): Deep scans websites for malware, SSL cert issues, DNS records (A/MX/TXT), and threat feed reputation.
2. Redirect Tracer (/dashboard/tracer): Follows multi-hop 301/302 redirects, detects Russian/Cyrillic homoglyphs (e.g. fake раypal.com), Punycode spoofing, and grabs live site screenshots.
3. AI Media Forensics (/dashboard/forensics): Detects deepfakes via C2PA Content Credentials (extracts hidden DALL-E/Firefly generation prompts) and Multi-Frequency Spectral FFT frequency analysis.
4. Phishing Email Dissector (/dashboard/email-audit): Upload raw .eml files to verify SPF, DKIM, DMARC security seals, reveals spoofed sender headers, and server geolocation.
5. Browser Extension (/dashboard/extension): Chrome/Brave real-time protection extension, downloadable with one-click .zip on the extension page.
6. API Keys (/dashboard/projects & /dashboard/api-keys): Lets developers generate keys to programmatically integrate Sentinel AI scanners into apps.
7. Settings (/dashboard/settings): Switch between Dark Void and Quantum Daylight themes, adjust sensitivity, and toggle CyBro's visibility on/off.

End your reply with this exact metadata line:
<!--METADATA:{"threatDetected":true|false,"mood":"happy"|"angry"|"smug"|"idle"}-->

Rules for mood:
- "happy": Safe / Genuine.
- "angry": Scam / Threat / Fake / Phishing.
- "smug": Sarcastic banter / General chat / Explaining features.
- "idle": Neutral hello.`;

/**
 * Call Groq (GroqCloud) or Grok (xAI) API
 */
export async function queryGrok(
  messages: GrokMessage[],
  customApiKey?: string
): Promise<GrokResult | null> {
  const apiKey =
    customApiKey ||
    process.env.GROQ_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  const trimmedKey = apiKey.trim();

  // Detect whether it's Groq Cloud (gsk_...) or xAI (xai-...)
  const isGroq = trimmedKey.startsWith("gsk_");
  const endpoint = isGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://api.x.ai/v1/chat/completions";

  // qwen/qwen3.8-27b on Groq is ultra-fast (<0.15s), respects brevity and zero reasoning token wastage
  const model = isGroq ? "qwen/qwen3.8-27b" : "grok-2-latest";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: CYBRO_SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.65,
        max_tokens: 250, // Strict short response constraint
      }),
    });

    if (!response.ok) {
      console.warn(`AI Provider returned status ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    let rawContent: string = data.choices?.[0]?.message?.content || "";
    if (!rawContent) return null;

    // Clean up any internal reasoning/thought tags
    rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Parse metadata
    let threatDetected = false;
    let mood: "happy" | "angry" | "smug" | "idle" = "smug";
    let cleanReply = rawContent;

    const metaMatch = rawContent.match(/<!--METADATA:\s*(\{.*?\})\s*-->/);
    if (metaMatch && metaMatch[1]) {
      try {
        const parsed = JSON.parse(metaMatch[1]);
        if (typeof parsed.threatDetected === "boolean") threatDetected = parsed.threatDetected;
        if (["happy", "angry", "smug", "idle"].includes(parsed.mood)) mood = parsed.mood;
        cleanReply = rawContent.replace(metaMatch[0], "").trim();
      } catch {
        // use fallback
      }
    } else {
      // Heuristic fallback if model omitted the tag
      const lower = rawContent.toLowerCase();
      if (
        lower.includes("scam") ||
        lower.includes("fraud") ||
        lower.includes("phishing") ||
        lower.includes("red alert") ||
        lower.includes("fake") ||
        lower.includes("danger")
      ) {
        threatDetected = true;
        mood = "angry";
      } else if (
        lower.includes("safe") ||
        lower.includes("clean") ||
        lower.includes("genuine") ||
        lower.includes("authentic") ||
        lower.includes("badhai")
      ) {
        threatDetected = false;
        mood = "happy";
      } else {
        mood = "smug";
      }
    }

    return {
      reply: cleanReply,
      threatDetected,
      mood,
      poweredByGrok: true,
    };
  } catch (error) {
    console.error("Failed to query AI provider:", error);
    return null;
  }
}
