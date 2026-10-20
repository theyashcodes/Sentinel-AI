"use client";

import { useState, useRef } from "react";
import {
  Shield,
  Download,
  Copy,
  Check,
  X,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Printer,
  Globe,
  Lock,
} from "lucide-react";
import {
  ForensicReportData,
  ReportLanguage,
  generateLocalizedContent,
} from "@/lib/forensics/reportGenerator";

interface ForensicReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ForensicReportData | null;
}

export function ForensicReportModal({ isOpen, onClose, data }: ForensicReportModalProps) {
  const [lang, setLang] = useState<ReportLanguage>("en");
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const content = generateLocalizedContent(data, lang);
  const isCritical = data.riskLevel === "CRITICAL" || data.riskLevel === "HIGH";

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textReport = `========================================================
${content.title}
${content.subtitle}
========================================================
${content.classification}

${content.caseRefLabel}: ${data.caseId}
${content.dateLabel}: ${data.timestamp}
${content.examinerLabel}: ${data.examiner}
${content.targetLabel}: ${data.target}
${content.typeLabel}: ${data.type}

${content.verdictLabel}: ${data.threatCategory} (${data.confidenceScore}% Confidence)
RISK LEVEL: ${data.riskLevel}

${content.summaryTitle.toUpperCase()}:
${data.summary}

${content.evidenceTitle.toUpperCase()}:
${data.findings.map((f, i) => `  [${i + 1}] ${f}`).join("\n")}

${content.hashLabel}: ${data.sha256Hash}

${content.remediationTitle.toUpperCase()}:
${content.remediationSteps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

${content.disclaimer}
========================================================`;

    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="void-panel"
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "var(--panel-card, #ffffff)",
          border: "1px solid var(--hair-10, #e2e8f0)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Top Control Bar (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1.25rem",
            borderBottom: "1px solid var(--hair-10)",
            backgroundColor: "var(--ground-secondary, #f8fafc)",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {/* Language Selector Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
              Report Language:
            </span>
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "var(--panel-card)",
                border: "1px solid var(--hair-10)",
                padding: "2px",
              }}
            >
              <button
                onClick={() => setLang("en")}
                style={{
                  padding: "0.3rem 0.65rem",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: lang === "en" ? "var(--ink)" : "transparent",
                  color: lang === "en" ? "var(--ground, #fff)" : "var(--muted)",
                  transition: "all 0.15s ease",
                }}
              >
                English 🇬🇧
              </button>
              <button
                onClick={() => setLang("hi")}
                style={{
                  padding: "0.3rem 0.65rem",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: lang === "hi" ? "var(--ink)" : "transparent",
                  color: lang === "hi" ? "var(--ground, #fff)" : "var(--muted)",
                  transition: "all 0.15s ease",
                }}
              >
                हिंदी 🇮🇳
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={handleCopy}
              className="btn btn-secondary"
              style={{ fontSize: "11px", padding: "0.35rem 0.75rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
            >
              {copied ? <Check style={{ width: "12px", height: "12px", color: "var(--ok)" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
              <span>{copied ? (lang === "hi" ? "कॉपी हो गया!" : "Copied!") : (lang === "hi" ? "टेक्स्ट कॉपी करें" : "Copy Text")}</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ fontSize: "11px", padding: "0.35rem 0.85rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Printer style={{ width: "12px", height: "12px" }} />
              <span>{lang === "hi" ? "PDF डाउनलोड / प्रिंट" : "Save as PDF / Print"}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.35rem",
                color: "var(--muted)",
                marginLeft: "0.25rem",
              }}
              title="Close"
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div
          ref={printRef}
          id="forensic-dossier-print"
          style={{
            padding: "2.25rem",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            color: "#0f172a",
            backgroundColor: "#ffffff",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Dossier Header Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #0f172a",
              paddingBottom: "1.25rem",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <Shield style={{ width: "20px", height: "20px", color: "#2563eb" }} />
                <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.08em", color: "#0f172a" }}>
                  {content.title}
                </span>
              </div>
              <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "0.25rem 0", color: "#1e293b" }}>
                {content.subtitle}
              </h1>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "2px 8px",
                  backgroundColor: isCritical ? "#fee2e2" : "#ecfdf5",
                  color: isCritical ? "#b91c1c" : "#047857",
                  border: `1px solid ${isCritical ? "#f87171" : "#34d399"}`,
                  marginTop: "0.25rem",
                }}
              >
                {content.classification}
              </span>
            </div>

            {/* Case Reference Box */}
            <div
              style={{
                textAlign: "right",
                border: "1px dashed #cbd5e1",
                padding: "0.5rem 0.85rem",
                backgroundColor: "#f8fafc",
                minWidth: "210px",
              }}
            >
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                {content.caseRefLabel}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "monospace", color: "#0f172a" }}>
                {data.caseId}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                {data.timestamp}
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
              padding: "1rem",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          >
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>
                {content.targetLabel}
              </span>
              <strong style={{ color: "#0f172a", wordBreak: "break-all" }}>{data.target}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>
                {content.typeLabel}
              </span>
              <span style={{ fontWeight: 600, color: "#2563eb" }}>{data.type} FORENSICS</span>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>
                {content.verdictLabel}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: isCritical ? "#dc2626" : "#16a34a",
                }}
              >
                {data.threatCategory}
              </span>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "10px", textTransform: "uppercase" }}>
                {content.confidenceLabel}
              </span>
              <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>
                {data.confidenceScore}%
              </strong>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.35rem", marginBottom: "0.5rem" }}>
              {content.summaryTitle}
            </h2>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#334155", margin: 0 }}>
              {data.summary}
            </p>
          </div>

          {/* Section 2: Key Forensic Findings */}
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.35rem", marginBottom: "0.5rem" }}>
              {content.evidenceTitle}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.findings.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: isCritical ? "#fef2f2" : "#f0fdf4",
                    borderLeft: `3px solid ${isCritical ? "#ef4444" : "#22c55e"}`,
                    fontSize: "12px",
                  }}
                >
                  {isCritical ? (
                    <AlertTriangle style={{ width: "14px", height: "14px", color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                  ) : (
                    <ShieldCheck style={{ width: "14px", height: "14px", color: "#22c55e", flexShrink: 0, marginTop: "2px" }} />
                  )}
                  <span style={{ color: "#1e293b", fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Technical Evidence Telemetry Matrix */}
          {data.technicalEvidence && Object.keys(data.technicalEvidence).length > 0 && (
            <div>
              <h2 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.35rem", marginBottom: "0.5rem" }}>
                {content.techDetailsTitle}
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", border: "1px solid #e2e8f0" }}>
                <tbody>
                  {Object.entries(data.technicalEvidence).map(([k, v], i) => (
                    <tr key={k} style={{ backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.4rem 0.75rem", fontWeight: 600, color: "#64748b", width: "40%", textTransform: "capitalize" }}>
                        {k.replace(/([A-Z])/g, " $1")}
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem", fontFamily: "monospace", color: "#0f172a" }}>
                        {String(v)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 4: Cryptographic Proof & Integrity */}
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.35rem", marginBottom: "0.5rem" }}>
              {content.cryptographicTitle}
            </h2>
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#0f172a",
                color: "#f8fafc",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "11px",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "10px" }}>{content.hashLabel}:</div>
              <div style={{ wordBreak: "break-all", color: "#38bdf8" }}>{data.sha256Hash}</div>
            </div>
          </div>

          {/* Section 5: Legal & Remediation Action Plan */}
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.35rem", marginBottom: "0.5rem" }}>
              {content.remediationTitle}
            </h2>
            <ol style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "12px", lineHeight: 1.6, color: "#334155" }}>
              {content.remediationSteps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: "0.35rem" }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Footer & Digital Forensic Seal */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "1.25rem",
              borderTop: "1px solid #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "#64748b",
            }}
          >
            <div style={{ maxWidth: "70%" }}>
              {content.disclaimer}
            </div>

            {/* Verification Stamp Badge */}
            <div
              style={{
                border: "2px solid #2563eb",
                padding: "0.35rem 0.65rem",
                textAlign: "center",
                color: "#2563eb",
                fontWeight: 800,
                letterSpacing: "0.08em",
                transform: "rotate(-3deg)",
                fontSize: "9px",
                borderRadius: "2px",
              }}
            >
              ✓ {content.verifiedSeal}
              <div style={{ fontSize: "8px", fontWeight: 400 }}>SENTINEL SECURITY LABS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Print Styles for Clean A4 Output */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #forensic-dossier-print,
          #forensic-dossier-print * {
            visibility: visible;
          }
          #forensic-dossier-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 20mm !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
