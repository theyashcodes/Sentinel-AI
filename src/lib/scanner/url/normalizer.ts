import { z } from "zod";
import { URLSecurityAnalyzer } from "@/modules/scanner/qr/services/url-security";

export const URLScanRequestSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .transform((val) => val.trim())
    .refine((val) => {
      try {
        let candidate = val;
        if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
          candidate = "https://" + candidate;
        }
        const parsed = new URL(candidate);
        return Boolean(parsed.hostname);
      } catch {
        return false;
      }
    }, "Must be a valid URL or hostname"),
});

export interface NormalizedUrl {
  original: string;
  normalized: string;
  hostname: string;
  displayHostname: string;
  domain: string;
  subdomain: string;
  tld: string;
  path: string;
  protocol: string;
  port: string;
  hasUserInfo: boolean;
  userInfo?: string;
  explanation?: string;
}

export class UrlNormalizer {
  static normalize(rawUrl: string): NormalizedUrl {
    let target = rawUrl.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }

    let urlObj: URL;
    try {
      urlObj = new URL(target);
    } catch {
      throw new Error(`Invalid URL structure: "${rawUrl}"`);
    }

    // Strip trailing dot from hostname (e.g. github.com. -> github.com)
    let hostname = urlObj.hostname.toLowerCase().replace(/^\.+|\.+$/g, "");

    const domainInfo = URLSecurityAnalyzer.parseDomain(hostname);
    const hasUserInfo = Boolean(urlObj.username || urlObj.password);
    const userInfo = hasUserInfo
      ? `${urlObj.username}${urlObj.password ? ":" + urlObj.password : ""}`
      : undefined;

    // Punycode decode for display if applicable
    let displayHostname = hostname;
    if (hostname.startsWith("xn--") || hostname.includes(".xn--")) {
      displayHostname = hostname
        .split(".")
        .map((label) => URLSecurityAnalyzer.decodePunycodeLabel(label))
        .join(".");
    }

    let explanation: string | undefined = undefined;
    if (hasUserInfo) {
      explanation = `Authority prefix "${userInfo}@" is user-info, not the destination server. Actual destination hostname is "${hostname}".`;
    }

    return {
      original: rawUrl,
      normalized: urlObj.href,
      hostname,
      displayHostname,
      domain: domainInfo.registrableDomain,
      subdomain: domainInfo.subdomain,
      tld: domainInfo.tld,
      path: urlObj.pathname,
      protocol: urlObj.protocol.replace(":", ""),
      port: urlObj.port,
      hasUserInfo,
      userInfo,
      explanation,
    };
  }
}
