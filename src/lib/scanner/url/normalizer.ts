import { z } from "zod";

export const URLScanRequestSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

export interface NormalizedUrl {
  original: string;
  normalized: string;
  hostname: string;
  domain: string;
  tld: string;
  path: string;
  protocol: string;
}

export class UrlNormalizer {
  static normalize(rawUrl: string): NormalizedUrl {
    let target = rawUrl.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "http://" + target;
    }

    const urlObj = new URL(target);
    const hostname = urlObj.hostname;
    
    // Naive domain and TLD extraction
    const parts = hostname.split(".");
    let domain = hostname;
    let tld = "";
    if (parts.length >= 2) {
      tld = parts[parts.length - 1] || "";
      domain = `${parts[parts.length - 2]}.${tld}`;
    }

    return {
      original: rawUrl,
      normalized: urlObj.href,
      hostname: hostname,
      domain: domain,
      tld: tld,
      path: urlObj.pathname,
      protocol: urlObj.protocol.replace(":", ""),
    };
  }
}
