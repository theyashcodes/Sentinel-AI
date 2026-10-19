"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface AuditItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  dotColor: string;
}

const defaultLogs: AuditItem[] = [
  { id: "1", title: "Scan completed",    detail: "No threats found",  time: "2h ago",  dotColor: "ok" },
  { id: "2", title: "New project created", detail: "Sentinel API",     time: "5h ago",  dotColor: "info" },
  { id: "3", title: "API key rotated",   detail: "sk-prod-3f82",      time: "1d ago",  dotColor: "warn" },
];

const dotColors: Record<string, string> = {
  ok:   "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  info: "var(--accent)",
};

export function AuditLogs({ logs = defaultLogs }: { logs?: AuditItem[] }) {
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
        <span className="label" style={{ color: "var(--ink)" }}>Audit Logs</span>
        <Link href="/dashboard/history" style={{ display: "flex", alignItems: "center", gap: "0.375rem", textDecoration: "none" }}>
          <span className="label" style={{ color: "var(--muted)" }}>View all</span>
          <ArrowRight style={{ width: "10px", height: "10px", color: "var(--muted)" }} />
        </Link>
      </div>

      {/* Log rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
        {logs.map((log, i) => {
          const dotC = dotColors[log.dotColor] || "var(--muted)";
          return (
            <div
              key={log.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 0",
                borderTop: i === 0 ? "none" : "1px solid var(--hair-06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ width: "5px", height: "5px", backgroundColor: dotC, flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)" }}>{log.title}</span>
                <span style={{ fontSize: "12px", fontWeight: 300, color: "var(--muted)" }}>— {log.detail}</span>
              </div>
              <span className="label" style={{ color: "var(--muted)", flexShrink: 0, paddingLeft: "1rem" }}>{log.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
