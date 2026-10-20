// Sentinel AI • QR Code & URL Security Analysis Service
// PSL-aware Registrable Domain Parsing, SSRF Protection, Homoglyph Analysis, and Bounded Redirect Extraction

import net from "net";

// Comprehensive Common Multi-tier Public Suffixes (PSL subset covering global & major ccTLDs)
const MULTI_PART_TLDS = new Set([
  // UK
  "co.uk", "org.uk", "me.uk", "ltd.uk", "plc.uk", "net.uk", "sch.uk", "ac.uk", "gov.uk",
  // India
  "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in", "nic.in", "ac.in", "edu.in", "res.in", "gov.in", "mil.in",
  // Australia
  "com.au", "net.au", "org.au", "edu.au", "gov.au", "asn.au", "id.au",
  // Japan
  "co.jp", "ne.jp", "or.jp", "ac.jp", "ed.jp", "go.jp",
  // Brazil
  "com.br", "net.br", "org.br", "gov.br", "edu.br",
  // South Africa
  "co.za", "org.za", "net.za", "ac.za", "gov.za",
  // Canada
  "gc.ca",
  // New Zealand
  "co.nz", "net.nz", "org.nz", "govt.nz", "ac.nz",
  // Others
  "com.sg", "edu.sg", "gov.sg", "com.hk", "org.hk", "edu.hk", "com.mx", "org.mx", "gob.mx",
  "com.tr", "org.tr", "edu.tr", "gov.tr", "com.tw", "org.tw", "gov.tw",
]);

// Well-known Brand Catalog with Legitimate Registrable Domains
export interface BrandCatalogEntry {
  brand: string;
  legitimateDomains: string[];
  keywords: string[];
}

export const BRAND_CATALOG: BrandCatalogEntry[] = [
  { brand: "PayPal", legitimateDomains: ["paypal.com", "paypal.me"], keywords: ["paypal"] },
  { brand: "Apple", legitimateDomains: ["apple.com", "icloud.com"], keywords: ["apple", "icloud", "appleid"] },
  { brand: "Microsoft", legitimateDomains: ["microsoft.com", "live.com", "office.com", "outlook.com", "login.microsoftonline.com"], keywords: ["microsoft", "office365", "onedrive", "outlook"] },
  { brand: "Google", legitimateDomains: ["google.com", "google.co.in", "google.co.uk", "youtube.com", "gmail.com"], keywords: ["google", "gmail", "youtube"] },
  { brand: "Amazon", legitimateDomains: ["amazon.com", "amazon.in", "amazon.co.uk", "aws.amazon.com"], keywords: ["amazon", "primevideo"] },
  { brand: "Netflix", legitimateDomains: ["netflix.com"], keywords: ["netflix"] },
  { brand: "Meta / Facebook", legitimateDomains: ["facebook.com", "instagram.com", "whatsapp.com", "meta.com"], keywords: ["facebook", "instagram", "whatsapp", "meta"] },
  { brand: "State Bank of India (SBI)", legitimateDomains: ["onlinesbi.sbi", "sbi.co.in"], keywords: ["sbi", "yono", "onlinesbi"] },
  { brand: "HDFC Bank", legitimateDomains: ["hdfcbank.com"], keywords: ["hdfc", "hdfcbank"] },
  { brand: "ICICI Bank", legitimateDomains: ["icicibank.com"], keywords: ["icici", "icicibank"] },
  { brand: "Chase Bank", legitimateDomains: ["chase.com"], keywords: ["chase", "chasebank"] },
  { brand: "Bank of America", legitimateDomains: ["bankofamerica.com", "bofa.com"], keywords: ["bankofamerica", "bofa"] },
  { brand: "Binance", legitimateDomains: ["binance.com"], keywords: ["binance"] },
  { brand: "Coinbase", legitimateDomains: ["coinbase.com"], keywords: ["coinbase"] },
  { brand: "MetaMask", legitimateDomains: ["metamask.io"], keywords: ["metamask"] },
  { brand: "Telegram", legitimateDomains: ["telegram.org", "t.me"], keywords: ["telegram"] },
  { brand: "Discord", legitimateDomains: ["discord.com", "discord.gg"], keywords: ["discord"] },
  { brand: "Steam", legitimateDomains: ["steampowered.com", "steamcommunity.com"], keywords: ["steam", "steampowered"] },
  { brand: "India Post", legitimateDomains: ["indiapost.gov.in"], keywords: ["indiapost", "postoffice"] },
  { brand: "DHL", legitimateDomains: ["dhl.com", "dhl.de"], keywords: ["dhl", "dhlexpress"] },
  { brand: "FedEx", legitimateDomains: ["fedex.com"], keywords: ["fedex"] },
];

