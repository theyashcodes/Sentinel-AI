import dns from "dns/promises";
import punycode from "punycode";

export interface HopDetail {
  hop: number;
  url: string;
  domain: string;
  status: number;
  statusText: string;
  server?: string;
  contentType?: string;
  responseTimeMs: number;
  ipAddress?: string;
  redirectLocation?: string;
  isCrossDomain: boolean;
}

export interface ImpersonationVerdict {
  detected: boolean;
  targetBrand?: string;
  similarityType?: "HOMOGLYPH_UNICODE" | "TYPOSQUATTING_LEVENSHTEIN" | "SUBDOMAIN_DECEPTION";
  riskScore: number;
  explanation?: string;
  punycode?: string;
}

export interface SecurityHeadersAudit {
  hsts: boolean;
  xFrameOptions?: string | null;
  contentSecurityPolicy: boolean;
  xContentTypeOptions: boolean;
  httpsEnforced: boolean;
}

export interface TracerResult {
  inputUrl: string;
  finalUrl: string;
  totalHops: number;
  hasRedirects: boolean;
  isCrossDomainRedirect: boolean;
  hops: HopDetail[];
  impersonation: ImpersonationVerdict;
  securityHeaders: SecurityHeadersAudit;
  scanTimestamp: string;
}

// Top frequently targeted brands for phishing / typosquatting
const TARGET_BRANDS = [
  "paypal",
  "google",
  "microsoft",
  "apple",
  "netflix",
  "amazon",
  "facebook",
  "instagram",
  "chase",
  "bankofamerica",
  "binance",
  "coinbase",
  "telegram",
  "whatsapp",
  "twitter",
  "linkedin",
  "github",
  "wellsfargo",
  "barclays",
  "citibank",
  "steam",
];

// Common Cyrillic & Greek homoglyphs mapped to ASCII equivalents
const HOMOGLYPH_MAP: Record<string, string> = {
  "\u0430": "a", // Cyrillic small letter a
  "\u0435": "e", // Cyrillic small letter ie
  "\u043E": "o", // Cyrillic small letter o
  "\u0440": "p", // Cyrillic small letter er
  "\u0441": "c", // Cyrillic small letter es
  "\u0443": "y", // Cyrillic small letter u
  "\u0445": "x", // Cyrillic small letter ha
  "\u0456": "i", // Cyrillic small letter byelorussian-ukrainian i
  "\u0458": "j", // Cyrillic small letter je
  "\u0455": "s", // Cyrillic small letter dze
  "\u03BF": "o", // Greek small letter omicron
  "\u03BD": "v", // Greek small letter nu
  "\u03C1": "p", // Greek small letter rho
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + cost
      );
    }
  }
  return d[m]![n]!;
}

export function detectImpersonation(hostname: string): ImpersonationVerdict {
  const lowerHost = hostname.toLowerCase();
  // Decode punycode (e.g. xn--pypal-4ve.com -> pаypal.com)
  let unicodeHost = lowerHost;
  try {
    unicodeHost = punycode.toUnicode(lowerHost);
  } catch {
    // Keep fallback
  }

  const domainParts = unicodeHost.split(".");
  const sld = domainParts.length >= 2 ? domainParts[domainParts.length - 2]! : unicodeHost;

  // 1. Check for Punycode / Cyrillic Homoglyphs
  const isPunycode = lowerHost.startsWith("xn--") || lowerHost.includes(".xn--");
  let normalizedStr = "";
  let hasHomoglyphChar = false;

  for (const ch of unicodeHost) {
    if (HOMOGLYPH_MAP[ch]) {
      normalizedStr += HOMOGLYPH_MAP[ch];
      hasHomoglyphChar = true;
    } else {
      normalizedStr += ch;
    }
  }

  if (hasHomoglyphChar || isPunycode) {
    for (const brand of TARGET_BRANDS) {
      if (normalizedStr.includes(brand)) {
        return {
          detected: true,
          targetBrand: brand.charAt(0).toUpperCase() + brand.slice(1),
          similarityType: "HOMOGLYPH_UNICODE",
          riskScore: 96,
          punycode: isPunycode ? lowerHost : undefined,
          explanation: `Critical: Domain employs non-Latin Cyrillic/Greek homoglyphs (${unicodeHost}) or Punycode to visually spoof '${brand}'.`,
        };
      }
    }
  }

  // 2. Check for Subdomain Deception (e.g. paypal.com.secure-login-check.xyz)
  for (const brand of TARGET_BRANDS) {
    if (domainParts.length > 2 && domainParts.slice(0, -2).some((sub) => sub.includes(brand))) {
      return {
        detected: true,
        targetBrand: brand.charAt(0).toUpperCase() + brand.slice(1),
        similarityType: "SUBDOMAIN_DECEPTION",
        riskScore: 88,
        explanation: `Suspicious: Brand '${brand}' is weaponized in a subdomain to mislead users into believing they are on the legitimate site.`,
      };
    }
  }

  // 3. Levenshtein Distance Typosquatting (e.g., "paypa1", "g00gle", "netflixx")
  const leetCleaned = sld.replace(/1/g, "l").replace(/0/g, "o").replace(/5/g, "s").replace(/3/g, "e");
  for (const brand of TARGET_BRANDS) {
    if (sld === brand) continue; // Legitimate exact match

    // Check leet substitution
    if (leetCleaned === brand) {
      return {
        detected: true,
        targetBrand: brand.charAt(0).toUpperCase() + brand.slice(1),
        similarityType: "TYPOSQUATTING_LEVENSHTEIN",
        riskScore: 90,
        explanation: `Warning: Character substitution detected (${sld}) mimicking genuine brand '${brand}'.`,
      };
    }

    const dist = levenshteinDistance(sld, brand);
    if (dist === 1 && sld.length >= 4) {
      return {
        detected: true,
        targetBrand: brand.charAt(0).toUpperCase() + brand.slice(1),
        similarityType: "TYPOSQUATTING_LEVENSHTEIN",
        riskScore: 82,
        explanation: `Typosquatting alert: 1-character variation from genuine '${brand}' domain.`,
      };
    }
  }

  return {
    detected: false,
    riskScore: 5,
  };
}

