import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LiveDashboardView } from "@/components/dashboard/LiveDashboardView";
import { ScanItem } from "@/components/dashboard/RecentScansAudit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const firstName = (user?.name ? user.name.split(" ")[0] : user?.email?.split("@")[0]) || "User";

  // 100% REAL queries from PostgreSQL via Prisma scoped to the logged-in user
  let totalScans = 0;
  let criticalThreats = 0;
  let safeScans = 0;
  let suspiciousScans = 0;
  let urlScansCount = 0;
  let qrScansCount = 0;
  let voiceScansCount = 0;
  let mediaScansCount = 0;
  let emailScansCount = 0;
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
      fileScans,
      msgCount,
      dbScans,
    ] = await Promise.all([
      db.scan.count({ where: userWhere }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, riskLevel: { in: ["CRITICAL", "HIGH"] } } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, riskLevel: { in: ["SAFE", "LOW"] } } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, riskLevel: "MEDIUM" } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, type: "URL" } }).catch(() => 0),
      db.scan.count({ where: { ...userWhere, type: "QR" } }).catch(() => 0),
      db.scan.findMany({
        where: { ...userWhere, type: "FILE" },
        include: { result: true },
      }).catch(() => []),
      db.scan.count({ where: { ...userWhere, type: "MESSAGE" } }).catch(() => 0),
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

    for (const f of fileScans) {
      const prov = f.result?.aiProvider || "";
      const pl = (f.payload || "").toLowerCase();
      if (prov.includes("VOICE") || pl.endsWith(".mp3") || pl.endsWith(".wav") || pl.endsWith(".webm") || pl.includes("mic-recording")) {
        voiceScansCount++;
      } else {
        mediaScansCount++;
      }
    }

    totalScans = totalCount;
    criticalThreats = critCount;
    safeScans = safeCount;
    suspiciousScans = suspCount;
    urlScansCount = urlCount;
    qrScansCount = qrCount;
    emailScansCount = msgCount;

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

  return (
    <LiveDashboardView
      userName={firstName}
      initialStats={{
        totalScans,
        criticalThreats,
        safeScans,
        suspiciousScans,
        urlScansCount,
        qrScansCount,
        voiceScansCount,
        mediaScansCount,
        emailScansCount,
      }}
      initialRecentScans={recentScans}
    />
  );
}