// Common URL Shortener Hostnames
export const KNOWN_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "rb.gy", "t.co", "goo.gl", "ow.ly", "is.gd",
  "buff.ly", "adf.ly", "bit.do", "qr.ae", "cutt.ly", "shorturl.at", "v.gd",
  "tr.ee", "linktr.ee", "tiny.cc", "s.id", "t.ly", "dub.sh"
]);

// Suspicious / High-Abuse TLDs
export const HIGH_ABUSE_TLDS = new Set([
  "zip", "mov", "top", "xyz", "country", "kim", "science", "work", "party",
  "gq", "cf", "tk", "ml", "ga", "buzz", "fit", "surf", "rest", "monster",
  "click", "cam", "icu", "site", "online", "live", "space"
]);

// Known Confusable Cyrillic / Greek Unicode Mappings to Latin Lookalikes
export const HOMOGLYPH_MAP: Record<string, string> = {
  "\u0430": "a", // Cyrillic Small Letter A
  "\u0441": "c", // Cyrillic Small Letter Es
  "\u0435": "e", // Cyrillic Small Letter Ie
  "\u043E": "o", // Cyrillic Small Letter O
  "\u0440": "p", // Cyrillic Small Letter Er
  "\u0455": "s", // Cyrillic Small Letter Dze
  "\u0456": "i", // Cyrillic Small Letter Byelorussian-Ukrainian I
  "\u0458": "j", // Cyrillic Small Letter Je
  "\u0445": "x", // Cyrillic Small Letter Ha
  "\u0443": "y", // Cyrillic Small Letter U
  "\u03BF": "o", // Greek Small Letter Omicron
  "\u03BD": "v", // Greek Small Letter Nu
  "\u04BB": "h", // Cyrillic Small Letter Shha
  "\u0442": "t", // Cyrillic Small Letter Te
  "\u0410": "A", // Cyrillic Capital Letter A
  "\u0412": "B", // Cyrillic Capital Letter Ve
  "\u0415": "E", // Cyrillic Capital Letter Ie
  "\u041C": "M", // Cyrillic Capital Letter Em
  "\u041D": "H", // Cyrillic Capital Letter En
  "\u041E": "O", // Cyrillic Capital Letter O
  "\u0420": "P", // Cyrillic Capital Letter Er
  "\u0421": "C", // Cyrillic Capital Letter Es
  "\u0422": "T", // Cyrillic Capital Letter Te
  "\u0425": "X", // Cyrillic Capital Letter Ha
};

export interface ParsedDomainInfo {
  rawHostname: string;
  normalizedHostname: string;
  registrableDomain: string;
  subdomain: string;
  tld: string;
  isIpAddress: boolean;
  ipVersion: 4 | 6 | null;
  isPrivateOrLoopback: boolean;
}

export interface NestedRedirectInspection {
  hasNestedRedirect: boolean;
  paramName?: string;
  candidateUrl?: string;
  normalizedCandidate?: string;
  hopDepth: number;
  isExternalDestination: boolean;
}

export interface BrandImpersonationAudit {
  isImpersonating: boolean;
  targetBrand?: string;
  brandLocation?: "subdomain" | "path" | "userinfo" | "query";
  registrableDomain: string;
  legitimateDomains: string[];
}