export async function traceRedirectChain(rawUrl: string, maxHops = 10): Promise<TracerResult> {
  let currentUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(currentUrl)) {
    currentUrl = `https://${currentUrl}`;
  }

  const hops: HopDetail[] = [];
  const visited = new Set<string>();
  let initialDomain = "";
  let finalSecurityHeaders: SecurityHeadersAudit = {
    hsts: false,
    xFrameOptions: null,
    contentSecurityPolicy: false,
    xContentTypeOptions: false,
    httpsEnforced: false,
  };

  try {
    initialDomain = new URL(currentUrl).hostname;
  } catch {
    initialDomain = "unknown";
  }

  let hopCount = 0;

  while (hopCount < maxHops) {
    hopCount++;
    visited.add(currentUrl);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      break;
    }

    const startTime = Date.now();
    let status = 0;
    let statusText = "";
    let server: string | undefined;
    let contentType: string | undefined;
    let redirectLocation: string | undefined;
    let ipAddress: string | undefined;

    // Resolve IP address asynchronously
    try {
      const addresses = await dns.resolve4(parsedUrl.hostname);
      if (addresses.length > 0) {
        ipAddress = addresses[0];
      }
    } catch {
      // DNS resolution failed or IPv6 only
    }

    try {
      // Execute manual redirect fetch to inspect each hop individually
      let res = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Sentinel-AI-Tracer/2.0",
        },
        signal: AbortSignal.timeout(6000),
      });

      // If HEAD is rejected by web server (405 Method Not Allowed), retry with GET
      if (res.status === 405 || res.status === 403 || res.status === 400) {
        res = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Sentinel-AI-Tracer/2.0",
          },
          signal: AbortSignal.timeout(6000),
        });
      }

      status = res.status;
      statusText = res.statusText || (status === 200 ? "OK" : status === 301 ? "Moved Permanently" : status === 302 ? "Found" : "Redirect");
      server = res.headers.get("server") || undefined;
      contentType = res.headers.get("content-type")?.split(";")[0] || undefined;
      const rawLocation = res.headers.get("location");

      if (rawLocation) {
        try {
          redirectLocation = new URL(rawLocation, currentUrl).href;
        } catch {
          redirectLocation = rawLocation;
        }
      }

      // Check security headers on final hop or 200 responses
      if (status === 200 || !redirectLocation) {
        finalSecurityHeaders = {
          hsts: res.headers.has("strict-transport-security"),
          xFrameOptions: res.headers.get("x-frame-options"),
          contentSecurityPolicy: res.headers.has("content-security-policy"),
          xContentTypeOptions: res.headers.get("x-content-type-options") === "nosniff",
          httpsEnforced: parsedUrl.protocol === "https:",
        };
      }
    } catch (fetchErr) {
      status = 0;
      statusText = fetchErr instanceof Error ? fetchErr.message : "Network Unreachable / Blocked";
    }

    const duration = Date.now() - startTime;
    const isCrossDomain = parsedUrl.hostname.toLowerCase() !== initialDomain.toLowerCase();

    hops.push({
      hop: hopCount,
      url: currentUrl,
      domain: parsedUrl.hostname,
      status: status || 0,
      statusText: statusText || "Connection Terminated",
      server,
      contentType,
      responseTimeMs: duration,
      ipAddress,
      redirectLocation,
      isCrossDomain,
    });

    // Check if redirect continues
    if ([301, 302, 303, 307, 308].includes(status) && redirectLocation) {
      if (visited.has(redirectLocation)) {
        // Circular redirect loop detected
        break;
      }
      currentUrl = redirectLocation;
    } else {
      break;
    }
  }

  const finalUrl = hops.length > 0 ? hops[hops.length - 1]!.url : currentUrl;
  let finalDomain = "";
  try {
    finalDomain = new URL(finalUrl).hostname;
  } catch {
    finalDomain = finalUrl;
  }

  const impersonation = detectImpersonation(finalDomain);
  const isCrossDomainRedirect = hops.some((h) => h.isCrossDomain);

  return {
    inputUrl: rawUrl,
    finalUrl,
    totalHops: hops.length,
    hasRedirects: hops.length > 1,
    isCrossDomainRedirect,
    hops,
    impersonation,
    securityHeaders: finalSecurityHeaders,
    scanTimestamp: new Date().toISOString(),
  };
}
