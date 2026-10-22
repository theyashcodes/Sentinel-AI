import { NextRequest, NextResponse } from "next/server";
import { traceRedirectChain } from "@/lib/scanner/tracer";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { assertRateLimit, scanRateLimit } from "@/lib/rate-limit";

const TracerSchema = z.object({
  url: z.string().min(1, "URL is required").max(2048),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  await assertRateLimit(req, scanRateLimit);

  const body = await req.json();
  const { url } = TracerSchema.parse(body);

  const result = await traceRedirectChain(url);

    // Save scan to database for audit history
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
});
