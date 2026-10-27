import dns from "node:dns/promises";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import { whoisRegistry } from "../whois/registry";
import { URLSecurityAnalyzer } from "@/modules/scanner/qr/services/url-security";

export type SecurityHeaderStatus = "PASS" | "FAIL" | "NOT_TESTED";

export interface SecurityHeaderItem {
  name: string;
  key: string;
  desc: string;
  status: SecurityHeaderStatus;
  value?: string;
  explanation: string;
}

export interface SecurityHeadersAudit {
  strictTransportSecurity: SecurityHeaderItem;
  contentSecurityPolicy: SecurityHeaderItem;
  xFrameOptions: SecurityHeaderItem;
  xContentTypeOptions: SecurityHeaderItem;
  overallStatus: "TESTED" | "NOT_TESTED";
}

export interface URLEvidence {
  whois?: Record<string, unknown> | null;
  dns?: Record<string, unknown> | null;
  tls?: Record<string, unknown> | null;
  headers?: Record<string, unknown> | null;
  securityHeadersAudit?: SecurityHeadersAudit;
  redirects?: string[];
  finalUrl?: string;
  statusCode?: number;
  ssrfProtected?: boolean;
  networkRedirectStatus?: "NOT_TESTED" | "VERIFIED_HTTP_CHAIN" | "BLOCKED_SSRF" | "FAILED";
}

