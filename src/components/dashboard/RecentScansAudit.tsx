"use client";

import Link from "next/link";
import { ArrowRight, Search, QrCode, ShieldCheck, AlertTriangle } from "lucide-react";

export interface ScanItem {
  id: string;
  type: string;
  payload: string | null;
  riskLevel: string | null;
  createdAt: string;
  timeAgo: string;
}

interface RecentScansAuditProps {
  scans: ScanItem[];
}

export function RecentScansAudit({ scans }: RecentScansAuditProps) {
  const getBadgeStyle = (risk: string | null) => {
    switch (risk) {
      case "SAFE":
      case "LOW":
        return { color: "var(--ok)", borderColor: "rgba(34,197,94,0.3)", bg: "rgba(34,197,94,0.08)", text: "SAFE" };
      case "MEDIUM":
        return { color: "var(--warn)", borderColor: "rgba(234,179,8,0.3)", bg: "rgba(234,179,8,0.08)", text: "CAUTION" };
      case "HIGH":
      case "CRITICAL":
        return { color: "var(--crit)", borderColor: "rgba(239,68,68,0.3)", bg: "rgba(239,68,68,0.08)", text: "CRITICAL" };
      default:
        return { color: "var(--muted)", borderColor: "var(--hair-10)", bg: "transparent", text: "ANALYZED" };
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--panel-card)",
        border: "1px solid var(--panel-card-border)",
        borderRadius: 0,
        boxShadow: "none",
        padding: "1.5rem",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--hair-06)" }}>
        <div>
          <span className="label" style={{ color: "var(--ink)" }}>Recent Verified Scans</span>
          <span className="label" style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>— Live PostgreSQL Store</span>
        </div>
        <Link href="/dashboard/history" style={{ display: "flex", alignItems: "center", gap: "0.375rem", textDecoration: "none" }}>
          <span className="label" style={{ color: "var(--muted)" }}>View All Records</span>
          <ArrowRight style={{ width: "10px", height: "10px", color: "var(--muted)" }} />
        </Link>
      </div>

      {/* Rows */}
      {scans.length === 0 ? (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ fontSize: "13px", margin: 0 }}>No diagnostic records in database yet.</p>
          <p className="label" style={{ marginTop: "0.5rem" }}>Run your first scan using URL Scanner or QR Scanner.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
          {scans.map((scan, i) => {
            const badge = getBadgeStyle(scan.riskLevel);
            const isUrl = scan.type === "URL";

            return (
              <div
                key={scan.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--hair-06)",
                  gap: "1rem",
                }}
              >
                {/* Target & icon */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
                  {isUrl ? (
                    <Search style={{ width: "13px", height: "13px", color: "var(--accent)", flexShrink: 0 }} />
                  ) : (
                    <QrCode style={{ width: "13px", height: "13px", color: "var(--accent)", flexShrink: 0 }} />
                  )}
                  <span
                    className="max-w-[130px] sm:max-w-[260px] md:max-w-[420px] truncate"
                    style={{
                      fontSize: "13px",
                      fontWeight: 400,
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {scan.payload || "Diagnostic Target"}
                  </span>
                </div>

                {/* Verdict badge + time */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                  <span
                    className="chip"
                    style={{
                      color: badge.color,
                      borderColor: badge.borderColor,
                      backgroundColor: badge.bg,
                    }}
                  >
                    {badge.text}
                  </span>
                  <span className="label" style={{ color: "var(--muted)", minWidth: "60px", textAlign: "right" }}>
                    {scan.timeAgo}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
