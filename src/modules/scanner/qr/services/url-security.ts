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
  { brand: "Microsoft", legitimateDomains: ["microsoft.com", "live.com", "office.com", "outlook.com", "microsoftonline.com", "azure.com", "windows.net"], keywords: ["microsoft", "office365", "onedrive", "outlook"] },
  { brand: "Google", legitimateDomains: ["google.com", "google.co.in", "google.co.uk", "youtube.com", "gmail.com", "google.ca", "google.de"], keywords: ["google", "gmail", "youtube"] },
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

// RFC 2606 and RFC 6761 Reserved Synthetic Domains and TLDs
export const RESERVED_SYNTHETIC_TLDS = new Set([
  "example",   // RFC 2606
  "invalid",   // RFC 2606
  "test",      // RFC 2606
  "localhost", // RFC 6761
]);

export const RESERVED_SYNTHETIC_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "example.edu",
]);

export function isReservedSyntheticDestination(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (RESERVED_SYNTHETIC_DOMAINS.has(lower)) return true;
  for (const dom of RESERVED_SYNTHETIC_DOMAINS) {
    if (lower.endsWith("." + dom)) return true;
  }
  const parts = lower.split(".");
  const tld = parts[parts.length - 1];
  if (tld && RESERVED_SYNTHETIC_TLDS.has(tld)) return true;
  return false;
}

export interface NestedRedirectInspection {
  hasNestedRedirect: boolean;
  redirect_parameter_present: boolean;
  redirect_destination_untrusted: boolean;
  redirect_chain_observed: boolean;
  redirect_chain_verified: boolean;
  networkRedirectStatus: "NOT_TESTED" | "VERIFIED_HTTP_CHAIN" | "BLOCKED_SSRF" | "FAILED";
  paramName?: string;
  candidateUrl?: string;
  normalizedCandidate?: string;
  hopDepth: number;
  isExternalDestination: boolean;
  isSameOrigin: boolean;
  isSameRegistrableDomain: boolean;
  isReservedSyntheticDomain: boolean;
}

export interface BrandImpersonationAudit {
  isImpersonating: boolean;
  targetBrand?: string;
  brandLocation?: "subdomain" | "path" | "userinfo" | "query";
  impersonationStrength?: "STRONG" | "MODERATE" | "NONE";
  impersonationPattern?: "FULL_DOMAIN_IN_SUBDOMAIN" | "KEYWORD_SUBDOMAIN" | "USERINFO_INJECTION" | "CREDENTIAL_PATH_LURE" | "NONE";
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
   * Evaluates if an IP is within loopback, RFC 1918 private, link-local, carrier-grade NAT,
   * multicast, broadcast, or reserved/test ranges (RFC 5737, RFC 6890, RFC 2544, RFC 1112).
   */
  static isPrivateOrLoopbackIp(ip: string): boolean {
    const cleanIp = ip.trim().replace(/^\[|\]$/g, "");

    // IPv4 Checks
    if (net.isIPv4(cleanIp)) {
      const parts = cleanIp.split(".").map(Number);
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;
      const [a, b, c, d] = parts as [number, number, number, number];

      // 0.0.0.0/8 (Current network / "this" network)
      if (a === 0) return true;
      // 10.0.0.0/8 (RFC 1918 Private)
      if (a === 10) return true;
      // 100.64.0.0/10 (RFC 6598 Shared Address Space / Carrier-Grade NAT: 100.64.0.0 - 100.127.255.255)
      if (a === 100 && b >= 64 && b <= 127) return true;
      // 127.0.0.0/8 (RFC 1122 Loopback)
      if (a === 127) return true;
      // 169.254.0.0/16 (RFC 3927 Link-Local & Cloud Metadata e.g. 169.254.169.254)
      if (a === 169 && b === 254) return true;
      // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.0.0.0/24 (RFC 6890 IETF Protocol Assignments)
      if (a === 192 && b === 0 && c === 0) return true;
      // 192.0.2.0/24 (RFC 5737 TEST-NET-1 for documentation/examples)
      if (a === 192 && b === 0 && c === 2) return true;
      // 192.88.99.0/24 (RFC 7526 6to4 relay anycast)
      if (a === 192 && b === 88 && c === 99) return true;
      // 192.168.0.0/16 (RFC 1918 Private)
      if (a === 192 && b === 168) return true;
      // 198.18.0.0/15 (RFC 2544 Benchmarking: 198.18.0.0 - 198.19.255.255)
      if (a === 198 && (b === 18 || b === 19)) return true;
      // 198.51.100.0/24 (RFC 5737 TEST-NET-2)
      if (a === 198 && b === 51 && c === 100) return true;
      // 203.0.113.0/24 (RFC 5737 TEST-NET-3)
      if (a === 203 && b === 0 && c === 113) return true;
      // 224.0.0.0/4 (RFC 5771 Multicast: 224.0.0.0 - 239.255.255.255)
      if (a >= 224 && a <= 239) return true;
      // 240.0.0.0/4 (RFC 1112 Reserved for future use & 255.255.255.255 Broadcast)
      if (a >= 240) return true;

      return false;
    }

    // IPv6 Checks
    if (net.isIPv6(cleanIp)) {
      const lower = cleanIp.toLowerCase();

      // Loopback ::1 and unspecified ::
      if (lower === "::1" || lower === "::" || lower === "0:0:0:0:0:0:0:1" || lower === "0:0:0:0:0:0:0:0") return true;

      // IPv4-mapped IPv6 address (::ffff:x.x.x.x)
      if (lower.startsWith("::ffff:") || lower.startsWith("0:0:0:0:0:ffff:")) {
        const ipv4Part = lower.split(":").pop();
        if (ipv4Part && net.isIPv4(ipv4Part)) {
          return this.isPrivateOrLoopbackIp(ipv4Part);
        }
        return true;
      }

      // Unique Local Addresses (fc00::/7 -> fc00:: to fdff::)
      if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

      // Link-Local (fe80::/10 -> fe80:: to febf::)
      if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;

      // Documentation (2001:db8::/32)
      if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) return true;

      // Multicast (ff00::/8)
      if (lower.startsWith("ff")) return true;

      // Discard prefix (100::/64)
      if (lower.startsWith("100:")) return true;

      return false;
    }

