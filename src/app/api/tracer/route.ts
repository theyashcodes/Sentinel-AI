import { NextRequest, NextResponse } from "next/server";
import { traceRedirectChain } from "@/lib/scanner/tracer";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { z } from "zod";

const TracerSchema = z.object({
  url: z.string().min(1, "URL is required").max(2048),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TracerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid URL", details: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { url } = parsed.data;
    const result = await traceRedirectChain(url);

    // Save scan to database for audit history
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (session?.user?.id) {
        const payloadHash = createHash("sha256").update(url).digest("hex");
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
        const ipHash = createHash("sha256").update(ip).digest("hex");

        const isThreat = result.impersonation.detected || (result.impersonation.riskScore || 0) >= 50;

        await db.$transaction(async (tx) => {
          const scan = await tx.scan.create({
            data: {
              type: "URL",
              status: "COMPLETED",
              riskLevel: isThreat ? "HIGH" : "SAFE",
              payloadHash,
              ipHash,
              userId: session.user.id,
              payload: url.slice(0, 500),
            },
          });

          await tx.scanResult.create({
            data: {
              scanId: scan.id,
              aiProvider: "SENTINEL_REDIRECT_TRACER",
              aiModel: "HopChain-Analyzer-v1",
              confidenceScore: 99,
              threatCategory: isThreat
                ? `Malicious Redirect Chain (${result.impersonation.targetBrand || "Spoof"})`
                : "Clean Redirect Chain",
              analysisMetadata: {
                hopsCount: result.hops.length,
                finalUrl: result.finalUrl,
                statusCodes: result.hops.map((h) => h.status),
                targetBrand: result.impersonation.targetBrand,
                explanation: result.impersonation.explanation,
              },
            },
          });
        });
      }
    } catch (dbErr) {
      console.error("Failed to persist tracer scan history:", dbErr);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tracer API error:", error);
    return NextResponse.json(
      { error: "Failed to trace URL redirect chain", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
