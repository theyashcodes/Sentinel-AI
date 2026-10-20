"use client";

import { useState } from "react";
import {
  GitFork,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Server,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import type { TracerResult } from "@/lib/scanner/tracer";
import { notifyCyBroScanComplete } from "@/lib/cybro/events";

export function RedirectTracerView() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TracerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTrace = async (targetUrl?: string) => {
    const toScan = (targetUrl || url).trim();
    if (!toScan) return;

    if (targetUrl) setUrl(targetUrl);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/tracer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: toScan }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to trace URL");
      }

      setResult(data);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
      }

      // Notify CyBro for real-time optimal safe action advisory
      notifyCyBroScanComplete({
        tool: "tracer",
        target: toScan,
        isThreat: !!data.impersonation?.detected,
        threatLevel: data.impersonation?.detected ? "malicious" : "clean",
        summary: data.impersonation?.detected
          ? `Homoglyph impersonation targeting ${data.impersonation.targetBrand || "trusted brand"}`
          : `Safely resolved ${data.hops?.length || 1} hops to ${data.finalUrl || toScan}`,
        findings: data.impersonation?.detected
          ? [`Spoofed Brand: ${data.impersonation.targetBrand}`, `Punycode: ${data.impersonation.punycode}`]
          : [`Final destination: ${data.finalUrl || toScan}`],
        rawResult: data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze URL redirects");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return { text: "var(--ok)", border: "rgba(21,128,61,0.35)", bg: "rgba(21,128,61,0.08)" };
    if (status >= 300 && status < 400) return { text: "var(--warn)", border: "rgba(180,83,9,0.35)", bg: "rgba(180,83,9,0.08)" };
    return { text: "var(--crit)", border: "rgba(220,38,38,0.35)", bg: "rgba(220,38,38,0.08)" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "980px" }}>
      {/* ── Input Panel ── */}
      <div
        className="void-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <GitFork style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
          <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
            Deep URL Unmasker & Redirect Tracer
          </span>
        </div>

        <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.6, fontWeight: 400 }}>
          Inspect hidden HTTP redirect chains (301/302 hops), unmask shortlinks (bit.ly, t.co), and expose visual homoglyph character spoofing designed to bypass human perception and email spam filters.
        </p>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrace();
          }}
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter shortlink or suspicious URL (e.g. bit.ly/xyz, pаypal.com, or full link)"
            style={{
              flex: 1,
              minWidth: "260px",
              height: "46px",
              padding: "0 1rem",
              backgroundColor: "var(--ground-secondary)",
              border: "1px solid var(--hair-10)",
              borderRadius: 0,
              color: "var(--ink)",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="btn-accent"
            style={{ height: "46px", padding: "0 1.5rem", fontWeight: 600 }}
          >
            {loading ? "Unmasking..." : "Trace Redirects"}
          </button>
        </form>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "var(--panel-card)",
              border: "1px solid var(--crit)",
              borderLeft: "4px solid var(--crit)",
              color: "var(--crit)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ── Results Container ── */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* ── 1. Impersonation / Homoglyph Alert Banner ── */}
          {result.impersonation.detected ? (
            <div
              style={{
                padding: "1.5rem",
                backgroundColor: "var(--panel-card)",
                border: "1px solid rgba(220,38,38,0.4)",
                borderLeft: "4px solid var(--crit)",
                boxShadow: "var(--panel-shadow)",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldAlert style={{ width: "18px", height: "18px", color: "var(--crit)", flexShrink: 0 }} />
                  <span className="label" style={{ color: "var(--crit)", fontWeight: 600, fontSize: "12px" }}>
                    Brand Impersonation & Homoglyph Threat Detected
                  </span>
                </div>
                <span
                  className="chip"
                  style={{
                    color: "var(--crit)",
                    borderColor: "rgba(220,38,38,0.4)",
                    backgroundColor: "rgba(220,38,38,0.08)",
                    fontWeight: 600,
                  }}
                >
                  RISK SCORE: {result.impersonation.riskScore}/100
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--ink)", margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                {result.impersonation.explanation}
              </p>
              <div style={{ display: "flex", gap: "2rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                <div>
                  <span className="label" style={{ color: "var(--muted)", fontWeight: 600 }}>Spoofed Entity:</span>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--crit)", margin: "0.15rem 0 0 0" }}>
                    {result.impersonation.targetBrand}
                  </p>
                </div>
                <div>
                  <span className="label" style={{ color: "var(--muted)", fontWeight: 600 }}>Attack Technique:</span>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: "0.15rem 0 0 0" }}>
                    {result.impersonation.similarityType}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "1.25rem 1.5rem",
                backgroundColor: "var(--panel-card)",
                border: "1px solid rgba(21,128,61,0.35)",
                borderLeft: "4px solid var(--ok)",
                boxShadow: "var(--panel-shadow)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <ShieldCheck style={{ width: "20px", height: "20px", color: "var(--ok)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "14px", color: "var(--ink)", margin: 0, fontWeight: 600 }}>
                  No Brand Impersonation or Lookalike Homoglyphs Detected.
                </p>
                <p className="label" style={{ color: "var(--ok)", margin: "0.2rem 0 0 0", fontWeight: 500 }}>
                  Domain character set passed ASCII verification.
                </p>
              </div>
            </div>
          )}

          {/* ── 2. Final Destination Unmasking Summary ── */}
          <div
            className="void-panel"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="label" style={{ color: "var(--muted)", fontWeight: 600 }}>Final Landed Destination</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="chip" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  Total Hops: {result.totalHops}
                </span>
                {result.isCrossDomainRedirect && (
                  <span className="chip" style={{ color: "var(--warn)", borderColor: "rgba(180,83,9,0.4)", backgroundColor: "rgba(180,83,9,0.08)", fontWeight: 600 }}>
                    Cross-Domain Jump
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                padding: "1rem 1.25rem",
                backgroundColor: "var(--ground-secondary)",
                border: "1px solid var(--hair-10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    margin: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {result.finalUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(result.finalUrl)}
                className="btn-ghost"
                style={{ padding: "0.45rem 0.85rem", flexShrink: 0, fontWeight: 500 }}
              >
                <Copy style={{ width: "12px", height: "12px" }} />
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* ── 3. Hop-by-Hop Visual Rail ── */}
          <div
            className="void-panel"
            style={{
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--hair-06)" }}>
              <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>Hop-by-Hop Routing Sequence</span>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0.25rem 0 0 0", fontWeight: 400 }}>
                Chronological network resolution journey from source request to final endpoint.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
              {result.hops.map((hop, index) => {
                const statusColor = getStatusColor(hop.status);
                const isFinal = index === result.hops.length - 1;

                return (
                  <div
                    key={hop.hop}
                    style={{
                      padding: "1.25rem",
                      border: "1px solid var(--hair-10)",
                      backgroundColor: "var(--panel-card)",
                      boxShadow: "var(--panel-shadow)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      position: "relative",
                    }}
                  >
                    {/* Header line of hop */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span
                          className="chip"
                          style={{
                            backgroundColor: isFinal ? "var(--accent-subtle)" : "var(--ground-secondary)",
                            color: isFinal ? "var(--accent)" : "var(--ink)",
                            borderColor: isFinal ? "var(--accent)" : "var(--hair-10)",
                            fontWeight: 600,
                          }}
                        >
                          {isFinal ? `FINAL DESTINATION (HOP ${hop.hop})` : `HOP ${hop.hop}`}
                        </span>

                        <span
                          className="chip"
                          style={{
                            color: statusColor.text,
                            borderColor: statusColor.border,
                            backgroundColor: statusColor.bg,
                            fontWeight: 600,
                          }}
                        >
                          {hop.status} {hop.statusText}
                        </span>

                        {hop.isCrossDomain && (
                          <span className="chip" style={{ color: "var(--warn)", borderColor: "rgba(180,83,9,0.4)", fontWeight: 600 }}>
                            Domain Changed
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span className="label" style={{ color: "var(--muted)", fontWeight: 500 }}>
                          <Clock style={{ width: "11px", height: "11px", display: "inline", marginRight: "4px" }} />
                          {hop.responseTimeMs} ms
                        </span>
                      </div>
                    </div>

                    {/* Target URL */}
                    <div>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "var(--ink)",
                          margin: 0,
                          wordBreak: "break-all",
                        }}
                      >
                        {hop.url}
                      </p>
                    </div>

                    {/* Metadata footer of hop */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", paddingTop: "0.5rem", borderTop: "1px solid var(--hair-06)" }}>
                      {hop.ipAddress && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Globe style={{ width: "12px", height: "12px", color: "var(--muted)" }} />
                          <span className="label" style={{ color: "var(--muted)", fontWeight: 500 }}>IP: {hop.ipAddress}</span>
                        </div>
                      )}
                      {hop.server && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Server style={{ width: "12px", height: "12px", color: "var(--muted)" }} />
                          <span className="label" style={{ color: "var(--muted)", fontWeight: 500 }}>Server: {hop.server}</span>
                        </div>
                      )}
                      {hop.contentType && (
                        <span className="label" style={{ color: "var(--muted)", fontWeight: 500 }}>MIME: {hop.contentType}</span>
                      )}
                    </div>

                    {/* Downward arrow connector if there is a next hop */}
                    {!isFinal && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "18px",
                          margin: "-0.25rem 0",
                        }}
                      >
                        <div style={{ width: "1px", height: "100%", backgroundColor: "var(--hair-10)" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 4. Security Headers Audit on Final Target ── */}
          <div
            className="void-panel"
            style={{
              padding: "1.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--hair-06)" }}>
              <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>Final Target Security Headers Checklist</span>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0.25rem 0 0 0", fontWeight: 400 }}>
                Verification of industry-standard browser hardening headers on the final landed endpoint.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div style={{ padding: "1rem", backgroundColor: "var(--panel-card)", border: "1px solid var(--hair-10)", boxShadow: "var(--panel-shadow)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>HTTPS Enforced</span>
                  {result.securityHeaders.httpsEnforced ? (
                    <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--ok)" }} />
                  ) : (
                    <XCircle style={{ width: "16px", height: "16px", color: "var(--crit)" }} />
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.35rem 0 0 0", fontWeight: 400 }}>
                  {result.securityHeaders.httpsEnforced ? "Encrypted TLS transport active" : "Insecure HTTP transport"}
                </p>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "var(--panel-card)", border: "1px solid var(--hair-10)", boxShadow: "var(--panel-shadow)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>HSTS Active</span>
                  {result.securityHeaders.hsts ? (
                    <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--ok)" }} />
                  ) : (
                    <XCircle style={{ width: "16px", height: "16px", color: "var(--warn)" }} />
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.35rem 0 0 0", fontWeight: 400 }}>
                  {result.securityHeaders.hsts ? "Strict-Transport-Security enabled" : "Missing HSTS downgrade protection"}
                </p>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "var(--panel-card)", border: "1px solid var(--hair-10)", boxShadow: "var(--panel-shadow)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>CSP Policy</span>
                  {result.securityHeaders.contentSecurityPolicy ? (
                    <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--ok)" }} />
                  ) : (
                    <XCircle style={{ width: "16px", height: "16px", color: "var(--warn)" }} />
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.35rem 0 0 0", fontWeight: 400 }}>
                  {result.securityHeaders.contentSecurityPolicy ? "XSS restriction policy active" : "Content-Security-Policy absent"}
                </p>
              </div>

              <div style={{ padding: "1rem", backgroundColor: "var(--panel-card)", border: "1px solid var(--hair-10)", boxShadow: "var(--panel-shadow)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>Clickjack Defense</span>
                  {result.securityHeaders.xFrameOptions ? (
                    <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--ok)" }} />
                  ) : (
                    <XCircle style={{ width: "16px", height: "16px", color: "var(--warn)" }} />
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.35rem 0 0 0", fontWeight: 400 }}>
                  {result.securityHeaders.xFrameOptions ? `X-Frame-Options: ${result.securityHeaders.xFrameOptions}` : "Framing protection not declared"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
