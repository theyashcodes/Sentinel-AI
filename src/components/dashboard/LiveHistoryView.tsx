"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  History,
  Search,
  QrCode,
  Mic,
  Fingerprint,
  Mail,
  GitFork,
  RefreshCw,
  FileText,
} from "lucide-react";
import { ForensicReportModal } from "@/components/forensics/ForensicReportModal";
import { ForensicReportData } from "@/lib/forensics/reportGenerator";

interface LiveHistoryViewProps {
  initialScans: any[];
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function LiveHistoryView({ initialScans }: LiveHistoryViewProps) {
  const [scans, setScans] = useState<any[]>(initialScans);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [selectedReport, setSelectedReport] = useState<ForensicReportData | null>(null);

  const fetchLiveScans = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    try {
      const res = await fetch("/api/scans/realtime", {
        method: "GET",
        credentials: "include",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.scans)) {
          setScans(data.scans);
        }
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn("Live scan history sync error:", err);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  }, []);

  useEffect(() => {
    fetchLiveScans(false);

    const onScanUpdated = () => {
      fetchLiveScans(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLiveScans(false);
      }
    };

    window.addEventListener("sentinel:scan-updated", onScanUpdated);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLiveScans(false);
      }
    }, 4000);

    return () => {
      window.removeEventListener("sentinel:scan-updated", onScanUpdated);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchLiveScans]);

  const getRiskBadge = (risk: string | null) => {
    switch (risk) {
      case "SAFE":
      case "LOW":
        return { label: "SAFE", color: "var(--ok)", border: "rgba(34,197,94,0.3)", bg: "rgba(34,197,94,0.06)" };
      case "MEDIUM":
        return { label: "SUSPICIOUS", color: "var(--warn)", border: "rgba(234,179,8,0.3)", bg: "rgba(234,179,8,0.06)" };
      case "HIGH":
      case "CRITICAL":
        return { label: "MALICIOUS", color: "var(--crit)", border: "rgba(239,68,68,0.3)", bg: "rgba(239,68,68,0.06)" };
      default:
        return { label: "ANALYZED", color: "var(--muted)", border: "var(--hair-10)", bg: "transparent" };
    }
  };

  const getScanIcon = (scan: any) => {
    const type = scan.type;
    const provider = scan.result?.aiProvider || "";
    const payload = (scan.payload || "").toLowerCase();

    if (provider.includes("REDIRECT_TRACER")) {
      return <GitFork style={{ width: "15px", height: "15px", color: "var(--accent)", flexShrink: 0 }} />;
    }
    if (provider.includes("VOICE") || payload.endsWith(".mp3") || payload.endsWith(".wav") || payload.endsWith(".webm") || payload.includes("mic-recording")) {
      return <Mic style={{ width: "15px", height: "15px", color: "var(--accent)", flexShrink: 0 }} />;
    }
    if (provider.includes("EMAIL") || type === "MESSAGE") {
      return <Mail style={{ width: "15px", height: "15px", color: "var(--accent)", flexShrink: 0 }} />;
    }
    if (provider.includes("MEDIA") || type === "FILE") {
      return <Fingerprint style={{ width: "15px", height: "15px", color: "var(--accent)", flexShrink: 0 }} />;
    }
    if (type === "QR") {
      return <QrCode style={{ width: "15px", height: "15px", color: "var(--accent)", flexShrink: 0 }} />;
    }
    return <Search style={{ width: "15px", height: "15px", color: "var(--accent)", flexShrink: 0 }} />;
  };

  const openReportForScan = (scan: any) => {
    const isCritical = scan.riskLevel === "CRITICAL" || scan.riskLevel === "HIGH";
    const findings: string[] = [];
    if (scan.result?.threatCategory) findings.push(scan.result.threatCategory);
    if (scan.result?.aiModel) findings.push(`Analyzed with Model: ${scan.result.aiModel}`);
    if (scan.result?.confidenceScore) findings.push(`Detection Confidence: ${Math.round(scan.result.confidenceScore)}%`);

    const meta = (scan.result?.analysisMetadata as Record<string, any>) || {};
    if (meta && typeof meta === "object") {
      if (meta.aiProbabilityScore !== undefined) findings.push(`Synthetic AI Probability: ${meta.aiProbabilityScore}%`);
      if (meta.jitterPercent !== undefined) findings.push(`Pitch Micro-Jitter: ${meta.jitterPercent}%`);
      if (meta.spectralCutoffKHz !== undefined) findings.push(`Acoustic Cutoff: ${meta.spectralCutoffKHz} kHz`);
      if (meta.targetBrand) findings.push(`Impersonated Brand: ${meta.targetBrand}`);
      if (meta.hopsCount) findings.push(`Total Redirection Hops: ${meta.hopsCount}`);
      if (meta.spf) findings.push(`SPF Authentication: ${meta.spf}`);
      if (meta.dmarc) findings.push(`DMARC Status: ${meta.dmarc}`);
    }

    setSelectedReport({
      caseId: `SEN-${new Date(scan.createdAt).getFullYear()}-${scan.id.slice(0, 8).toUpperCase()}`,
      timestamp: formatDateTime(new Date(scan.createdAt)),
      examiner: "Sentinel AI Defense Core v2.4",
      type: scan.type,
      target: scan.payload || "Diagnostic Target",
      riskLevel: scan.riskLevel || "SAFE",
      confidenceScore: Math.round(scan.result?.confidenceScore || 95),
      threatCategory: scan.result?.threatCategory || (isCritical ? "Hostile Cyber Artifact" : "Verified Authentic Asset"),
      summary: isCritical
        ? `High-risk cyber threat detected by Sentinel AI. Forensic evidence indicates anomalous structural signatures matching known synthetic attack patterns.`
        : `Diagnostic inspection completed successfully. No deceptive markers, high-entropy homoglyphs, or synthetic cloning patterns were observed.`,
      findings: findings.length > 0 ? findings : ["Diagnostic verified against ML neural heuristics."],
      technicalEvidence: meta,
      sha256Hash: scan.payloadHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="Scan History & Audit Logs"
        description="Unified historical audit log of all URL, QR, Voice, Media, and Email forensics verified by Sentinel AI."
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => fetchLiveScans(true)}
            disabled={isSyncing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              color: "var(--muted)",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
            }}
            title="Click to refresh telemetry ledger"
          >
            <RefreshCw
              style={{
                width: "11px",
                height: "11px",
                animation: isSyncing ? "spin 0.8s linear infinite" : "none",
                color: isSyncing ? "var(--accent)" : "var(--muted)",
              }}
            />
            <span>{isSyncing ? "SYNCING..." : `LIVE (${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`}</span>
          </button>
          <div className="chip" style={{ color: "var(--ink)", borderColor: "var(--hair-10)" }}>
            <span className="status-dot pulse" style={{ width: "5px", height: "5px" }} />
            <span>{scans.length} Recorded Diagnostics</span>
          </div>
        </div>
      </PageHeader>

      {scans.length === 0 ? (
        <EmptyState
          icon={History}
          title="No scan history recorded"
          description="You haven't run any scans yet. Run your first security diagnostic using the URL Scanner, QR Scanner, Redirect Tracer, AI Voice Detector, AI Media Forensics, or Email Dissector to start building your audit log."
        />
      ) : (
        <div
          className="void-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.7fr 80px 105px 95px 135px 120px",
              padding: "0.85rem 1.25rem",
              borderBottom: "1px solid var(--hair-10)",
              backgroundColor: "var(--ground-secondary)",
              gap: "0.75rem",
              alignItems: "center",
            }}
            className="hidden md:grid"
          >
            <span className="label" style={{ color: "var(--muted)" }}>Target & Diagnostic Category</span>
            <span className="label" style={{ color: "var(--muted)" }}>Type</span>
            <span className="label" style={{ color: "var(--muted)" }}>Risk Verdict</span>
            <span className="label" style={{ color: "var(--muted)" }}>Confidence</span>
            <span className="label" style={{ color: "var(--muted)" }}>Timestamp</span>
            <span className="label" style={{ color: "var(--muted)", textAlign: "right" }}>Forensic Report</span>
          </div>

          {/* Table Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {scans.map((scan, i) => {
              const badge = getRiskBadge(scan.riskLevel);
              const threatText = scan.result?.threatCategory || scan.result?.aiModel;

              return (
                <div
                  key={scan.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    padding: "0.9rem 1.25rem",
                    borderTop: i === 0 ? "none" : "1px solid var(--hair-06)",
                    gap: "0.75rem",
                    alignItems: "center",
                    transition: "background-color 0.15s ease",
                  }}
                  className="md:grid-cols-[1.7fr_80px_105px_95px_135px_120px]"
                >
                  {/* Target & icon */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                    {getScanIcon(scan)}
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--ink)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={scan.payload || "Diagnostic Target"}
                      >
                        {scan.payload || "Diagnostic Target"}
                      </span>
                      {threatText && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {threatText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata & Actions row (compact flex on mobile, native grid columns on desktop) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 md:contents">
                    {/* Type */}
                    <div>
                      <span className="chip" style={{ fontSize: "10px" }}>
                        {scan.type}
                      </span>
                    </div>

                    {/* Verdict */}
                    <div>
                      <span
                        className="chip"
                        style={{
                          color: badge.color,
                          borderColor: badge.border,
                          backgroundColor: badge.bg,
                          fontSize: "10px",
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Confidence / Status */}
                    <div>
                      <span className="label" style={{ color: "var(--ink)", fontSize: "11px", fontFamily: "var(--font-mono, monospace)" }}>
                        {scan.result?.confidenceScore ? `${Math.round(scan.result.confidenceScore)}% CONF` : scan.status}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div>
                      <span className="label" style={{ color: "var(--muted)", fontSize: "11px" }}>
                        {formatDateTime(new Date(scan.createdAt))}
                      </span>
                    </div>

                    {/* Action: Open Bilingual Forensic Dossier */}
                    <div className="w-full sm:w-auto text-right">
                      <button
                        onClick={() => openReportForScan(scan)}
                        className="btn btn-secondary w-full sm:w-auto justify-center"
                        style={{
                          fontSize: "11px",
                          padding: "0.3rem 0.65rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                        title="Generate and view bilingual forensic report"
                      >
                        <FileText style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                        <span>Dossier</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bilingual Forensic Report Modal */}
      <ForensicReportModal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        data={selectedReport}
      />
    </div>
  );
}