export interface HomoglyphAudit {
  isPunycode: boolean;
  hasNonAscii: boolean;
  hasMixedScripts: boolean;
  hasHomoglyphSpoof: boolean;
  decodedPunycode?: string;
  confusableCharsFound: string[];
  normalizedHomoglyphDomain?: string;
}

export interface ParsedUrlDetails {
  rawUrl: string;
  normalizedUrl: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  hasUserInfo: boolean;
  userInfoString?: string;
  domainInfo: ParsedDomainInfo;
  brandAudit: BrandImpersonationAudit;
  homoglyphAudit: HomoglyphAudit;
  redirectAudit: NestedRedirectInspection;
  ssrfTarget: boolean;
  isShortener: boolean;
  isHighAbuseTld: boolean;
}

export class URLSecurityAnalyzer {
  /**
   * Safely decodes a Punycode ASCII label into Unicode string (RFC 3492 compliant)
   */
  static decodePunycodeLabel(label: string): string {
    if (!label.toLowerCase().startsWith("xn--")) return label;
    const str = label.slice(4).toLowerCase();
    const base = 36;
    const tmin = 1;
    const tmax = 26;
    const skew = 38;
    const damp = 700;
    const initialBias = 72;
    const initialN = 128;
    const delimiter = "-";

    const output: number[] = [];
    const lastDelim = str.lastIndexOf(delimiter);
    let b = 0;
    if (lastDelim > 0) {
      for (let j = 0; j < lastDelim; j++) {
        output.push(str.charCodeAt(j));
      }
      b = lastDelim + 1;
    }

    let n = initialN;
    let i = 0;
    let bias = initialBias;

    function adapt(delta: number, numpoints: number, firsttime: boolean): number {
      let k = 0;
      delta = firsttime ? Math.floor(delta / damp) : Math.floor(delta / 2);
      delta += Math.floor(delta / numpoints);
      while (delta > Math.floor(((base - tmin) * tmax) / 2)) {
        delta = Math.floor(delta / (base - tmin));
        k += base;
      }
      return Math.floor(k + ((base - tmin + 1) * delta) / (delta + skew));
    }

    let inIdx = b;
    while (inIdx < str.length) {
      const oldi = i;
      let w = 1;
      for (let k = base; ; k += base) {
        if (inIdx >= str.length) return label;
        const c = str.charCodeAt(inIdx++);
        const digit = c >= 48 && c <= 57 ? c - 22 : c >= 97 && c <= 122 ? c - 97 : base;
        if (digit >= base) return label;
        i += digit * w;
        const t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
        if (digit < t) break;
        w *= base - t;
      }
      bias = adapt(i - oldi, output.length + 1, oldi === 0);
      n += Math.floor(i / (output.length + 1));
      i %= output.length + 1;
      output.splice(i, 0, n);
      i++;
    }
    return String.fromCodePoint(...output);
  }

