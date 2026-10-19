"use client";

import Link from "next/link";
import { Cpu, CheckCircle2, Shield, Activity } from "lucide-react";

interface DetectionEngineStatusProps {
  totalScans?: number;
  threatsCount?: number;
}

export function DetectionEngineStatus({ totalScans = 0, threatsCount = 0 }: DetectionEngineStatusProps) {
  const engineNodes = [
    { label: "ML Inference Engine", status: "Online", detail: "Port 5001 (Random Forest)", ok: true },
    { label: "QR Payload Decoder", status: "Active", detail: "jsQR & Buffer Pipeline", ok: true },
    { label: "DNS / Network Probe", status: "Ready", detail: "WHOIS & DNS Resolver", ok: true },
    { label: "Database Store", status: "Connected", detail: "PostgreSQL / Prisma", ok: true },
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Activity style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
          <span className="label" style={{ color: "var(--ink)" }}>Detection Engine Status</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <span className="status-dot pulse" style={{ width: "6px", height: "6px" }} />
          <span className="label" style={{ color: "var(--ok)" }}>Online</span>
        </div>
      </div>

      {/* Main Status Hero */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.25rem 0" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            border: "1px solid var(--hair-10)",
            backgroundColor: "var(--accent-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Shield style={{ width: "20px", height: "20px", color: "var(--accent)" }} />
        </div>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 400, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>
            Sentinel ML Core Active
          </p>
          <p className="label" style={{ color: "var(--muted)", marginTop: "0.25rem" }}>
            {totalScans} targets verified · {threatsCount} threats isolated
          </p>
        </div>
      </div>

      {/* Engine Components List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: "auto" }}>
        {engineNodes.map((node, i) => (
          <div
            key={node.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.625rem 0",
              borderTop: i === 0 ? "none" : "1px solid var(--hair-06)",
            }}
          >
            <div>
              <p style={{ fontSize: "12px", color: "var(--ink)", margin: 0 }}>{node.label}</p>
              <p className="label" style={{ color: "var(--muted)", fontSize: "10px", marginTop: "1px" }}>{node.detail}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span className="status-dot" style={{ width: "5px", height: "5px", backgroundColor: "var(--ok)" }} />
              <span className="label" style={{ color: "var(--ok)", fontSize: "10px" }}>{node.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
