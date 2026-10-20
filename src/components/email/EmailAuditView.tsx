"use client";

import { useState, useRef } from "react";
import {
  Mail,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  Lock,
  Unlock,
  Server,
  Clock,
  Fingerprint,
  Info,
} from "lucide-react";
import type { EmailForensicReport } from "@/lib/email/emailParser";
import { notifyCyBroScanComplete } from "@/lib/cybro/events";

export function EmailAuditView() {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<EmailForensicReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setResult(null);
    setFile(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRawText("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runAnalysis = async () => {
    if (activeTab === "file" && !file) return;
    if (activeTab === "paste" && !rawText.trim()) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let res: Response;
      if (activeTab === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/email-audit", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      } else {
        res = await fetch("/api/email-audit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText }),
        });
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("Email file is too large for server analysis. Please upload a file under 4.5 MB.");
        }
        let errorMsg = "Failed to analyze email headers";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          const text = await res.text();
          if (text) errorMsg = text.slice(0, 100);
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      setResult(data);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
      }

      // Notify CyBro for real-time optimal safe action advisory
      const isThreat = data.verdict === "CRITICAL_PHISHING" || data.verdict === "SUSPICIOUS";
      notifyCyBroScanComplete({
        tool: "email",
        target: data.from?.address || data.from?.raw || "Analyzed Email",
        isThreat,
        threatLevel: data.verdict === "CRITICAL_PHISHING" ? "malicious" : data.verdict === "SUSPICIOUS" ? "suspicious" : "clean",
        summary: `Email Verdict: ${data.verdict}. Subject: ${data.subject || "No Subject"}. DMARC: ${data.authentication?.dmarc?.status || "NONE"}.`,
        findings: [
          `SPF: ${data.authentication?.spf?.status || "NONE"}`,
          `DKIM: ${data.authentication?.dkim?.status || "NONE"}`,
          `DMARC: ${data.authentication?.dmarc?.status || "NONE"}`,
          `Spoofed Sender: ${data.isSpoofed ? "YES" : "NO"}`,
        ],
        rawResult: data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error analyzing email headers");
    } finally {
      setAnalyzing(false);
    }
  };

  const getVerdictDetails = (verdict: EmailForensicReport["verdict"]) => {
    switch (verdict) {
      case "CRITICAL_PHISHING":
        return {
          title: "CRITICAL PHISHING SCAM DETECTED",
          color: "var(--crit)",
          bg: "rgba(220,38,38,0.06)",
          border: "rgba(220,38,38,0.35)",
          icon: ShieldAlert,
        };
      case "SUSPICIOUS":
        return {
          title: "SUSPICIOUS / DECEPTIVE EMAIL",
          color: "var(--warn)",
          bg: "rgba(180,83,9,0.06)",
          border: "rgba(180,83,9,0.35)",
          icon: AlertTriangle,
        };
      default:
        return {
          title: "AUTHENTIC LEGITIMATE EMAIL VERIFIED",
          color: "var(--ok)",
          bg: "rgba(21,128,61,0.06)",
          border: "rgba(21,128,61,0.35)",
          icon: ShieldCheck,
        };
    }
  };

  const renderSealPill = (status: "PASS" | "FAIL" | "SOFTFAIL" | "NEUTRAL" | "NONE") => {
    if (status === "PASS") {
      return (
        <span
          className="chip"
          style={{
            color: "var(--ok)",
            borderColor: "rgba(21,128,61,0.35)",
            backgroundColor: "rgba(21,128,61,0.08)",
            fontWeight: 700,
          }}
        >
          ✓ PASS
        </span>
      );
    }
    if (status === "FAIL") {
      return (
        <span
          className="chip"
          style={{
            color: "var(--crit)",
            borderColor: "rgba(220,38,38,0.35)",
            backgroundColor: "rgba(220,38,38,0.08)",
            fontWeight: 700,
          }}
        >
          ✕ FAILED
        </span>
      );
    }
    return (
      <span
        className="chip"
        style={{
          color: "var(--muted)",
          borderColor: "var(--hair-10)",
          fontWeight: 600,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px" }}>
      {/* ── Intro Panel ── */}
      <div
        className="void-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Mail style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600, fontSize: "14px" }}>
              Phishing Email & Delivery Header Dissector
            </span>
          </div>
          <span
            className="chip"
            style={{
              color: "var(--accent)",
              borderColor: "rgba(59,130,246,0.35)",
              backgroundColor: "rgba(59,130,246,0.06)",
              fontWeight: 500,
            }}
          >
            SPF • DKIM • DMARC • Display Name Spoofing • Relay Trail
          </span>
        </div>

        <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.6, fontWeight: 400 }}>
          Unmask fraudulent emails, CEO fraud, and fake banking alerts. Upload an <strong>.eml file</strong> or paste raw RFC 822 email headers (from Gmail <em>&quot;Show original&quot;</em> or Outlook). Detects hidden return-path discrepancies, failed cryptographic seals, origin relay IPs, and artificial urgency tactics.
        </p>

        {/* ── Input Tabs Selector ── */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--hair-10)", paddingBottom: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            style={{
              padding: "0.5rem 1rem",
              background: activeTab === "file" ? "var(--ground-secondary)" : "transparent",
              border: "1px solid",
              borderColor: activeTab === "file" ? "var(--hair-15)" : "transparent",
              color: activeTab === "file" ? "var(--ink)" : "var(--muted)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <UploadCloud style={{ width: "14px", height: "14px" }} />
            Upload .eml File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            style={{
              padding: "0.5rem 1rem",
              background: activeTab === "paste" ? "var(--ground-secondary)" : "transparent",
              border: "1px solid",
              borderColor: activeTab === "paste" ? "var(--hair-15)" : "transparent",
              color: activeTab === "paste" ? "var(--ink)" : "var(--muted)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FileText style={{ width: "14px", height: "14px" }} />
            Paste Raw Headers / Text
          </button>
        </div>

        {/* ── Tab 1: File Dropzone ── */}
        {activeTab === "file" && (
          !file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? "var(--accent)" : "var(--hair-15)"}`,
                padding: "3rem 1.5rem",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: dragActive ? "rgba(59,130,246,0.04)" : "var(--ground-secondary)",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml,.txt,message/rfc822"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                style={{ display: "none" }}
              />
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "var(--panel-card)",
                  border: "1px solid var(--hair-10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                }}
              >
                <UploadCloud style={{ width: "24px", height: "24px" }} />
              </div>
              <div>
                <p style={{ margin: "0 0 0.25rem 0", fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
                  Drop .eml email file here or click to browse
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                  Exported from Gmail (&quot;Download message&quot;) or Outlook / Apple Mail
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "var(--ground-secondary)",
                border: "1px solid var(--hair-10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Mail style={{ width: "22px", height: "22px", color: "var(--accent)" }} />
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
                    {file.name}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                    {(file.size / 1024).toFixed(1)} KB • EML Message
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={analyzing}
                  className="btn-ghost"
                  style={{ height: "38px", padding: "0 0.85rem", fontSize: "12px" }}
                >
                  <RotateCcw style={{ width: "12px", height: "12px", marginRight: "4px" }} />
                  Change
                </button>
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="btn-accent"
                  style={{ height: "38px", padding: "0 1.25rem", fontSize: "13px", fontWeight: 600 }}
                >
                  {analyzing ? "Dissecting Headers..." : "Dissect Email"}
                </button>
              </div>
            </div>
          )
        )}

        {/* ── Tab 2: Raw Text Area ── */}
        {activeTab === "paste" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw email headers here...&#10;From: &quot;State Bank of India&quot; <alert@sbi-verify.xyz>&#10;Subject: Urgent: Your Account is Blocked!&#10;Return-Path: <bounce@attacker-vps.ru>&#10;Received: from mail.attacker-vps.ru (185.220.101.5)..."
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: "var(--ground-secondary)",
                border: "1px solid var(--hair-10)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                color: "var(--ink)",
                outline: "none",
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleReset}
                disabled={analyzing || !rawText}
                className="btn-ghost"
                style={{ height: "38px", padding: "0 1rem", fontSize: "12px" }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={runAnalysis}
                disabled={analyzing || !rawText.trim()}
                className="btn-accent"
                style={{ height: "38px", padding: "0 1.25rem", fontSize: "13px", fontWeight: 600 }}
              >
                {analyzing ? "Dissecting..." : "Dissect Headers"}
              </button>
            </div>
          </div>
        )}

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
          {/* ── 1. Master Verdict Banner ── */}
          {(() => {
            const v = getVerdictDetails(result.verdict);
            const VerdictIcon = v.icon;
            return (
              <div
                style={{
                  padding: "1.5rem",
                  backgroundColor: "var(--panel-card)",
                  border: `1px solid ${v.border}`,
                  borderLeft: `5px solid ${v.color}`,
                  boxShadow: "var(--panel-shadow)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <VerdictIcon style={{ width: "20px", height: "20px", color: v.color, flexShrink: 0 }} />
                    <span className="label" style={{ color: v.color, fontWeight: 700, fontSize: "13px" }}>
                      {v.title}
                    </span>
                  </div>
                  <span
                    className="chip"
                    style={{
                      color: v.color,
                      borderColor: v.border,
                      backgroundColor: v.bg,
                      fontWeight: 700,
                    }}
                  >
                    PHISHING RISK: {result.riskScore}/100
                  </span>
                </div>

                <p style={{ fontSize: "14px", color: "var(--ink)", margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                  {result.summaryExplanation}
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "12px", color: "var(--muted)" }}>
                  <span>Subject:</span>
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{result.subject}</span>
                </div>
              </div>
            );
          })()}

          {/* ── 2. Sender Identity Unmasking Card ── */}
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Fingerprint style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  Sender Identity & Impersonation Unmasking
                </span>
              </div>
              {result.sender.isDisplayNameSpoofed && (
                <span
                  className="chip"
                  style={{
                    color: "var(--crit)",
                    borderColor: "rgba(220,38,38,0.35)",
                    backgroundColor: "rgba(220,38,38,0.08)",
                    fontWeight: 700,
                  }}
                >
                  DECEPTIVE BRAND SPOOF
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              {/* Display Name */}
              <div style={{ padding: "0.85rem", backgroundColor: "var(--ground-secondary)", border: "1px solid var(--hair-10)" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Display Name (What recipient sees):</span>
                <div style={{ fontSize: "14px", fontWeight: 700, color: result.sender.isDisplayNameSpoofed ? "var(--crit)" : "var(--ink)", marginTop: "4px" }}>
                  {result.sender.displayName || "(No Display Name)"}
                </div>
              </div>

              {/* Actual From Email */}
              <div style={{ padding: "0.85rem", backgroundColor: "var(--ground-secondary)", border: "1px solid var(--hair-10)" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Actual From Address:</span>
                <div style={{ fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "var(--ink)", marginTop: "4px", wordBreak: "break-all" }}>
                  {result.sender.fromEmail || "(Unknown)"}
                </div>
              </div>

              {/* Envelope Return-Path */}
              <div style={{ padding: "0.85rem", backgroundColor: "var(--ground-secondary)", border: "1px solid var(--hair-10)" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>Envelope Return-Path (Actual Bounce):</span>
                <div style={{ fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: result.sender.isDomainMismatch ? "var(--crit)" : "var(--ink)", marginTop: "4px", wordBreak: "break-all" }}>
                  {result.sender.returnPath || "(None)"}
                </div>
              </div>
            </div>

            {result.sender.isDisplayNameSpoofed && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.25)",
                  color: "var(--crit)",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                ⚠️ <strong>Brand Spoofing Alert:</strong> Sender is deliberately using the name <strong>&quot;{result.sender.spoofedBrand}&quot;</strong> to establish false trust, while emails are actually dispatched from untrusted domain <code>{result.sender.fromDomain}</code>.
              </div>
            )}
          </div>

          {/* ── 3. Cryptographic Security Seals (SPF / DKIM / DMARC) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* SPF Seal */}
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>SPF (Sender Policy)</span>
                {renderSealPill(result.securitySeals.spf)}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
                {result.securitySeals.spf === "PASS"
                  ? "Sending IP server is cryptographically authorized by domain DNS."
                  : result.securitySeals.spf === "FAIL"
                  ? "Unauthorized sending server IP! Server is not on domain's whitelist."
                  : "No SPF record found or softfail evaluation."}
              </p>
            </div>

            {/* DKIM Seal */}
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>DKIM Signature</span>
                {renderSealPill(result.securitySeals.dkim)}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
                {result.securitySeals.dkim === "PASS"
                  ? `Cryptographic digital signature verified (${result.securitySeals.dkimDomain || "domain"}). Message body untampered.`
                  : result.securitySeals.dkim === "FAIL"
                  ? "Digital signature verification failed! Body was altered or forged."
                  : "Message lacks DKIM cryptographic signing keys."}
              </p>
            </div>

            {/* DMARC Seal */}
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>DMARC Alignment</span>
                {renderSealPill(result.securitySeals.dmarc)}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
                {result.securitySeals.dmarc === "PASS"
                  ? "Domain authentication policy satisfied with strict alignment."
                  : result.securitySeals.dmarc === "FAIL"
                  ? "DMARC policy failed! Message rejected by strict anti-spoofing policy."
                  : "No DMARC policy published for this sender domain."}
              </p>
            </div>
          </div>

          {/* ── 4. Social Engineering Urgency Lures (if detected) ── */}
          {result.urgencySignals.length > 0 && (
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle style={{ width: "16px", height: "16px", color: "var(--warn)" }} />
                <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  Psychological Social Engineering Signals Detected
                </span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {result.urgencySignals.map((signal, idx) => (
                  <span
                    key={idx}
                    className="chip"
                    style={{
                      color: "var(--warn)",
                      borderColor: "rgba(180,83,9,0.35)",
                      backgroundColor: "rgba(180,83,9,0.08)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ {signal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Extracted Embedded Links ── */}
          {result.extractedLinks.length > 0 && (
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ExternalLink style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  Embedded Links Audit ({result.extractedLinks.length} target URLs)
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {result.extractedLinks.map((link, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.6rem 0.85rem",
                      backgroundColor: "var(--ground-secondary)",
                      border: `1px solid ${link.isSuspicious ? "rgba(220,38,38,0.3)" : "var(--hair-10)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "var(--ink)", wordBreak: "break-all" }}>
                      {link.url}
                    </span>
                    <span
                      className="chip"
                      style={{
                        fontSize: "10px",
                        color: link.isSuspicious ? "var(--crit)" : "var(--ok)",
                        borderColor: link.isSuspicious ? "rgba(220,38,38,0.35)" : "rgba(21,128,61,0.35)",
                      }}
                    >
                      {link.isSuspicious ? "HIGH RISK DESTINATION" : "CLEAN"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. Forensic Evidence Timeline ── */}
          <div
            className="void-panel"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
              Forensic Evidence Trail
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {result.forensicEvidence.map((ev, idx) => {
                let badgeColor = "var(--muted)";
                let badgeBg = "transparent";
                if (ev.status === "CRITICAL") {
                  badgeColor = "var(--crit)";
                  badgeBg = "rgba(220,38,38,0.06)";
                } else if (ev.status === "VERIFIED") {
                  badgeColor = "var(--ok)";
                  badgeBg = "rgba(21,128,61,0.06)";
                } else if (ev.status === "WARNING") {
                  badgeColor = "var(--warn)";
                  badgeBg = "rgba(180,83,9,0.06)";
                }

                return (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: "var(--ground-secondary)",
                      border: "1px solid var(--hair-10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        className="chip"
                        style={{
                          fontSize: "10px",
                          fontFamily: "'JetBrains Mono', monospace",
                          color: badgeColor,
                          backgroundColor: badgeBg,
                          borderColor: "var(--hair-10)",
                        }}
                      >
                        {ev.category}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>
                        {ev.detail}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: badgeColor,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {ev.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