  /**
   * Public Suffix List-aware parser for Hostname
   */
  static parseDomain(hostname: string): ParsedDomainInfo {
    const rawHostname = hostname.trim();
    const cleanHost = rawHostname.toLowerCase().replace(/^\.+|\.+$/g, "");

    // 1. Check IP address
    const ipVersion = net.isIP(cleanHost);
    if (ipVersion !== 0) {
      const isPrivateOrLoopback = this.isPrivateOrLoopbackIp(cleanHost);
      return {
        rawHostname,
        normalizedHostname: cleanHost,
        registrableDomain: cleanHost,
        subdomain: "",
        tld: "",
        isIpAddress: true,
        ipVersion: ipVersion as 4 | 6,
        isPrivateOrLoopback,
      };
    }

    // 2. Check Localhost aliases
    const isLocalhost =
      cleanHost === "localhost" ||
      cleanHost.endsWith(".localhost") ||
      cleanHost.endsWith(".local") ||
      cleanHost.endsWith(".internal") ||
      cleanHost === "metadata.google.internal";

    if (isLocalhost) {
      return {
        rawHostname,
        normalizedHostname: cleanHost,
        registrableDomain: cleanHost,
        subdomain: "",
        tld: "localhost",
        isIpAddress: false,
        ipVersion: null,
        isPrivateOrLoopback: true,
      };
    }

    // 3. Multi-part / PSL domain resolution
    const labels = cleanHost.split(".");
    if (labels.length <= 1) {
      return {
        rawHostname,
        normalizedHostname: cleanHost,
        registrableDomain: cleanHost,
        subdomain: "",
        tld: cleanHost,
        isIpAddress: false,
        ipVersion: null,
        isPrivateOrLoopback: false,
      };
    }

    let tld = labels[labels.length - 1]!;
    let registrableDomain = labels.slice(-2).join(".");
    let subdomain = labels.slice(0, -2).join(".");

    // Check if last two labels form a known multi-part TLD (e.g. co.uk, gov.in)
    if (labels.length >= 3) {
      const twoPartTld = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
      if (MULTI_PART_TLDS.has(twoPartTld)) {
        tld = twoPartTld;
        registrableDomain = labels.slice(-3).join(".");
        subdomain = labels.slice(0, -3).join(".");
      }
    }

    return {
      rawHostname,
      normalizedHostname: cleanHost,
      registrableDomain,
      subdomain,
      tld,
      isIpAddress: false,
      ipVersion: null,
      isPrivateOrLoopback: false,
    };
  }

  /**
   * Evaluates if an IP is within loopback, RFC 1918 private, link-local, or cloud metadata ranges
   */
  static isPrivateOrLoopbackIp(ip: string): boolean {
    // IPv4 Checks
    if (net.isIPv4(ip)) {
      const parts = ip.split(".").map(Number);
      if (parts.length !== 4) return true;
      const [a, b] = [parts[0]!, parts[1]!];

      // 127.0.0.0/8 (Loopback)
      if (a === 127) return true;
      // 0.0.0.0/8 (Current network)
      if (a === 0) return true;
      // 10.0.0.0/8 (Private)
      if (a === 10) return true;
      // 172.16.0.0/12 (Private: 172.16 - 172.31)
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16 (Private)
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 (Link-Local & Cloud Metadata: 169.254.169.254)
      if (a === 169 && b === 254) return true;

      return false;
    }

    // IPv6 Checks
    if (net.isIPv6(ip)) {
      const cleanIpv6 = ip.toLowerCase();
      // Loopback ::1
      if (cleanIpv6 === "::1" || cleanIpv6 === "0:0:0:0:0:0:0:1") return true;
      // Unique Local Addresses (fc00::/7)
      if (cleanIpv6.startsWith("fc") || cleanIpv6.startsWith("fd")) return true;
      // Link-Local (fe80::/10)
      if (cleanIpv6.startsWith("fe8") || cleanIpv6.startsWith("fe9") || cleanIpv6.startsWith("fea") || cleanIpv6.startsWith("feb")) return true;

      return false;
    }

    return false;
  }

