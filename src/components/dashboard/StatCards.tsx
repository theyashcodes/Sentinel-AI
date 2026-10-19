"use client";

import Link from "next/link";
import { AlertTriangle, BarChart3, ShieldCheck, Layers } from "lucide-react";

interface StatCardsProps {
  totalScans?: number;
  criticalThreats?: number;
  safeScans?: number;
  suspiciousScans?: number;
  urlScansCount?: number;
  qrScansCount?: number;
}

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--panel-card)",
  border: "1px solid var(--panel-card-border)",
  borderRadius: 0,
  boxShadow: "none",
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  textDecoration: "none",
  transition: "border-color 0.15s ease",
};

export function StatCards({
  totalScans = 0,
  criticalThreats = 0,
  safeScans = 0,
  suspiciousScans = 0,
  urlScansCount = 0,
  qrScansCount = 0,
}: StatCardsProps) {
  const cards = [
    {
      id: "stat-scans",
      href: "/dashboard/history",
      label: "Total Scans Analyzed",
      icon: BarChart3,
      value: totalScans.toLocaleString(),
      meta: "100% verified database records",
      metaColor: "var(--accent)",
      spark: "M0 22 Q25 10 50 22 T100 10",
      sparkColor: "var(--accent)",
    },
    {
      id: "stat-threats",
      href: "/dashboard/history",
      label: "Critical Threats Detected",
      icon: AlertTriangle,
      value: criticalThreats,
      meta: criticalThreats === 0 ? "Zero critical alerts · Clean" : `${criticalThreats} malicious targets flagged`,
      metaColor: criticalThreats === 0 ? "var(--ok)" : "var(--crit)",
      spark: "M0 30 Q25 28 50 15 T100 6",
      sparkColor: criticalThreats === 0 ? "var(--ok)" : "var(--crit)",
    },
    {
      id: "stat-safe",
      href: "/dashboard/history",
      label: "Verified Safe Targets",
      icon: ShieldCheck,
      value: safeScans.toLocaleString(),
      meta: "Passed ML & DNS inspections",
      metaColor: "var(--ok)",
      spark: "M0 28 Q30 32 60 12 T100 18",
      sparkColor: "var(--ok)",
    },
    {
      id: "stat-coverage",
      href: "/dashboard/history",
      label: "Engine Scan Breakdown",
      icon: Layers,
      value: `${urlScansCount} URLs`,
      meta: `${qrScansCount} QR Codes inspected`,
      metaColor: "var(--accent)",
      spark: "M0 20 Q30 10 60 25 T100 12",
      sparkColor: "var(--accent)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1px",
        backgroundColor: "var(--grid-gap-color)",
        marginBottom: "2rem",
      }}
    >
      {cards.map((card) => (
        <Link
          key={card.id}
          id={card.id}
          href={card.href}
          style={{ ...panelStyle, textDecoration: "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--hair-10)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--panel-card-border)"; }}
        >
          {/* Label row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="label" style={{ color: "var(--muted)" }}>{card.label}</span>
            <card.icon style={{ width: "13px", height: "13px", color: "var(--muted)", flexShrink: 0 }} />
          </div>

          {/* Value */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <span className="stat-numeral" style={{ color: "var(--ink)" }}>{card.value}</span>
              {card.meta && (
                <div className="label" style={{ color: card.metaColor, marginTop: "0.375rem" }}>{card.meta}</div>
              )}
            </div>
            {card.spark && (
              <svg viewBox="0 0 100 40" style={{ width: "72px", height: "28px" }} fill="none">
                <path d={card.spark} stroke={card.sparkColor} strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