export class EvidenceGatherer {
  /**
   * Evaluates HTTP security response headers deterministically.
   * Never infers security header results from the URL string alone.
   */
  static evaluateSecurityHeaders(
    headers: Record<string, unknown> | null | undefined,
    isHttps: boolean
  ): SecurityHeadersAudit {
    if (!headers || Object.keys(headers).length === 0) {
      return {
        overallStatus: "NOT_TESTED",
        strictTransportSecurity: {
          name: "Strict-Transport-Security",
          key: "strict-transport-security",
          desc: "HSTS Encrypted Gating",
          status: "NOT_TESTED",
          explanation: "HTTP response headers were not fetched or network request was blocked.",
        },
        contentSecurityPolicy: {
          name: "Content-Security-Policy",
          key: "content-security-policy",
          desc: "Script/Resource Sandboxing",
          status: "NOT_TESTED",
          explanation: "HTTP response headers were not fetched or network request was blocked.",
        },
        xFrameOptions: {
          name: "X-Frame-Options",
          key: "x-frame-options",
          desc: "Clickjacking Prevention",
          status: "NOT_TESTED",
          explanation: "HTTP response headers were not fetched or network request was blocked.",
        },
        xContentTypeOptions: {
          name: "X-Content-Type-Options",
          key: "x-content-type-options",
          desc: "MIME-sniffing Block",
          status: "NOT_TESTED",
          explanation: "HTTP response headers were not fetched or network request was blocked.",
        },
      };
    }

    // Lowercase all header keys for reliable lookup
    const normalizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") {
        normalizedHeaders[k.toLowerCase()] = v;
      } else if (Array.isArray(v)) {
        normalizedHeaders[k.toLowerCase()] = v.join(", ");
      }
    }

    // 1. Strict-Transport-Security
    let hstsStatus: SecurityHeaderStatus = "FAIL";
    let hstsExplanation = "Strict-Transport-Security header missing from server response.";
    const hstsVal = normalizedHeaders["strict-transport-security"];
    if (!isHttps) {
      hstsStatus = "FAIL";
      hstsExplanation = "Cleartext HTTP cannot enforce HSTS header.";
    } else if (hstsVal) {
      hstsStatus = "PASS";
      hstsExplanation = `Enforced (${hstsVal.split(";")[0] || hstsVal}).`;
    }

    // 2. Content-Security-Policy
    let cspStatus: SecurityHeaderStatus = "FAIL";
    let cspExplanation = "Content-Security-Policy header not provided.";
    const cspVal = normalizedHeaders["content-security-policy"];
    if (cspVal) {
      cspStatus = "PASS";
      cspExplanation = "CSP header actively enforced.";
    }

    // 3. X-Frame-Options
    let xfoStatus: SecurityHeaderStatus = "FAIL";
    let xfoExplanation = "X-Frame-Options header not provided.";
    const xfoVal = normalizedHeaders["x-frame-options"];
    if (xfoVal) {
      xfoStatus = "PASS";
      xfoExplanation = `Enforced (${xfoVal.trim()}).`;
    } else if (cspVal && cspVal.toLowerCase().includes("frame-ancestors")) {
      xfoStatus = "PASS";
      xfoExplanation = "Protected via CSP frame-ancestors directive.";
    }

    // 4. X-Content-Type-Options
    let xctoStatus: SecurityHeaderStatus = "FAIL";
    let xctoExplanation = "X-Content-Type-Options header not provided.";
    const xctoVal = normalizedHeaders["x-content-type-options"];
    if (xctoVal && xctoVal.toLowerCase().includes("nosniff")) {
      xctoStatus = "PASS";
      xctoExplanation = "nosniff enforced against MIME confusion.";
    }

    return {
      overallStatus: "TESTED",
      strictTransportSecurity: {
        name: "Strict-Transport-Security",
        key: "strict-transport-security",
        desc: "HSTS Encrypted Gating",
        status: hstsStatus,
        value: hstsVal,
        explanation: hstsExplanation,
      },
      contentSecurityPolicy: {
        name: "Content-Security-Policy",
        key: "content-security-policy",
        desc: "Script/Resource Sandboxing",
        status: cspStatus,
        value: cspVal ? `${cspVal.slice(0, 45)}...` : undefined,
        explanation: cspExplanation,
      },
      xFrameOptions: {
        name: "X-Frame-Options",
        key: "x-frame-options",
        desc: "Clickjacking Prevention",
        status: xfoStatus,
        value: xfoVal,
        explanation: xfoExplanation,
      },
      xContentTypeOptions: {
        name: "X-Content-Type-Options",
        key: "x-content-type-options",
        desc: "MIME-sniffing Block",
        status: xctoStatus,
        value: xctoVal,
        explanation: xctoExplanation,
      },
    };
  }

  /**
   * Performs outbound evidence collection with strict SSRF controls,
   * DNS pre-resolution checks, redirect loop limits, and response truncation.
   */
  static async gather(normalizedUrl: string, hostname: string): Promise<URLEvidence> {
    const evidence: URLEvidence = {
      redirects: [],
      networkRedirectStatus: "NOT_TESTED",
      securityHeadersAudit: this.evaluateSecurityHeaders(null, normalizedUrl.startsWith("https")),
    };

    // 0. Static SSRF Safety Pre-check
    const isDirectPrivate = URLSecurityAnalyzer.isPrivateOrLoopbackIp(hostname);
    const isLocalhostAlias =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname === "metadata.google.internal";

    if (isDirectPrivate || isLocalhostAlias) {
      evidence.ssrfProtected = true;
      evidence.networkRedirectStatus = "BLOCKED_SSRF";
      evidence.headers = { "x-sentinel-ssrf-block": "Prohibited private or loopback destination. Network scan aborted." };
      return evidence;
    }

    // 1. DNS Pre-flight Resolution & Rebinding Check
    let resolvedA: string[] = [];
    let resolvedAaaa: string[] = [];
    try {
      const [a, aaaa, mx, txt] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname),
        dns.resolveMx(hostname),
        dns.resolveTxt(hostname),
      ]);

      resolvedA = a.status === "fulfilled" ? a.value : [];
      resolvedAaaa = aaaa.status === "fulfilled" ? aaaa.value : [];

      // Defend against DNS rebinding to private / loopback IP
      const allIps = [...resolvedA, ...resolvedAaaa];
      const hasPrivateIp = allIps.some((ip) => URLSecurityAnalyzer.isPrivateOrLoopbackIp(ip));
      if (hasPrivateIp) {
        evidence.ssrfProtected = true;
        evidence.networkRedirectStatus = "BLOCKED_SSRF";
        evidence.headers = { "x-sentinel-ssrf-block": "DNS resolution returned prohibited internal/reserved IP. Network probe blocked." };
        return evidence;
      }

      evidence.dns = {
        a: resolvedA,
        aaaa: resolvedAaaa,
        mx: mx.status === "fulfilled" ? mx.value : [],
        txt: txt.status === "fulfilled" ? txt.value : [],
      };
    } catch {
      evidence.dns = null;
    }

    // 2. WHOIS Lookup (Best effort, non-fatal)
    try {
      const whoisProvider = whoisRegistry.getProvider();
      const whoisData = await whoisProvider.lookup(hostname);
      if (whoisData) {
        evidence.whois = whoisData as unknown as Record<string, unknown>;
      }
    } catch {
      evidence.whois = null;
    }

    // 3. Controlled HTTP Inspection with SSRF Guard on Every Hop
    try {
      await this.fetchHttpEvidence(normalizedUrl, evidence);
    } catch (err: any) {
      if (err?.message?.includes("SSRF")) {
        evidence.ssrfProtected = true;
        evidence.networkRedirectStatus = "BLOCKED_SSRF";
        if (!evidence.headers) {
          evidence.headers = {};
        }
        (evidence.headers as Record<string, unknown>)["x-sentinel-ssrf-block"] =
          err?.message || "Prohibited internal or loopback destination. Network scan aborted.";
      } else {
        evidence.networkRedirectStatus = "FAILED";
      }
    }

    // 4. Compute verified security headers audit
    const isFinalHttps = (evidence.finalUrl || normalizedUrl).startsWith("https");
    evidence.securityHeadersAudit = this.evaluateSecurityHeaders(evidence.headers, isFinalHttps);

    return evidence;
  }

  private static async fetchHttpEvidence(
    url: string,
    evidence: URLEvidence,
    hopCount = 0
  ): Promise<void> {
    if (hopCount > 5) {
      return; // Bounded redirect limit
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(`Invalid URL encountered: ${url}`);
    }

    // Protocol check
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error(`Disallowed protocol for security probe: ${parsedUrl.protocol}`);
    }

    const host = parsedUrl.hostname.toLowerCase();

    // Check direct host for SSRF
    if (URLSecurityAnalyzer.isPrivateOrLoopbackIp(host) || host === "localhost" || host.endsWith(".internal")) {
      evidence.ssrfProtected = true;
      throw new Error(`SSRF blocked prohibited destination: ${host}`);
    }

    // DNS pre-resolution for redirect hops to prevent DNS rebinding
    if (hopCount > 0 && !net.isIP(host)) {
      try {
        const [a, aaaa] = await Promise.allSettled([
          dns.resolve4(host),
          dns.resolve6(host),
        ]);
        const ips = [
          ...(a.status === "fulfilled" ? a.value : []),
          ...(aaaa.status === "fulfilled" ? aaaa.value : []),
        ];
        if (ips.some((ip) => URLSecurityAnalyzer.isPrivateOrLoopbackIp(ip))) {
          evidence.ssrfProtected = true;
          throw new Error(`SSRF DNS rebinding blocked destination: ${host}`);
        }
      } catch (dnsErr: any) {
        if (dnsErr.message?.includes("SSRF")) throw dnsErr;
      }
    }

    return new Promise((resolve, reject) => {
      const isHttps = parsedUrl.protocol === "https:";
      const client = isHttps ? https : http;

      evidence.tls = null;

      const req = client.get(
        parsedUrl.href,
        {
          timeout: 4000,
          headers: {
            "User-Agent": "Sentinel-AI-Security-Probe/2.0 (Security Telemetry)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        },
        (res) => {
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
            let nextLocation = res.headers.location;
            if (!nextLocation.startsWith("http://") && !nextLocation.startsWith("https://")) {
              nextLocation = new URL(nextLocation, parsedUrl.href).href;
            }

            evidence.redirects?.push(nextLocation);
            evidence.networkRedirectStatus = "VERIFIED_HTTP_CHAIN";

            // Drain data and resume
            res.resume();

            this.fetchHttpEvidence(nextLocation, evidence, hopCount + 1)
              .then(resolve)
              .catch(reject);
            return;
          }

          // Terminal response reached
          evidence.finalUrl = parsedUrl.href;
          evidence.statusCode = status;
          evidence.headers = res.headers as Record<string, unknown>;

          // Bounded response read (max 512KB) to protect against decompression bombs / memory exhaustion
          let bytesRead = 0;
          const maxBytes = 512 * 1024;

          res.on("data", (chunk: Buffer) => {
            bytesRead += chunk.length;
            if (bytesRead > maxBytes) {
              res.destroy();
              resolve();
            }
          });

          res.on("end", () => {
            resolve();
          });
        }
      );

      req.on("error", (err) => {
        reject(new Error(`Network Error: ${err.message}`));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Network Error: Connection timed out"));
      });
    });
  }
}
