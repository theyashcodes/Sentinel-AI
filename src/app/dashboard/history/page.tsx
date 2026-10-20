import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { History, Search, QrCode, ExternalLink } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Scan History",
  description: "Complete historical audit log of all URL and QR code security diagnostics.",
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="Scan History & Audit Logs"
        description="Review all past URL and QR code inspections verified by the Sentinel AI ML engine."
      >
        <div className="chip" style={{ color: "var(--ink)", borderColor: "var(--hair-10)" }}>
          <span className="status-dot pulse" style={{ width: "5px", height: "5px" }} />
          <span>{scans.length} Recorded Diagnostics</span>
        </div>
      </PageHeader>

      {scans.length === 0 ? (
        <EmptyState
          icon={History}
          title="No scan history"
          description="You haven't run any scans yet. Run your first scan using the URL Scanner or QR Scanner to start building your security history."
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
              gridTemplateColumns: "1.8fr 100px 120px 140px 160px",
              padding: "0.85rem 1.25rem",
              borderBottom: "1px solid var(--hair-10)",
              backgroundColor: "var(--ground-secondary)",
              gap: "1rem",
              alignItems: "center",
            }}
            className="hidden md:grid"
          >
            <span className="label" style={{ color: "var(--muted)" }}>Target Payload</span>
            <span className="label" style={{ color: "var(--muted)" }}>Type</span>
            <span className="label" style={{ color: "var(--muted)" }}>Risk Verdict</span>
            <span className="label" style={{ color: "var(--muted)" }}>Status</span>
            <span className="label" style={{ color: "var(--muted)", textAlign: "right" }}>Timestamp</span>
          </div>

          {/* Table Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {scans.map((scan, i) => {
              const badge = getRiskBadge(scan.riskLevel);
              const isUrl = scan.type === "URL";

              return (
                <div
                  key={scan.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    padding: "1rem 1.25rem",
                    borderTop: i === 0 ? "none" : "1px solid var(--hair-06)",
                    gap: "0.75rem",
                    alignItems: "center",
                    transition: "background-color 0.15s ease",
                  }}
                  className="md:grid-cols-[1.8fr_100px_120px_140px_160px]"
                >
                  {/* Target & icon */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                    {isUrl ? (
                      <Search style={{ width: "14px", height: "14px", color: "var(--accent)", flexShrink: 0 }} />
                    ) : (
                      <QrCode style={{ width: "14px", height: "14px", color: "var(--accent)", flexShrink: 0 }} />
                    )}
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 400,
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={scan.payload || "Diagnostic Target"}
                    >
                      {scan.payload || "Diagnostic Target"}
                    </span>
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

                  {/* Status */}
                  <div>
                    <span className="label" style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {scan.status}
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
