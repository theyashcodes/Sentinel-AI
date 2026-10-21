// Sentinel AI • Intelligent Shady URL & Category Analyzer
// Real-time classification for Gambling, Adult, Piracy, and Crypto Scams
// Incorporates instant local heuristics + Groq AI Deep Verification

export interface CategoryAuditResult {
  isShady: boolean;
  category: "CLEAN" | "GAMBLING" | "ADULT_NSFW" | "PIRACY_MALWARE" | "CRYPTO_SCAM" | "SUSPICIOUS";
  categoryLabel: string;
  categoryIcon: string;
  riskScore: number;
  threatDescription?: string;
  detectedBy: "WHITELIST" | "RULE_ENGINE" | "GROQ_AI" | "BASELINE";
}

// In-memory LRU-like cache (max 1000 items) to prevent redundant AI queries and ensure 0ms lookup
const categoryCache = new Map<string, { result: CategoryAuditResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Global Top Safe Whitelist (Never hit AI, immediate 0 score)
const SAFE_WHITELIST_DOMAINS = new Set([
  "google.com", "google.co.in", "youtube.com", "github.com", "microsoft.com",
  "apple.com", "amazon.com", "amazon.in", "wikipedia.org", "linkedin.com",
  "twitter.com", "x.com", "instagram.com", "facebook.com", "cloudflare.com",
  "vercel.app", "vercel.com", "stackoverflow.com", "reddit.com", "netflix.com",
  "spotify.com", "zoom.us", "chatgpt.com", "openai.com", "bing.com",
  "yahoo.com", "medium.com", "gitlab.com", "bitbucket.org", "dropbox.com",
  "notion.so", "figma.com", "canva.com", "adobe.com", "whatsapp.com",
  "telegram.org", "discord.com", "twitch.tv", "quora.com", "pinterest.com"
]);

// 1. Gambling & Betting keywords and prominent domains
const GAMBLING_PATTERNS = [
  "1xbet", "bet365", "stake.com", "parimatch", "betway", "dafabet", "melbet",
  "mostbet", "dream11", "bwin", "betfair", "pokerstars", "888casino", "roobet",
  "rollbit", "bc.game", "bet9ja", "betking", "sportsbet", "winzo", "mpl.live",
  "satta", "matka", "dpboss", "kalyanmatka", "casino", "gambling", "betting",
  "jackpot", "roulette", "blackjack", "baccarat", "sportsbook", "bookmaker",
  "wager", "teer", "rummy", "teenpatti", "aviator-game", "crash-game", "slots"
];

// 2. Adult, NSFW & Explicit keywords and domains
const ADULT_PATTERNS = [
  "pornhub", "xvideos", "xnxx", "xhamster", "redtube", "youporn", "chaturbate",
  "stripchat", "onlyfans", "brazzers", "eporner", "spankbang", "cam4", "camsoda",
  "livejasmin", "fapello", "hqporner", "porn", "xxx", "erotic", "hentai",
  "escort", "nude", "nsfw", "camgirl", "adultwork", "sexvid", "tube8"
];

// 3. Piracy, Torrents, Cracked Softwares & Modded APKs
const PIRACY_PATTERNS = [
  "1337x", "thepiratebay", "piratebay", "yts.mx", "rarbg", "fitgirl-repacks",
  "dodi-repacks", "fmovies", "soap2day", "bflix", "aniwave", "9anime", "gogoanime",
  "zoro.to", "streamtape", "moddroid", "apkmody", "happymod", "torrent",
  "torrents", "warez", "keygen", "cracked", "modapk", "apkmod", "repack"
];

// 4. Crypto Drains & Fake Airdrops
const CRYPTO_FRAUD_PATTERNS = [
  "claim-airdrop", "airdrop-claim", "connect-wallet", "wallet-connect", "drainer",
  "seedphrase", "trustwallet-claim", "metamask-claim", "solana-airdrop",
  "eth-giveaway", "free-crypto-doubler"
];

export class CategoryAnalyzer {
  /**
   * Main entry point to classify URL safety and identify shady domains
   */
  static async analyze(hostname: string, pathname: string, fullUrl: string): Promise<CategoryAuditResult> {
    const lowerHost = hostname.toLowerCase().trim();
    const lowerPath = pathname.toLowerCase().trim();
    const cacheKey = `${lowerHost}${lowerPath.slice(0, 30)}`;

    // Check Memory Cache
    const cached = categoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }

    // Check Safe Whitelist (0ms)
    for (const safeDomain of SAFE_WHITELIST_DOMAINS) {
      if (lowerHost === safeDomain || lowerHost.endsWith(`.${safeDomain}`)) {
        const result: CategoryAuditResult = {
          isShady: false,
          category: "CLEAN",
          categoryLabel: "Verified Legitimate Platform",
          categoryIcon: "✓",
          riskScore: 0,
          detectedBy: "WHITELIST",
        };
        this.setCache(cacheKey, result);
        return result;
      }
    }

    // Check Level 1: Gambling Pattern Match (0ms)
    const combinedString = `${lowerHost} ${lowerPath}`;
    for (const pattern of GAMBLING_PATTERNS) {
      if (lowerHost.includes(pattern) || lowerPath.includes(`/${pattern}`) || lowerPath.includes(`-${pattern}`)) {
        const result: CategoryAuditResult = {
          isShady: true,
          category: "GAMBLING",
          categoryLabel: "Online Gambling & High Financial Risk",
          categoryIcon: "🎰",
          riskScore: 70,
          threatDescription: `Unregulated Online Gambling & Betting platform detected ("${pattern}"). High risk of financial loss, aggressive tracking, and unverified payouts.`,
          detectedBy: "RULE_ENGINE",
        };
        this.setCache(cacheKey, result);
        return result;
      }
    }

    // Check Level 2: Adult / NSFW Pattern Match (0ms)
    for (const pattern of ADULT_PATTERNS) {
      if (lowerHost.includes(pattern) || lowerPath.includes(`/${pattern}`) || lowerPath.includes(`-${pattern}`)) {
        const result: CategoryAuditResult = {
          isShady: true,
          category: "ADULT_NSFW",
          categoryLabel: "Adult / Explicit Content",
          categoryIcon: "🔞",
          riskScore: 65,
          threatDescription: `Adult/NSFW explicit platform detected ("${pattern}"). High concentration of malicious redirect ad-networks and unverified script telemetry.`,
          detectedBy: "RULE_ENGINE",
        };
        this.setCache(cacheKey, result);
        return result;
      }
    }

    // Check Level 3: Piracy & Modded Downloads Pattern Match (0ms)
    for (const pattern of PIRACY_PATTERNS) {
      if (lowerHost.includes(pattern) || lowerPath.includes(`/${pattern}`) || lowerPath.includes(`-${pattern}`)) {
        const result: CategoryAuditResult = {
          isShady: true,
          category: "PIRACY_MALWARE",
          categoryLabel: "Piracy & Suspicious Downloads",
          categoryIcon: "☠️",
          riskScore: 78,
          threatDescription: `Illegal Pirated Media or Cracked Software repository detected ("${pattern}"). Extreme risk of trojanized executables, keyloggers, and drive-by malware.`,
          detectedBy: "RULE_ENGINE",
        };
        this.setCache(cacheKey, result);
        return result;
      }
    }

    // Check Level 4: Crypto Drainers & Airdrop Scams (0ms)
    for (const pattern of CRYPTO_FRAUD_PATTERNS) {
      if (lowerHost.includes(pattern) || lowerPath.includes(`/${pattern}`) || lowerPath.includes(`-${pattern}`)) {
        const result: CategoryAuditResult = {
          isShady: true,
          category: "CRYPTO_SCAM",
          categoryLabel: "Crypto Drainer / Fake Airdrop",
          categoryIcon: "⚠️",
          riskScore: 88,
          threatDescription: `Cryptocurrency phishing pattern detected ("${pattern}"). Designed to deceive users into connecting Web3 wallets and draining tokens.`,
          detectedBy: "RULE_ENGINE",
        };
        this.setCache(cacheKey, result);
        return result;
      }
    }

    // Check Level 5: Groq AI Deep Verification (For unknown or tricky sites)
    const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
    if (groqKey && groqKey.trim() !== "") {
      try {
        const aiResult = await this.queryGroqClassifier(fullUrl, lowerHost, groqKey.trim());
        if (aiResult) {
          this.setCache(cacheKey, aiResult);
          return aiResult;
        }
      } catch (err) {
        console.warn("[CategoryAnalyzer] Groq AI verification fallback:", err);
      }
    }

    // Baseline Neutral/Clean fallback
    const fallbackResult: CategoryAuditResult = {
      isShady: false,
      category: "CLEAN",
      categoryLabel: "Standard Web Destination",
      categoryIcon: "✓",
      riskScore: 5,
      detectedBy: "BASELINE",
    };
    this.setCache(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Fast Groq AI Classifier using ultra-low latency model
   */
  private static async queryGroqClassifier(
    fullUrl: string,
    hostname: string,
    apiKey: string
  ): Promise<CategoryAuditResult | null> {
    const isGroq = apiKey.startsWith("gsk_");
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.x.ai/v1/chat/completions";
    const model = isGroq ? "llama-3.1-8b-instant" : "grok-2-latest";

    const prompt = `Analyze this domain/URL: "${fullUrl}" (Host: ${hostname}).
Classify whether it belongs to any high-risk shady category:
1. GAMBLING (online betting, casino, slots, sports wagering, satta, matka)
2. ADULT (pornography, explicit media, webcams, escorts)
3. PIRACY (torrents, illegal movie streaming, cracked software, modded apks)
4. CRYPTO_SCAM (phishing airdrops, wallet drainers, seed phrase scams)
5. BENIGN (standard software, blogs, news, ecommerce, general safe website)

Respond strictly in valid JSON format with NO markdown fences:
{
  "isShady": boolean,
  "category": "GAMBLING" | "ADULT" | "PIRACY" | "CRYPTO_SCAM" | "BENIGN",
  "riskScore": number (5 for benign, 65-72 for gambling/adult, 75-88 for piracy/scam),
  "reason": "1 concise sentence explanation"
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800); // Strict 1.8s timeout for extension speed

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are an automated real-time web safety and URL categorization engine. Return only raw JSON without extra text.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) return null;

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.isShady || parsed.category === "BENIGN") {
        return null;
      }

      let category: CategoryAuditResult["category"] = "SUSPICIOUS";
      let categoryLabel = "AI-Flagged Suspicious Target";
      let categoryIcon = "⚠️";

      if (parsed.category === "GAMBLING") {
        category = "GAMBLING";
        categoryLabel = "Online Gambling & High Financial Risk";
        categoryIcon = "🎰";
      } else if (parsed.category === "ADULT") {
        category = "ADULT_NSFW";
        categoryLabel = "Adult / Explicit Content";
        categoryIcon = "🔞";
      } else if (parsed.category === "PIRACY") {
        category = "PIRACY_MALWARE";
        categoryLabel = "Piracy & Suspicious Downloads";
        categoryIcon = "☠️";
      } else if (parsed.category === "CRYPTO_SCAM") {
        category = "CRYPTO_SCAM";
        categoryLabel = "Crypto Drainer / Fake Airdrop";
        categoryIcon = "⚠️";
      }

      return {
        isShady: true,
        category,
        categoryLabel,
        categoryIcon,
        riskScore: Math.min(100, Math.max(50, parsed.riskScore || 70)),
        threatDescription: `AI Threat Analysis: ${parsed.reason}`,
        detectedBy: "GROQ_AI",
      };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  private static setCache(key: string, result: CategoryAuditResult) {
    if (categoryCache.size > 1000) {
      // Remove oldest item if cache exceeds 1000 entries
      const firstKey = categoryCache.keys().next().value;
      if (firstKey) categoryCache.delete(firstKey);
    }
    categoryCache.set(key, { result, timestamp: Date.now() });
  }
}