  /**
   * Audits Brand Masquerading: Checks if a brand name appears outside its legitimate domain
   */
  static auditBrandMasquerading(
    domainInfo: ParsedDomainInfo,
    pathname: string,
    userInfo: string,
    search: string
  ): BrandImpersonationAudit {
    const { registrableDomain, subdomain } = domainInfo;
    const lowerSub = subdomain.toLowerCase();
    const lowerPath = pathname.toLowerCase();
    const lowerUser = userInfo.toLowerCase();
    const lowerQuery = search.toLowerCase();

    for (const entry of BRAND_CATALOG) {
      const isLegitDomain = entry.legitimateDomains.some(
        (legit) => registrableDomain === legit || registrableDomain.endsWith("." + legit)
      );

      // If this is the legitimate domain, it is NOT brand impersonation
      if (isLegitDomain) continue;

      for (const kw of entry.keywords) {
        // 1. Check Subdomain (e.g. paypal.com.attacker.com or paypal-security.attacker.com)
        const subPattern = new RegExp(`(^|\\.|-)${kw}(\\.|-|$)`, "i");
        if (subPattern.test(lowerSub)) {
          return {
            isImpersonating: true,
            targetBrand: entry.brand,
            brandLocation: "subdomain",
            registrableDomain,
            legitimateDomains: entry.legitimateDomains,
          };
        }

        // 2. Check User-info (e.g. https://paypal.com@evil.com/)
        if (lowerUser.includes(kw)) {
          return {
            isImpersonating: true,
            targetBrand: entry.brand,
            brandLocation: "userinfo",
            registrableDomain,
            legitimateDomains: entry.legitimateDomains,
          };
        }

        // 3. Check Path combined with deceptive login/verify lures (e.g. evil.com/paypal/login)
        if (lowerPath.includes(`/${kw}/`) || lowerPath.includes(`/${kw}-login`) || lowerPath.endsWith(`/${kw}`)) {
          return {
            isImpersonating: true,
            targetBrand: entry.brand,
            brandLocation: "path",
            registrableDomain,
            legitimateDomains: entry.legitimateDomains,
          };
        }
      }
    }

    return {
      isImpersonating: false,
      registrableDomain,
      legitimateDomains: [],
    };
  }

  /**
   * Audits Unicode Confusables, Homoglyphs, and Punycode
   */
  static auditHomoglyphs(hostname: string, rawHost?: string): HomoglyphAudit {
    const isPunycode = hostname.toLowerCase().startsWith("xn--") || hostname.toLowerCase().includes(".xn--");
    const nonAsciiRegex = /[^\x00-\x7F]/;
    const hasNonAscii = nonAsciiRegex.test(hostname) || (rawHost ? nonAsciiRegex.test(rawHost) : false);

    let decodedPunycode: string | undefined = undefined;
    if (isPunycode) {
      const labels = hostname.split(".");
      decodedPunycode = labels.map((l) => this.decodePunycodeLabel(l)).join(".");
    }

    const testSubject = decodedPunycode || rawHost || hostname;
    const confusableCharsFound: string[] = [];
    let normalizedChars = "";

    // Check for mixed scripts or confusable lookalikes
    const hasLatin = /[a-zA-Z]/.test(testSubject);
    let hasNonLatinScript = false;

    for (const char of testSubject) {
      if (HOMOGLYPH_MAP[char]) {
        confusableCharsFound.push(char);
        normalizedChars += HOMOGLYPH_MAP[char];
        hasNonLatinScript = true;
      } else {
        normalizedChars += char;
        if (char.charCodeAt(0) > 127) {
          hasNonLatinScript = true;
        }
      }
    }

    const hasMixedScripts = hasLatin && hasNonLatinScript;
    const hasHomoglyphSpoof = confusableCharsFound.length > 0 || (isPunycode && hasMixedScripts) || (hasNonAscii && hasLatin);

    return {
      isPunycode,
      hasNonAscii,
      hasMixedScripts,
      hasHomoglyphSpoof,
      decodedPunycode,
      confusableCharsFound: Array.from(new Set(confusableCharsFound)),
      normalizedHomoglyphDomain: hasHomoglyphSpoof ? normalizedChars : undefined,
    };
  }

