import dns from "node:dns/promises";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import { whoisRegistry } from "../whois/registry";
import { URLSecurityAnalyzer } from "@/modules/scanner/qr/services/url-security";

export interface URLEvidence {
  whois?: Record<string, unknown> | null;
  dns?: Record<string, unknown> | null;
  tls?: Record<string, unknown> | null;
  headers?: Record<string, unknown> | null;
  redirects?: string[];
  finalUrl?: string;
  statusCode?: number;
  ssrfProtected?: boolean;
}

export class EvidenceGatherer {
  static async gather(normalizedUrl: string, hostname: string): Promise<URLEvidence> {
    const evidence: URLEvidence = { redirects: [] };

    // 0. SSRF Safety Check: Block private, loopback, link-local, and cloud metadata targets
    const isDirectPrivate = URLSecurityAnalyzer.isPrivateOrLoopbackIp(hostname);
    const isLocalhostAlias =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "metadata.google.internal";

    if (isDirectPrivate || isLocalhostAlias) {
      evidence.ssrfProtected = true;
      evidence.headers = { "x-sentinel-ssrf-block": "Prohibited private or loopback destination. Network scan aborted." };
      return evidence;
    }

    // 1. Concurrent DNS Lookups
    try {
      const [a, aaaa, mx, txt] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname),
        dns.resolveMx(hostname),
        dns.resolveTxt(hostname),
      ]);

      const resolvedA = a.status === 'fulfilled' ? a.value : [];
      const resolvedAaaa = aaaa.status === 'fulfilled' ? aaaa.value : [];

      // Defend against DNS rebinding / private resolution
      const allIps = [...resolvedA, ...resolvedAaaa];
      const hasPrivateIp = allIps.some((ip) => URLSecurityAnalyzer.isPrivateOrLoopbackIp(ip));
      if (hasPrivateIp) {
        evidence.ssrfProtected = true;
        evidence.headers = { "x-sentinel-ssrf-block": "DNS resolution returned prohibited internal IP. Network probe blocked." };
        return evidence;
      }

      evidence.dns = {
        a: resolvedA,
        aaaa: resolvedAaaa,
        mx: mx.status === 'fulfilled' ? mx.value : [],
        txt: txt.status === 'fulfilled' ? txt.value : [],
      };
    } catch {
      evidence.dns = null;
    }

    // 2. WHOIS
    try {
      const whoisProvider = whoisRegistry.getProvider();
      const whoisData = await whoisProvider.lookup(hostname);
      if (whoisData) {
        evidence.whois = whoisData as unknown as Record<string, unknown>;
      }
    } catch {
      evidence.whois = null;
    }

    // 3. HTTP Headers, TLS, and Redirects
    await this.fetchHttpEvidence(normalizedUrl, evidence);

    return evidence;
  }

  private static async fetchHttpEvidence(
    url: string,
    evidence: URLEvidence,
    hopCount: number = 0
  ): Promise<void> {
    if (hopCount > 5) {
      return; // Max redirects reached
    }

    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith("https");
      const client = isHttps ? https : http;

      // Reset TLS for this hop so we only keep the final hop's TLS
      evidence.tls = null;
      
      const req = client.get(url, { timeout: 5000 }, (res) => {
        const status = res.statusCode || 0;

        if (isHttps) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cert = (res.socket as any).getPeerCertificate?.();
          if (cert && cert.subject) {
            evidence.tls = {
              subject: cert.subject,
              issuer: cert.issuer,
              valid_from: cert.valid_from,
              valid_to: cert.valid_to,
            };
          }
        }

        // Handle Redirects
        if (status >= 300 && status < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith("http")) {
            const urlObj = new URL(url);
            nextUrl = `${urlObj.protocol}//${urlObj.host}${nextUrl.startsWith("/") ? "" : "/"}${nextUrl}`;
          }

          // SSRF defense on redirect hop
          try {
            const nextHost = new URL(nextUrl).hostname;
            if (URLSecurityAnalyzer.isPrivateOrLoopbackIp(nextHost) || nextHost === "localhost" || nextHost.endsWith(".internal")) {
              evidence.redirects?.push(`${nextUrl} [BLOCKED: SSRF/Private Target]`);
              res.resume();
              resolve();
              return;
            }
          } catch {
            res.resume();
            resolve();
            return;
          }

          evidence.redirects?.push(nextUrl);
          
          res.resume(); // consume response data to free up memory
          resolve(this.fetchHttpEvidence(nextUrl, evidence, hopCount + 1));
          return;
        }

        // Final Destination Reached
        evidence.finalUrl = url;
        evidence.statusCode = status;
        evidence.headers = res.headers as Record<string, unknown>;
        
        res.resume();
        resolve();
      });

      req.on('error', (err) => {
        reject(new Error(`Network Error: ${err.message}`));
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Network Error: Connection timed out'));
      });
    });
  }
}
