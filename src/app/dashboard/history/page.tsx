import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  History,
  Search,
  QrCode,
  Mic,
  FileAudio,
  Fingerprint,
  Mail,
  GitFork,
  FileText,
} from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan History",
  description: "Unified historical audit log of all URL, QR, Voice, Media, and Email forensics.",
};

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

export default async function HistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");

  let scans: any[] = [];

  try {
    scans = await db.scan.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        result: true,
      },
    });
  } catch (error) {
    console.error("Failed to query scan history:", error);
  }

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="Scan History & Audit Logs"
        description="Unified historical audit log of all URL, QR, Voice, Media, and Email forensics verified by the Sentinel AI engine."
      >
        <div className="chip" style={{ color: "var(--ink)", borderColor: "var(--hair-10)" }}>
          <span className="status-dot pulse" style={{ width: "5px", height: "5px" }} />
          <span>{scans.length} Recorded Diagnostics</span>
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
              gridTemplateColumns: "1.8fr 110px 120px 130px 160px",
              padding: "0.85rem 1.25rem",
              borderBottom: "1px solid var(--hair-10)",
              backgroundColor: "var(--ground-secondary)",
              gap: "1rem",
              alignItems: "center",
            }}
            className="hidden md:grid"
          >
            <span className="label" style={{ color: "var(--muted)" }}>Target & Diagnostic Category</span>
            <span className="label" style={{ color: "var(--muted)" }}>Type</span>
            <span className="label" style={{ color: "var(--muted)" }}>Risk Verdict</span>
            <span className="label" style={{ color: "var(--muted)" }}>Confidence</span>
            <span className="label" style={{ color: "var(--muted)", textAlign: "right" }}>Timestamp</span>
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
                  className="md:grid-cols-[1.8fr_110px_120px_130px_160px]"
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
                  <div style={{ textAlign: "right" }}>
                    <span className="label" style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {formatDateTime(new Date(scan.createdAt))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
