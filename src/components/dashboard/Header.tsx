"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Zap, ArrowUpRight, ShieldCheck, AlertTriangle } from "lucide-react";

interface HeaderProps {
  userName?: string;
  totalAlerts?: number;
}

export function Header({ userName = "Yash", totalAlerts = 0 }: HeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState({ date: "", time: "" });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      setCurrentDateTime({ date: dateStr, time: timeStr });
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: "1.5rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid var(--hair-06)",
        marginBottom: "2rem",
      }}
    >
      {/* Left: title */}
      <div>
        <p className="label" style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>
          Security Intelligence Dashboard
        </p>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Welcome back,{" "}
          <span style={{ color: "var(--accent)" }}>{userName}</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <span className="status-dot" style={{ backgroundColor: "var(--ok)" }} />
          <span className="label" style={{ color: "var(--ok)" }}>ML Inference Core Active</span>
        </div>
      </div>

      {/* Right: meta + CTA */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6">
        {/* Date/time */}
        <div style={{ textAlign: "right" }} className="hidden sm:block">
          <p className="label" style={{ color: "var(--muted)", letterSpacing: "0.08em" }}>{currentDateTime.date}</p>
          <p className="label" style={{ color: "var(--muted)", opacity: 0.6 }}>{currentDateTime.time}</p>
        </div>

        {/* Real Alerts chip */}
        {totalAlerts > 0 ? (
          <div className="chip" style={{ borderColor: "rgba(239,68,68,0.3)", color: "var(--crit)", backgroundColor: "rgba(239,68,68,0.06)" }}>
            <span className="status-dot crit" style={{ width: "5px", height: "5px" }} />
            {totalAlerts} Threats Detected
          </div>
        ) : (
          <div className="chip" style={{ borderColor: "rgba(34,197,94,0.3)", color: "var(--ok)", backgroundColor: "rgba(34,197,94,0.06)" }}>
            <span className="status-dot" style={{ width: "5px", height: "5px", backgroundColor: "var(--ok)" }} />
            0 Threats · Secure
          </div>
        )}

        {/* CTA — accent button */}
        <Link
          id="header-quick-scan-cta"
          href="/dashboard/scanner/url"
          className="btn-accent"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Zap style={{ width: "12px", height: "12px" }} />
          Quick Scan
          <ArrowUpRight style={{ width: "12px", height: "12px", opacity: 0.7 }} />
        </Link>
      </div>
    </header>
  );
}
