import { NextRequest, NextResponse } from "next/server";
import { dissectEmailHeaders } from "@/lib/email/emailParser";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let rawText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No .eml file provided" },
          { status: 400 }
        );
      }
      const buffer = await file.arrayBuffer();
      rawText = Buffer.from(buffer).toString("utf8");
    } else {
      const body = await req.json();
      rawText = body.rawText || body.headers || "";
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Please provide raw email headers or upload a .eml file." },
        { status: 400 }
      );
    }

    const report = dissectEmailHeaders(rawText);

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
        const senderEmail = report.sender?.fromEmail || report.sender?.displayName || "Unknown Sender";
        const payloadStr = report.subject ? `${report.subject} (${senderEmail})` : senderEmail;
        const payloadHash = createHash("sha256").update(payloadStr).digest("hex");
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
        const ipHash = createHash("sha256").update(ip).digest("hex");

        const riskLevel =
          report.verdict === "CRITICAL_PHISHING"
            ? "CRITICAL"
            : report.verdict === "SUSPICIOUS"
            ? "MEDIUM"
            : "SAFE";

        await db.$transaction(async (tx) => {
          const scan = await tx.scan.create({
            data: {
              type: "MESSAGE",
              status: "COMPLETED",
              riskLevel,
              payloadHash,
              ipHash,
              userId: session.user.id,
              payload: payloadStr.slice(0, 500),
            },
          });

          await tx.scanResult.create({
            data: {
              scanId: scan.id,
              aiProvider: "SENTINEL_EMAIL_DISSECTOR",
              aiModel: "Header-Forensics-v1",
              confidenceScore: 92,
              threatCategory: `Email: ${report.verdict}`,
              analysisMetadata: {
                verdict: report.verdict,
                fromEmail: report.sender?.fromEmail,
                displayName: report.sender?.displayName,
                subject: report.subject,
                spf: report.securitySeals?.spf,
                dkim: report.securitySeals?.dkim,
                dmarc: report.securitySeals?.dmarc,
                isDisplayNameSpoofed: report.sender?.isDisplayNameSpoofed,
                isDomainMismatch: report.sender?.isDomainMismatch,
              } as any,
            },
          });
        });
      }
    } catch (dbErr) {
      console.error("Failed to persist email audit to database:", dbErr);
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("[Email Forensic Audit Error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to dissect email headers" },
      { status: 500 }
    );
  }
}
