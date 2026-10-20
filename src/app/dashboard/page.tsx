import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/Header";
import { StatCards } from "@/components/dashboard/StatCards";
import { SystemOperations } from "@/components/dashboard/SystemOperations";
import { DetectionEngineStatus } from "@/components/dashboard/DetectionEngineStatus";
import { RecentScansAudit, ScanItem } from "@/components/dashboard/RecentScansAudit";

function formatTimeAgo(date: Date): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");

  const user = session.user;
  const firstName = user?.name ? user.name.split(" ")[0] : (user?.email?.split("@")[0] || "User");

  // 100% REAL queries from PostgreSQL via Prisma scoped to the logged-in user
  let totalScans = 0;
  let criticalThreats = 0;
  let safeScans = 0;
  let suspiciousScans = 0;
  let urlScansCount = 0;
  let qrScansCount = 0;
  let recentScans: ScanItem[] = [];

  try {
    const userWhere = { userId: user.id };
    const [
      totalCount,
      critCount,
      safeCount,
      suspCount,
      urlCount,
      qrCount,
      dbScans,
    ] = await Promise.all([
      db.scan.count({ where: userWhere }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, riskLevel: { in: ["CRITICAL", "HIGH"] } } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, riskLevel: { in: ["SAFE", "LOW"] } } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, riskLevel: "MEDIUM" } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, type: "URL" } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, type: "QR" } }).catch(() => 0),
      db.scan.findMany({
        where: userWhere,
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          payload: true,
          riskLevel: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    totalScans = totalCount;
    criticalThreats = critCount;
    safeScans = safeCount;
    suspiciousScans = suspCount;
    urlScansCount = urlCount;
    qrScansCount = qrCount;

    recentScans = dbScans.map((s) => ({
      id: s.id,
      type: s.type,
      payload: s.payload,
      riskLevel: s.riskLevel,
      createdAt: s.createdAt.toISOString(),
      timeAgo: formatTimeAgo(new Date(s.createdAt)),
    }));
  } catch (error) {
    console.error("Dashboard database query error:", error);
  }

  const activeAlerts = criticalThreats + suspiciousScans;

  return (
    <div>
      {/* Real Header with dynamic threat count */}
      <Header userName={firstName} totalAlerts={activeAlerts} />

      {/* 100% Real KPI Stat Cards */}
      <StatCards
        totalScans={totalScans}
        criticalThreats={criticalThreats}
        safeScans={safeScans}
        suspiciousScans={suspiciousScans}
        urlScansCount={urlScansCount}
        qrScansCount={qrScansCount}
      />

      {/* Middle row: Real Operations + Live Engine Status */}
      <div className="sentinel-grid-2-1" style={{ marginBottom: "1px" }}>
        <SystemOperations />
        <DetectionEngineStatus totalScans={totalScans} threatsCount={criticalThreats} />
      </div>

      {/* Bottom row: 100% Real Recent Scans from Database */}
      <div style={{ marginTop: "1px" }}>
        <RecentScansAudit scans={recentScans} />
      </div>
    </div>
  );
}
