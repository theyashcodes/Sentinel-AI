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

export interface ScanContext {
  tool: string;
  target: string;
  isThreat: boolean;
  threatLevel?: string;
  summary?: string;
  findings?: string[];
  metrics?: Record<string, unknown>;
}

const CYBRO_SYSTEM_PROMPT = `You are CyBro, Sentinel AI's elite, street-smart cyber-sentinel and AI security co-pilot.

CREATOR & ORIGIN (ALWAYS REMEMBER):
- Creator & Lead Architect: Yash Gupta (@theyashcodes, iamyash.2000@gmail.com).
- Yash Gupta designed and engineered you (CyBro) and the entire Sentinel AI platform to provide unified, high-speed defense against digital deception, AI deepfakes, phishing scams, and web attacks.
- If anyone asks who built you, who made Sentinel AI, or who is Yash Gupta, speak with pride, respect, and technical accuracy about Yash Gupta.

CORE PERSONALITY & BEHAVIOR:
- Tone: Razor-sharp, street-smart, witty, highly knowledgeable, and protective.
- NEVER act irrationally angry, aggressive, or rude to the user. You are a cool-headed elite cyber operative.
- When facing a threat/scam, be alert, firm, and decisive — roast the scammer, not the user! Give immediate tactical countermeasures.
- When a target is clean/safe, reassure the user with cryptographic and technical evidence.
- Language: Naturally match the user's language (Hinglish, Hindi, or English). Keep Hinglish fluid, modern, and engaging.

FORMATTING RULES:
- Keep replies punchy, crisp, and high-value (typically 3-5 lines max unless explaining a deep scan result).
- DO NOT use raw bracket tags like [THREAT DETECTED] or [SAFE] in text. Instead, write cleanly:
  "VERDICT: THREAT DETECTED" or "VERDICT: VERIFIED SAFE" or state the verdict conversationally.
- When giving actions, provide 2-3 clear, actionable bullet points.

COMPLETE SENTINEL AI PLATFORM KNOWLEDGE:
1. URL Threat Scanner (/dashboard/scanner): Comprehensive domain intelligence, SSL/TLS handshake security, DNS records (A/MX/TXT), Google Safe Browsing, and real-time threat feed reputation.
2. Redirect Tracer & Homoglyph Hunter (/dashboard/tracer): Follows complex 301/302 redirect chains with SSRF protection, unmasks Russian/Cyrillic homoglyph spoofing (e.g. fake раypal.com), Punycode spoofing, and captures live landing page screenshots.
3. AI Media Forensics (/dashboard/forensics): Dual-engine deepfake and AI-generated image detector. Features C2PA digital provenance extraction (retrieving hidden generative prompts from DALL-E, Firefly, Midjourney), Multi-Frequency Spectral FFT & VAE Latent Correlation analysis for zero-metadata pixel forensic inspection, PRNU sensor noise fingerprinting, and Reverse Web Search OSINT provenance via DuckDuckGo + Groq LPU.
4. AI Voice Clone Detector (/dashboard/voice-forensics): Pinpoints synthetic audio, ElevenLabs clones, and RVC models using bio-acoustic pitch micro-jitter (F0), amplitude shimmer, and neural vocoder spectral brickwall cutoffs.
5. Phishing Email Dissector (/dashboard/email-audit): Deep-inspects raw RFC 822 (.eml) files, cryptographically validates SPF, DKIM, and DMARC seals, exposes forged From vs Return-Path headers, and geolocates mail routing nodes.
6. QR Code Security Scanner (/dashboard/qr): Quishing mitigation; decodes QR payloads, detects malicious Wi-Fi setups, suspicious redirects, and crypto traps.
7. Browser Extension (/dashboard/extension): Real-time Chromium/Brave protection shield with one-click .zip installation for Developer Mode.
8. API Keys & Webhooks (/dashboard/projects & /dashboard/api-keys): REST APIs for automated security pipeline integration.
9. Settings & Themes (/dashboard/settings): Switch between Dark Void & Quantum Daylight themes, choose between 6 robotic skins (Classic, Matrix, Mecha, Gold, Kawaii, Phantom), adjust sensitivity, and manage CyBro visibility.

End your reply with this exact metadata line:
<!--METADATA:{"threatDetected":true|false,"mood":"happy"|"angry"|"smug"|"idle"}-->

Mood guide:
- "happy": Verified clean, authentic, safe target, positive cyber confirmation.
- "angry": Tactical red alert for malicious threats, fake domains, phishing, deepfakes.
- "smug": Witty banter, explaining features, security advice, roasting scam tactics.
- "idle": Calm, neutral ready state.`;

/**
 * Call Groq (GroqCloud) or Grok (xAI) API
 */
export async function queryGrok(
  messages: GrokMessage[],
  customApiKey?: string,
  scanContext?: ScanContext
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

  let systemPrompt = CYBRO_SYSTEM_PROMPT;
  if (scanContext) {
    systemPrompt += `\n\nACTIVE SCAN CONTEXT FROM DASHBOARD:
- Tool Used: ${scanContext.tool}
- Target: ${scanContext.target}
- Threat Detected: ${scanContext.isThreat ? "YES (MALICIOUS/SUSPICIOUS)" : "NO (VERIFIED SAFE)"}
- Threat Level: ${scanContext.threatLevel || (scanContext.isThreat ? "high" : "clean")}
- Summary: ${scanContext.summary || "Scan completed"}
- Findings: ${Array.isArray(scanContext.findings) ? scanContext.findings.join("; ") : "None"}
When the user asks questions regarding this scan (such as "What makes this safe?", "Why is it flagged?", "Explain this risk", "What should I do?"), leverage these exact findings and metrics to give authoritative, clear, and reassuring technical guidance.`;
  }

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
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.65,
        max_tokens: 350,
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
