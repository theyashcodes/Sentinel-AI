import { QRScanSecurityCheckResult, QRScanWarning } from "../types/qr-scanner";

const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "rb.gy",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "adf.ly",
  "bit.do",
  "qr.ae",
  "cutt.ly",
  "shorturl.at",
  "v.gd",
  "tr.ee",
  "linktr.ee"
]);

const SUSPICIOUS_TLDS = new Set([
  "zip",
  "mov",
  "top",
  "xyz",
  "country",
  "kim",
  "science",
  "work",
  "party",
  "gq",
  "cf",
  "tk",
  "ml",
  "ga",
  "buzz",
  "fit",
  "surf",
  "rest",
  "monster"
]);

export class QRSecurityChecker {
  static analyzeUrl(urlStr: string): QRScanSecurityCheckResult {
    const warnings: QRScanWarning[] = [];

    let isHttp = false;
    let isShortener = false;
    let isPunycode = false;
    let isUnicodeSpoof = false;
    let isSuspiciousTld = false;

    let target = urlStr.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "http://" + target;
    }

    let urlObj: URL;
    try {
      urlObj = new URL(target);
    } catch {
      return {
        isShortener: false,
        isPunycode: false,
        isUnicodeSpoof: false,
        isHttp: false,
        isSuspiciousTld: false,
        warnings: [{
          code: "INVALID_URL",
          title: "Invalid URL Format",
          description: "Extracted QR text is not a valid structured URL.",
          severity: "high"
        }]
      };
    }

    const hostname = urlObj.hostname.toLowerCase();

    // 1. HTTP check
    if (urlObj.protocol === "http:") {
      isHttp = true;
      warnings.push({
        code: "HTTP_UNENCRYPTED",
        title: "Unencrypted Connection (HTTP)",
        description: "This link uses unencrypted HTTP instead of HTTPS, exposing traffic to sniffing or interception.",
        severity: "medium"
      });
    }

    // 2. URL Shortener check
    const hostnameParts = hostname.split(".");
    const mainDomain = hostnameParts.slice(-2).join(".");
    if (URL_SHORTENERS.has(hostname) || URL_SHORTENERS.has(mainDomain)) {
      isShortener = true;
      // HTTPS shorteners (e.g. https://bit.ly) are commonly used by legitimate apps (BHIM, payment links).
      // Only flag as high severity when combined with HTTP (no encryption).
      const shortenerSeverity = isHttp ? "high" : "medium";
      warnings.push({
        code: "URL_SHORTENER",
        title: "URL Shortener Detected",
        description: `This link uses a shortening service (${hostname}) that masks the real destination URL.`,
        severity: shortenerSeverity as "high" | "medium"
      });
    }

    // 3. Punycode check
    if (hostname.startsWith("xn--") || hostname.includes(".xn--")) {
      isPunycode = true;
      warnings.push({
        code: "PUNYCODE_DOMAIN",
        title: "Punycode Domain Detected",
        description: "The hostname uses Punycode encoding, often used in Internationalized Domain Name (IDN) homograph phishing attacks.",
        severity: "high"
      });
    }

    // 4. Unicode Spoofing check
    // Check for non-ASCII characters in raw string or hostname
    const nonAsciiRegex = /[^\x00-\x7F]/;
    if (nonAsciiRegex.test(urlStr) || nonAsciiRegex.test(urlObj.hostname)) {
      isUnicodeSpoof = true;
      warnings.push({
        code: "UNICODE_SPOOFING",
        title: "Unicode Spoofing / Homograph Threat",
        description: "Contains non-ASCII Unicode characters designed to mimic legitimate domain characters.",
        severity: "high"
      });
    }

    // 5. Suspicious TLD check
    const tld = hostnameParts[hostnameParts.length - 1] || "";
    if (SUSPICIOUS_TLDS.has(tld)) {
      isSuspiciousTld = true;
      warnings.push({
        code: "SUSPICIOUS_TLD",
        title: "High-Risk TLD",
        description: `The top-level domain (.${tld}) is statistically associated with high rates of malicious spam & phishing campaigns.`,
        severity: "medium"
      });
    }

    return {
      isShortener,
      isPunycode,
      isUnicodeSpoof,
      isHttp,
      isSuspiciousTld,
      warnings
    };
  }
}
