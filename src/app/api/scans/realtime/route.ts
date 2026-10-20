import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatTimeAgo(date: Date): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export async function GET(req: NextRequest) {
  try {
    let session = null;
    try {
      session = await auth.api.getSession({ headers: req.headers });
    } catch {}

    if (!session?.user?.id) {
      try {
        session = await auth.api.getSession({ headers: await headers() });
      } catch {}
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userWhere = { userId };

    const [
      totalCount,
      critCount,
      safeCount,
      suspCount,
      urlCount,
      qrCount,
      fileScans,
      messageScans,
      recentList,
      allScans,
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
        include: { result: true },
      }).catch(() => []),
      db.scan.findMany({
        where: userWhere,
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { result: true },
      }).catch(() => []),
    ]);

    // Distinguish voice vs media inside FILE scans
    let voiceCount = 0;
    let mediaCount = 0;
    for (const f of fileScans) {
      const prov = f.result?.aiProvider || "";
      const pl = (f.payload || "").toLowerCase();
      if (prov.includes("VOICE") || pl.endsWith(".mp3") || pl.endsWith(".wav") || pl.endsWith(".webm") || pl.includes("mic-recording")) {
        voiceCount++;
      } else {
        mediaCount++;
      }
    }

    const recentScans = recentList.map((s) => ({
      id: s.id,
      type: s.type,
      payload: s.payload,
      riskLevel: s.riskLevel,
      createdAt: s.createdAt.toISOString(),
      timeAgo: formatTimeAgo(new Date(s.createdAt)),
      result: s.result ? {
        threatCategory: s.result.threatCategory,
        confidenceScore: s.result.confidenceScore,
        aiProvider: s.result.aiProvider,
        aiModel: s.result.aiModel,
      } : null,
    }));

    const response = NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalScans: totalCount,
        criticalThreats: critCount,
        safeScans: safeCount,
        suspiciousScans: suspCount,
        breakdown: {
          url: urlCount,
          qr: qrCount,
          voice: voiceCount,
          media: mediaCount,
          email: messageScans,
        },
      },
      recentScans,
      scans: allScans,
    });

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return response;
  } catch (error) {
    console.error("Realtime scan stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch real-time stats", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