  /**
   * Statically extracts and evaluates nested redirect parameters without network calls
   */
  static extractNestedRedirect(
    urlObj: URL,
    maxDepth = 3
  ): NestedRedirectInspection {
    const redirectKeys = [
      "url", "redirect", "redirect_url", "redirect_to", "dest", "destination",
      "target", "next", "r", "to", "link", "return_to", "forward", "out", "u", "go"
    ];

    let currentUrl = urlObj.href;
    let candidateUrl: string | undefined = undefined;
    let normalizedCandidate: string | undefined = undefined;
    let depth = 0;
    const seen = new Set<string>([urlObj.href]);

    while (depth < maxDepth) {
      let foundInStep = false;
      let parsedCurrent: URL;
      try {
        parsedCurrent = new URL(currentUrl);
      } catch {
        break;
      }

      for (const key of redirectKeys) {
        const val = parsedCurrent.searchParams.get(key);
        if (val && val.trim().length > 0 && val.length < 2048) {
          let candidate = val.trim();
          // Check if candidate is encoded URL
          if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
            if (candidate.startsWith("//")) {
              candidate = "https:" + candidate;
            } else if (candidate.includes(".") && !candidate.includes(" ")) {
              candidate = "https://" + candidate;
            }
          }

          try {
            const parsedCandidate = new URL(candidate);
            if (parsedCandidate.protocol === "http:" || parsedCandidate.protocol === "https:") {
              candidateUrl = candidate;
              normalizedCandidate = parsedCandidate.href;
              depth++;
              foundInStep = true;

              if (seen.has(normalizedCandidate)) {
                // Cycle detected
                break;
              }
              seen.add(normalizedCandidate);
              currentUrl = normalizedCandidate;
              break;
            }
          } catch {
            // Not a valid URL
          }
        }
      }

      if (!foundInStep) break;
    }

    let isExternalDestination = false;
    if (normalizedCandidate) {
      try {
        const targetHost = new URL(normalizedCandidate).hostname.toLowerCase();
        const baseHost = urlObj.hostname.toLowerCase();
        isExternalDestination = targetHost !== baseHost && !targetHost.endsWith("." + baseHost);
      } catch {}
    }

    return {
      hasNestedRedirect: Boolean(candidateUrl),
      paramName: candidateUrl ? "redirect-query-param" : undefined,
      candidateUrl,
      normalizedCandidate,
      hopDepth: depth,
      isExternalDestination,
    };
  }

  /**
   * Primary Entry Point: Parses full URL structure and performs multi-layer security diagnostics
   */
  static analyze(rawInput: string): ParsedUrlDetails {
    let clean = rawInput.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "http://" + clean;
    }

    let urlObj: URL;
    try {
      urlObj = new URL(clean);
    } catch {
      throw new Error(`Invalid URL structure: "${rawInput}"`);
    }

    const hostname = urlObj.hostname.toLowerCase();
    const domainInfo = this.parseDomain(hostname);
    const hasUserInfo = Boolean(urlObj.username || urlObj.password);
    const userInfoString = hasUserInfo
      ? `${urlObj.username}${urlObj.password ? ":" + urlObj.password : ""}`
      : undefined;

    const brandAudit = this.auditBrandMasquerading(
      domainInfo,
      urlObj.pathname,
      userInfoString || "",
      urlObj.search
    );

    const rawMatch = clean.match(/^https?:\/\/([^/?#]+)/i);
    const rawHost = rawMatch ? rawMatch[1]! : hostname;
    const homoglyphAudit = this.auditHomoglyphs(hostname, rawHost);
    const redirectAudit = this.extractNestedRedirect(urlObj);

    const isShortener =
      KNOWN_SHORTENERS.has(domainInfo.registrableDomain) ||
      KNOWN_SHORTENERS.has(hostname);

    const isHighAbuseTld = HIGH_ABUSE_TLDS.has(domainInfo.tld);

    // SSRF Check: Is domain an IP pointing to private/loopback address, or localhost alias?
    const ssrfTarget = domainInfo.isPrivateOrLoopback;

    return {
      rawUrl: rawInput,
      normalizedUrl: urlObj.href,
      protocol: urlObj.protocol.replace(":", ""),
      hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      hasUserInfo,
      userInfoString,
      domainInfo,
      brandAudit,
      homoglyphAudit,
      redirectAudit,
      ssrfTarget,
      isShortener,
      isHighAbuseTld,
    };
  }
}
