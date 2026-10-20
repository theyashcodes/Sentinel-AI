"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/Header";
import { StatCards } from "@/components/dashboard/StatCards";
import { SystemOperations } from "@/components/dashboard/SystemOperations";
import { DetectionEngineStatus } from "@/components/dashboard/DetectionEngineStatus";
import { RecentScansAudit, ScanItem } from "@/components/dashboard/RecentScansAudit";
import { RefreshCw } from "lucide-react";

interface InitialStats {
  totalScans: number;
  criticalThreats: number;
  safeScans: number;
  suspiciousScans: number;
  urlScansCount: number;
  qrScansCount: number;
  voiceScansCount: number;
  mediaScansCount: number;
  emailScansCount: number;
}

interface LiveDashboardViewProps {
  userName?: string;
  initialStats: InitialStats;
  initialRecentScans: ScanItem[];
}

export function LiveDashboardView({
  userName,
  initialStats,
  initialRecentScans,
}: LiveDashboardViewProps) {
  const [stats, setStats] = useState<InitialStats>(initialStats);
  const [recentScans, setRecentScans] = useState<ScanItem[]>(initialRecentScans);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const fetchLiveStats = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    try {
      const res = await fetch("/api/scans/realtime", {
        method: "GET",
        credentials: "include",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setStats({
            totalScans: data.stats.totalScans ?? 0,
            criticalThreats: data.stats.criticalThreats ?? 0,
            safeScans: data.stats.safeScans ?? 0,
            suspiciousScans: data.stats.suspiciousScans ?? 0,
            urlScansCount: data.stats.breakdown?.url ?? 0,
            qrScansCount: data.stats.breakdown?.qr ?? 0,
            voiceScansCount: data.stats.breakdown?.voice ?? 0,
            mediaScansCount: data.stats.breakdown?.media ?? 0,
            emailScansCount: data.stats.breakdown?.email ?? 0,
          });
        }
        if (data.recentScans) {
          setRecentScans(data.recentScans);
        }
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn("Live dashboard sync error:", err);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  }, []);

  // Sync on mount, on global scan completion event, and on 4-second interval
  useEffect(() => {
    fetchLiveStats(false);

    const onScanRecorded = () => {
      fetchLiveStats(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLiveStats(false);
      }
    };

    window.addEventListener("sentinel:scan-updated", onScanRecorded);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLiveStats(false);
      }
    }, 4000);

    return () => {
      window.removeEventListener("sentinel:scan-updated", onScanRecorded);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchLiveStats]);

  const activeAlerts = stats.criticalThreats + stats.suspiciousScans;

  return (
    <div>
      {/* Header with real-time alert count */}
      <Header userName={userName} totalAlerts={activeAlerts} />

      {/* Real-time sync indicator & manual refresh */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={() => fetchLiveStats(true)}
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
          title="Click to force refresh audit telemetry"
        >
          <RefreshCw
            style={{
              width: "11px",
              height: "11px",
              animation: isSyncing ? "spin 0.8s linear infinite" : "none",
              color: isSyncing ? "var(--accent)" : "var(--muted)",
            }}
          />
          <span>{isSyncing ? "SYNCING..." : `LIVE SYNC (${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`}</span>
        </button>
      </div>

      {/* Real KPI Stat Cards */}
      <StatCards
        totalScans={stats.totalScans}
        criticalThreats={stats.criticalThreats}
        safeScans={stats.safeScans}
        suspiciousScans={stats.suspiciousScans}
        urlScansCount={stats.urlScansCount}
        qrScansCount={stats.qrScansCount}
        voiceScansCount={stats.voiceScansCount}
        mediaScansCount={stats.mediaScansCount}
        emailScansCount={stats.emailScansCount}
      />

      {/* Grid: System Operations + Detection Engine Status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
        className="lg:grid-cols-[1.6fr_1fr]"
      >
        <SystemOperations />
        <DetectionEngineStatus
          totalScans={stats.totalScans}
          threatsCount={stats.criticalThreats}
        />
      </div>

      {/* Recent Scans Table */}
      <RecentScansAudit scans={recentScans} />
    </div>
  );
}
