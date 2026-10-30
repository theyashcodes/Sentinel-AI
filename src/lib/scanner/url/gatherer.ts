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

export interface DnsResolverInterface {
  resolve4?: (hostname: string) => Promise<string[]>;
  resolve6?: (hostname: string) => Promise<string[]>;
  resolveMx?: (hostname: string) => Promise<any[]>;
  resolveTxt?: (hostname: string) => Promise<any[]>;
}

export interface GatherOptions {
  customDnsResolver?: DnsResolverInterface;
  timeoutMs?: number;
  simulateSocketRemoteAddress?: string;
}

export interface ValidatedDestination {
  hostname: string;
  unbracketedHost: string;
  isIpLiteral: boolean;
  approvedIps: string[];
  pinnedRecords: Array<{ address: string; family: 4 | 6 }>;
  dns?: {
    a: string[];
    aaaa: string[];
    mx: any[];
    txt: any[];
  } | null;
}

export class EvidenceGatherer {
  /**
   * Evaluates HTTP security response headers deterministically.
   * Never infers security header results from the URL string alone.
   */
  static evaluateSecurityHeaders(
    headers: Record<string, unknown> | null | undefined,
    isHttps: boolean,
    isSsrfBlocked: boolean = false
  ): SecurityHeadersAudit {
    if (!headers || Object.keys(headers).length === 0) {
      const explanation = isSsrfBlocked
        ? "Skipped because the outbound request was blocked by SSRF policy."
        : "HTTP response headers were not fetched or network request was blocked.";
      return {
        overallStatus: "NOT_TESTED",
        strictTransportSecurity: {
          name: "Strict-Transport-Security",
          key: "strict-transport-security",
          desc: "HSTS Encrypted Gating",
          status: "NOT_TESTED",
          explanation,
        },
        contentSecurityPolicy: {
          name: "Content-Security-Policy",
          key: "content-security-policy",
          desc: "Script/Resource Sandboxing",
          status: "NOT_TESTED",
          explanation,
        },
        xFrameOptions: {
          name: "X-Frame-Options",
          key: "x-frame-options",
          desc: "Clickjacking Prevention",
          status: "NOT_TESTED",
          explanation,
        },
        xContentTypeOptions: {
          name: "X-Content-Type-Options",
          key: "x-content-type-options",
          desc: "MIME-sniffing Block",
          status: "NOT_TESTED",
          explanation,
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
   * Resolves and validates all destination IP addresses before connecting.
   * Defends against DNS rebinding, private/loopback/link-local/metadata SSRF attacks,
   * alternate IP encodings, and empty/failed DNS lookups.
   */
  static async resolveAndValidateDestination(
    rawHostname: string,
    resolver?: DnsResolverInterface
  ): Promise<ValidatedDestination> {
    const cleanHost = rawHostname.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
    const unbracketedHost = cleanHost.replace(/^\[|\]$/g, "");

    // 1. Check if hostname is an IP literal
    const ipVersion = net.isIP(unbracketedHost);
    if (ipVersion !== 0) {
      if (URLSecurityAnalyzer.isPrivateOrLoopbackIp(unbracketedHost)) {
        throw new Error(`SSRF blocked prohibited destination: ${unbracketedHost}`);
      }
      return {
        hostname: cleanHost,
        unbracketedHost,
        isIpLiteral: true,
        approvedIps: [unbracketedHost],
        pinnedRecords: [{ address: unbracketedHost, family: ipVersion as 4 | 6 }],
        dns: null,
      };
    }

    // 2. Reject internal/localhost named domains immediately
    if (URLSecurityAnalyzer.isPrivateOrLoopbackIp(unbracketedHost)) {
      throw new Error(`SSRF blocked prohibited destination: ${unbracketedHost}`);
    }

    // 3. Resolve all A and AAAA records using custom resolver or system resolver
    const r4 = resolver?.resolve4 ? resolver.resolve4(unbracketedHost) : dns.resolve4(unbracketedHost);
    const r6 = resolver?.resolve6 ? resolver.resolve6(unbracketedHost) : dns.resolve6(unbracketedHost);
    const [aResult, aaaaResult] = await Promise.allSettled([r4, r6]);

    const resolvedA = aResult.status === "fulfilled" && Array.isArray(aResult.value) ? aResult.value : [];
    const resolvedAaaa = aaaaResult.status === "fulfilled" && Array.isArray(aaaaResult.value) ? aaaaResult.value : [];
    const allIps = [...resolvedA, ...resolvedAaaa];

    // 4. Handle DNS resolution failures or empty responses safely
    if (allIps.length === 0) {
      if (aResult.status === "rejected" && aaaaResult.status === "rejected") {
        const reason =
          (aResult.reason as any)?.message ||
          (aaaaResult.reason as any)?.message ||
          "DNS resolution failed";
        throw new Error(`DNS resolution failed for ${unbracketedHost}: ${reason}`);
      }
      throw new Error(`DNS resolution returned no A or AAAA records for ${unbracketedHost}`);
    }

    // 5. Reject private, loopback, link-local, metadata, multicast, or any prohibited destination
    for (const ip of allIps) {
      const cleanIp = ip.trim().replace(/^\[|\]$/g, "");
      if (URLSecurityAnalyzer.isPrivateOrLoopbackIp(cleanIp)) {
        throw new Error(`SSRF DNS rebinding blocked destination: ${unbracketedHost} resolved to prohibited IP ${cleanIp}`);
      }
    }

    const uniqueIps = Array.from(new Set(allIps));
    const pinnedRecords = uniqueIps.map((ip) => ({
      address: ip,
      family: (net.isIPv6(ip) ? 6 : 4) as 4 | 6,
    }));

    return {
      hostname: cleanHost,
      unbracketedHost,
      isIpLiteral: false,
      approvedIps: uniqueIps,
      pinnedRecords,
      dns: {
        a: resolvedA,
        aaaa: resolvedAaaa,
        mx: [],
        txt: [],
      },
    };
  }

  /**
   * Performs outbound evidence collection with strict SSRF controls,
   * pinned DNS resolution against rebinding, redirect chain auditing, and response truncation.
   */
  static async gather(
    normalizedUrl: string,
    hostname: string,
    options?: GatherOptions
  ): Promise<URLEvidence> {
    const evidence: URLEvidence = {
      redirects: [],
      networkRedirectStatus: "NOT_TESTED",
      securityHeadersAudit: this.evaluateSecurityHeaders(null, normalizedUrl.startsWith("https")),
    };

    // 1. Destination pre-flight resolution & DNS rebinding validation
    let validation: ValidatedDestination | undefined;
    try {
      validation = await this.resolveAndValidateDestination(hostname, options?.customDnsResolver);
      if (validation.dns) {
        // Best effort MX and TXT telemetry
        try {
          const rMx = options?.customDnsResolver?.resolveMx
            ? options.customDnsResolver.resolveMx(validation.unbracketedHost)
            : dns.resolveMx(validation.unbracketedHost);
          const rTxt = options?.customDnsResolver?.resolveTxt
            ? options.customDnsResolver.resolveTxt(validation.unbracketedHost)
            : dns.resolveTxt(validation.unbracketedHost);
          const [mx, txt] = await Promise.allSettled([rMx, rTxt]);
          validation.dns.mx = mx.status === "fulfilled" && Array.isArray(mx.value) ? mx.value : [];
          validation.dns.txt = txt.status === "fulfilled" && Array.isArray(txt.value) ? txt.value : [];
        } catch {
          // non-fatal
        }
        evidence.dns = validation.dns;
      }
    } catch (dnsErr: any) {
      if (dnsErr.message?.includes("SSRF")) {
        evidence.ssrfProtected = true;
        evidence.networkRedirectStatus = "BLOCKED_SSRF";
        evidence.headers = {
          "x-sentinel-ssrf-block":
            `Prohibited internal or loopback destination. Network probe blocked: ${dnsErr.message}`,
        };
        evidence.securityHeadersAudit = this.evaluateSecurityHeaders(null, normalizedUrl.startsWith("https"), true);
        return evidence;
      }
      evidence.dns = null;
    }

    // 2 & 3. Run WHOIS Lookup & HTTP Inspection concurrently to maximize speed and prevent timeouts
    const whoisPromise = (async () => {
      try {
        const isSynthetic =
          hostname.endsWith(".test") ||
          hostname.endsWith(".example") ||
          hostname.endsWith(".invalid") ||
          hostname.endsWith(".localhost") ||
          net.isIP(hostname.replace(/^\[|\]$/g, "")) !== 0;
        if (!isSynthetic) {
          const whoisProvider = whoisRegistry.getProvider();
          const whoisData = await whoisProvider.lookup(hostname);
          if (whoisData) {
            evidence.whois = whoisData as unknown as Record<string, unknown>;
          }
        }
      } catch {
        evidence.whois = null;
      }
    })();

    const httpPromise = (async () => {
      try {
        await this.fetchHttpEvidence(normalizedUrl, evidence, 0, options, validation);
      } catch (err: any) {
        if (err?.message?.includes("SSRF") || evidence.ssrfProtected) {
          evidence.ssrfProtected = true;
          evidence.networkRedirectStatus = "BLOCKED_SSRF";
          if (!evidence.headers) {
            evidence.headers = {};
          }
          (evidence.headers as Record<string, unknown>)["x-sentinel-ssrf-block"] =
            `Prohibited internal or loopback destination. Network scan aborted: ${err?.message || ""}`;
        } else {
          evidence.networkRedirectStatus = "FAILED";
        }
      }
    })();

    await Promise.allSettled([whoisPromise, httpPromise]);

    // 4. Compute verified security headers audit
    const isFinalHttps = (evidence.finalUrl || normalizedUrl).startsWith("https");
    const isSsrfEnforced = Boolean(evidence.ssrfProtected || evidence.networkRedirectStatus === "BLOCKED_SSRF");
    evidence.securityHeadersAudit = this.evaluateSecurityHeaders(evidence.headers, isFinalHttps, isSsrfEnforced);

    return evidence;
  }

  private static async fetchHttpEvidence(
    url: string,
    evidence: URLEvidence,
    hopCount = 0,
    options?: GatherOptions,
    preValidation?: ValidatedDestination
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
    const unbracketedHost = host.replace(/^\[|\]$/g, "");

    // Resolve and validate destination for this hop
    let validation: ValidatedDestination;
    if (preValidation && preValidation.unbracketedHost.toLowerCase() === unbracketedHost) {
      validation = preValidation;
    } else {
      validation = await this.resolveAndValidateDestination(
        parsedUrl.hostname,
        options?.customDnsResolver
      );
    }

    const approvedIpSet = new Set<string>(validation.approvedIps);
    for (const ip of validation.approvedIps) {
      if (net.isIPv4(ip)) {
        approvedIpSet.add(`::ffff:${ip}`);
      }
    }

    // Custom pinned DNS lookup: ensures TCP connection connects ONLY to pre-validated public IPs.
    // Eliminates DNS time-of-check / time-of-use (TOCTOU) rebinding.
    const pinnedLookup: any = (lookupHost: string, lookupOpts: any, cb?: any) => {
      const callback = (typeof lookupOpts === "function" ? lookupOpts : cb) as (
        err: NodeJS.ErrnoException | null,
        address?: any,
        family?: number
      ) => void;
      const lookupOptions = (typeof lookupOpts === "object" ? lookupOpts : {}) as {
        family?: number;
        hints?: number;
        all?: boolean;
      };

      if (lookupHost.toLowerCase() !== validation.unbracketedHost.toLowerCase()) {
        const err: any = new Error(`SSRF blocked host mismatch in DNS lookup: ${lookupHost}`);
        err.code = "ENOTFOUND";
        return callback(err);
      }

      let candidates = validation.pinnedRecords;
      if (lookupOptions.family === 4) {
        const f4 = candidates.filter((c) => c.family === 4);
        if (f4.length > 0) candidates = f4;
      } else if (lookupOptions.family === 6) {
        const f6 = candidates.filter((c) => c.family === 6);
        if (f6.length > 0) candidates = f6;
      }

      if (candidates.length === 0 || !candidates[0]) {
        const err: any = new Error(`No approved IP address available for ${lookupHost}`);
        err.code = "ENOTFOUND";
        return callback(err);
      }

      if (lookupOptions.all) {
        return callback(null, candidates);
      }

      const primary = candidates[0];
      return callback(null, primary.address, primary.family);
    };

    return new Promise((resolve, reject) => {
      const isHttps = parsedUrl.protocol === "https:";
      const client = isHttps ? https : http;
      const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (isHttps ? 443 : 80);

      evidence.tls = null;

      const requestOptions: https.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: validation.unbracketedHost,
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          "Host": parsedUrl.host,
          "User-Agent": "Sentinel-AI-Security-Probe/2.0 (Security Telemetry)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: options?.timeoutMs || 4000,
        servername: isHttps ? validation.unbracketedHost : undefined,
        lookup: pinnedLookup,
      };

      const req = client.request(requestOptions, (res) => {
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

        // Handle Redirects with identical SSRF validation and socket pinning
        if (status >= 300 && status < 400 && res.headers.location) {
          let nextLocation = res.headers.location;
          if (!nextLocation.startsWith("http://") && !nextLocation.startsWith("https://")) {
            nextLocation = new URL(nextLocation, parsedUrl.href).href;
          }

          evidence.redirects?.push(nextLocation);
          evidence.networkRedirectStatus = "VERIFIED_HTTP_CHAIN";

          // Drain data and resume
          res.resume();

          this.fetchHttpEvidence(nextLocation, evidence, hopCount + 1, options)
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
      });

      // Defense-in-depth: Validate connected socket remoteAddress against the approved IP set
      req.on("socket", (socket: net.Socket) => {
        // Prevent unhandled error event crash on socket instance
        socket.on("error", () => {});

        const verifySocketAddress = () => {
          const rawRemote = options?.simulateSocketRemoteAddress || socket.remoteAddress;
          if (!rawRemote) {
            return;
          }

          const cleanRemote = rawRemote.replace(/^\[|\]$/g, "").replace(/^::ffff:/i, "");
          const isApproved = approvedIpSet.has(rawRemote) || approvedIpSet.has(cleanRemote);
          const isProhibited =
            URLSecurityAnalyzer.isPrivateOrLoopbackIp(rawRemote) ||
            URLSecurityAnalyzer.isPrivateOrLoopbackIp(cleanRemote);

          if (!isApproved || isProhibited) {
            evidence.ssrfProtected = true;
            const rebindingErr = new Error(
              `SSRF DNS rebinding blocked destination: socket remoteAddress ${rawRemote} is prohibited or not in approved IP set`
            );
            socket.destroy(rebindingErr);
            req.destroy(rebindingErr);
          }
        };

        if (options?.simulateSocketRemoteAddress) {
          verifySocketAddress();
        } else if (socket.connecting) {
          socket.once("connect", verifySocketAddress);
          if (isHttps) {
            socket.once("secureConnect", verifySocketAddress);
          }
        } else {
          verifySocketAddress();
        }
      });

      req.on("error", (err: any) => {
        if (err?.message?.includes("SSRF") || evidence.ssrfProtected) {
          evidence.ssrfProtected = true;
          reject(err);
        } else {
          reject(new Error(`Network Error: ${err.message}`));
        }
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Network Error: Connection timed out"));
      });

      req.end();
    });
  }
}