    return false;
  }

  /**
   * Distinguishes reserved test/documentation IPs (RFC 5737, RFC 3849) from hostile destinations
   */
  static isReservedDocumentationIp(ip: string): boolean {
    const cleanIp = ip.trim().replace(/^\[|\]$/g, "");
    if (net.isIPv4(cleanIp)) {
      const parts = cleanIp.split(".").map(Number);
      if (parts.length === 4) {
        const [a, b, c] = parts;
        // 192.0.2.0/24 (TEST-NET-1)
        if (a === 192 && b === 0 && c === 2) return true;
        // 198.51.100.0/24 (TEST-NET-2)
        if (a === 198 && b === 51 && c === 100) return true;
        // 203.0.113.0/24 (TEST-NET-3)
        if (a === 203 && b === 0 && c === 113) return true;
      }
    }
    if (net.isIPv6(cleanIp)) {
      const lower = cleanIp.toLowerCase();
      if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) return true;
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

      // 1. Check Subdomain for Full Domain Mimicry (e.g. paypal.com.login.example)
      for (const legit of entry.legitimateDomains) {
        const escaped = legit.replace(/\./g, "\\.");
        const fullDomainPattern = new RegExp(`(^|\\.)${escaped}(\\.|$)`, "i");
        if (fullDomainPattern.test(lowerSub)) {
          return {
            isImpersonating: true,
            targetBrand: entry.brand,
            brandLocation: "subdomain",
            impersonationStrength: "STRONG",
            impersonationPattern: "FULL_DOMAIN_IN_SUBDOMAIN",
            registrableDomain,
            legitimateDomains: entry.legitimateDomains,
          };
        }
      }

      for (const kw of entry.keywords) {
        // 2. Check Subdomain for Brand Keywords (e.g. paypal-security.attacker.com)
        const subPattern = new RegExp(`(^|\\.|-)${kw}(\\.|-|$)`, "i");
        if (subPattern.test(lowerSub)) {
          return {
            isImpersonating: true,
            targetBrand: entry.brand,
            brandLocation: "subdomain",
            impersonationStrength: "STRONG",
            impersonationPattern: "KEYWORD_SUBDOMAIN",
            registrableDomain,
            legitimateDomains: entry.legitimateDomains,
          };
        }

        // 3. Check User-info (e.g. https://paypal.com@evil.com/)
        if (lowerUser.includes(kw)) {
          return {
            isImpersonating: true,
            targetBrand: entry.brand,
            brandLocation: "userinfo",
            impersonationStrength: "STRONG",
            impersonationPattern: "USERINFO_INJECTION",
            registrableDomain,
            legitimateDomains: entry.legitimateDomains,
          };
        }

        // 4. Check Path: Distinguish Phishing Lures from Benign Path Mentions
        // A foreign domain path is ONLY brand impersonation if it combines the brand name with an authentication / credential lure.
        // Neutral paths like /news/paypal, /articles/paypal, /docs/paypal are NOT impersonation attacks.
        const pathAuthLurePattern = new RegExp(
          `/(login|signin|sign-in|log-in|verify|verification|auth|authenticate|account|wallet|kyc|portal)[/-]${kw}|${kw}[/-](login|signin|sign-in|log-in|verify|verification|auth|authenticate|account|wallet|kyc|portal)|/${kw}/(login|signin|verify|auth|account)`,
          "i"
        );
        if (pathAuthLurePattern.test(lowerPath)) {
          return {
            isImpersonating: true,
            targetBrand: entry.brand,
            brandLocation: "path",
            impersonationStrength: "MODERATE",
            impersonationPattern: "CREDENTIAL_PATH_LURE",
            registrableDomain,
            legitimateDomains: entry.legitimateDomains,
          };
        }
      }
    }

    return {
      isImpersonating: false,
      impersonationStrength: "NONE",
      impersonationPattern: "NONE",
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
      "redirect", "redirect_url", "redirect_to", "redirect_uri", "next", "continue", "return", "return_to", "return_url",
      "url", "dest", "destination", "target", "r", "to", "link", "forward", "out", "u", "go", "goto", "returnto",
      "callback", "callback_url", "checkout_url", "checkout", "redirect_link", "redirect_path"
    ];

    let currentUrl = urlObj.href;
    let candidateUrl: string | undefined = undefined;
    let normalizedCandidate: string | undefined = undefined;
    let depth = 0;
    let redirectParamFound = false;
    let detectedParamName: string | undefined = undefined;
    const seen = new Set<string>([urlObj.href]);

    // Check if initial URL has any recognized redirect query parameter
    for (const key of redirectKeys) {
      if (urlObj.searchParams.has(key)) {
        redirectParamFound = true;
        detectedParamName = key;
        break;
      }
    }

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
          redirectParamFound = true;
          if (!detectedParamName) detectedParamName = key;
          let candidate = val.trim();

          // Check if candidate is encoded URL or protocol-relative
          if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
            if (candidate.startsWith("//")) {
              candidate = "https:" + candidate;
            } else if (candidate.startsWith("/")) {
              // Relative path redirect target (same-origin by definition)
              candidate = `${urlObj.origin}${candidate}`;
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
            // Not a parseable URL
          }
        }
      }

      if (!foundInStep) break;
    }

    let isSameOrigin = false;
    let isSameRegistrableDomain = false;
    let isReservedSyntheticDomain = false;
    let isExternalDestination = false;
    let redirect_destination_untrusted = false;

    if (normalizedCandidate) {
      try {
        const candidateObj = new URL(normalizedCandidate);
        const targetHost = candidateObj.hostname.toLowerCase();
        const baseHost = urlObj.hostname.toLowerCase();

        const baseDomainInfo = this.parseDomain(baseHost);
        const targetDomainInfo = this.parseDomain(targetHost);

        isSameOrigin = targetHost === baseHost && candidateObj.port === urlObj.port && candidateObj.protocol === urlObj.protocol;
        isSameRegistrableDomain = Boolean(
          baseDomainInfo.registrableDomain &&
          targetDomainInfo.registrableDomain &&
          baseDomainInfo.registrableDomain === targetDomainInfo.registrableDomain
        );
        isReservedSyntheticDomain = isReservedSyntheticDestination(targetHost);

        isExternalDestination = !isSameOrigin && !isSameRegistrableDomain;

        // An external destination is untrusted when it forwards across distinct registrable domains
        redirect_destination_untrusted = isExternalDestination;
      } catch {
        // Fallback safely
      }
    }

    return {
      hasNestedRedirect: Boolean(candidateUrl),
      redirect_parameter_present: redirectParamFound,
      redirect_destination_untrusted,
      redirect_chain_observed: depth >= 2,
      redirect_chain_verified: false, // NEVER claimed from static URL parsing
      networkRedirectStatus: "NOT_TESTED", // Marked NOT TESTED until an active controlled HTTP request runs
      paramName: detectedParamName,
      candidateUrl,
      normalizedCandidate,
      hopDepth: depth,
      isExternalDestination,
      isSameOrigin,
      isSameRegistrableDomain,
      isReservedSyntheticDomain,
    };
  }

  /**
   * Controlled Active HTTP Redirect Chain Verification with SSRF protection
   */
  static async verifyControlledNetworkRedirect(
    startUrl: string,
    options: { maxHops?: number; allowLoopback?: boolean; timeoutMs?: number } = {}
  ): Promise<{
    redirect_chain_verified: boolean;
    networkRedirectStatus: "NOT_TESTED" | "VERIFIED_HTTP_CHAIN" | "BLOCKED_SSRF" | "FAILED";
    networkHops: Array<{ hopIndex: number; statusCode: number; locationHeader?: string; destinationUrl: string }>;
    finalUrl: string;
    totalHops: number;
    error?: string;
  }> {
    const maxHops = options.maxHops ?? 5;
    const allowLoopback = options.allowLoopback ?? false;
    const timeoutMs = options.timeoutMs ?? 3000;

    let currentUrl = startUrl;
    const networkHops: Array<{ hopIndex: number; statusCode: number; locationHeader?: string; destinationUrl: string }> = [];
    const visited = new Set<string>();

    for (let hop = 0; hop < maxHops; hop++) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        return {
          redirect_chain_verified: networkHops.length > 0,
          networkRedirectStatus: networkHops.length > 0 ? "VERIFIED_HTTP_CHAIN" : "FAILED",
          networkHops,
          finalUrl: currentUrl,
          totalHops: networkHops.length,
          error: `Invalid URL encountered in hop ${hop + 1}: ${currentUrl}`,
        };
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          redirect_chain_verified: networkHops.length > 0,
          networkRedirectStatus: "BLOCKED_SSRF",
          networkHops,
          finalUrl: currentUrl,
          totalHops: networkHops.length,
          error: `Disallowed protocol: ${parsed.protocol}`,
        };
      }

      // Check SSRF protection unless specifically in loopback mock mode
      const domainInfo = this.parseDomain(parsed.hostname);
      if (!allowLoopback && domainInfo.isPrivateOrLoopback) {
        return {
          redirect_chain_verified: networkHops.length > 0,
          networkRedirectStatus: "BLOCKED_SSRF",
          networkHops,
          finalUrl: currentUrl,
          totalHops: networkHops.length,
          error: `SSRF blocked destination: ${parsed.hostname}`,
        };
      }

      visited.add(currentUrl);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(currentUrl, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "Sentinel-AI-Security-Probe/2.0",
          },
        });
        clearTimeout(timeout);

        const status = res.status;
        const location = res.headers.get("location");

        if ([301, 302, 303, 307, 308].includes(status) && location) {
          const nextUrl = new URL(location, currentUrl).href;
          networkHops.push({
            hopIndex: hop + 1,
            statusCode: status,
            locationHeader: location,
            destinationUrl: nextUrl,
          });

          if (visited.has(nextUrl)) {
            // Loop detected
            break;
          }
          currentUrl = nextUrl;
        } else {
          // Terminal response reached
          break;
        }
      } catch (err: any) {
        return {
          redirect_chain_verified: networkHops.length > 0,
          networkRedirectStatus: networkHops.length > 0 ? "VERIFIED_HTTP_CHAIN" : "FAILED",
          networkHops,
          finalUrl: currentUrl,
          totalHops: networkHops.length,
          error: err?.message || "Network request failed",
        };
      }
    }

    return {
      redirect_chain_verified: networkHops.length > 0,
      networkRedirectStatus: "VERIFIED_HTTP_CHAIN",
      networkHops,
      finalUrl: currentUrl,
      totalHops: networkHops.length,
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
