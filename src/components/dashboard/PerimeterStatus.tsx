"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function PerimeterStatus() {
  const bands = [
    { label: "DNS",     status: "clean",   pct: 100 },
    { label: "TLS",     status: "clean",   pct: 100 },
    { label: "Layer-7", status: "nominal", pct: 94  },
    { label: "Auth",    status: "clean",   pct: 100 },
  ];

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
        gap: "1.25rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--hair-06)" }}>
        <span className="label" style={{ color: "var(--ink)" }}>Perimeter Status</span>
        <Link href="/dashboard/history" className="btn-ghost" style={{ padding: "0.25rem 0.75rem", fontSize: "10px" }}>
          History
        </Link>
      </div>

      {/* Shield icon + status */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
        <ShieldCheck style={{ width: "28px", height: "28px", color: "var(--ok)" }} />
        <div>
          <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>
            Integrity Secure
          </p>
          <p className="label" style={{ color: "var(--muted)", marginTop: "0.25rem" }}>
            0 intrusion attempts · last 24h
          </p>
        </div>
      </div>

      {/* Band status table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {bands.map((band, i) => (
          <div
            key={band.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.625rem 0",
              borderTop: i === 0 ? "none" : "1px solid var(--hair-06)",
            }}
          >
            <span className="label" style={{ color: "var(--muted)" }}>{band.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              {/* Thin 40px bar */}
              <div style={{ width: "40px", height: "1px", backgroundColor: "var(--hair-10)", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 0, height: "1px", width: `${band.pct}%`, backgroundColor: band.pct === 100 ? "var(--ok)" : "var(--warn)" }} />
              </div>
              <span className="label" style={{ color: band.pct === 100 ? "var(--ok)" : "var(--warn)", minWidth: "2rem", textAlign: "right" }}>
                {band.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
