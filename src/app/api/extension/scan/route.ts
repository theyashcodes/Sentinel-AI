import { NextRequest, NextResponse } from "next/server";
import { detectImpersonation } from "@/lib/scanner/tracer";

export const dynamic = "force-dynamic";

const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".buzz", ".tk", ".ml", ".ga", ".cf", ".gq",
  ".work", ".click", ".link", ".rest", ".fit", ".icu",
];

const PHISHING_PATH_KEYWORDS = [
  "login", "verify", "signin", "account", "update", "security",
  "banking", "confirm", "wallet", "recovery", "authenticate",
];

// Helper to set CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl = body.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { error: "Valid target URL is required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Ignore internal or non-HTTP browser schemes
    if (
      rawUrl.startsWith("chrome://") ||
      rawUrl.startsWith("chrome-extension://") ||
      rawUrl.startsWith("about:") ||
      rawUrl.startsWith("edge://") ||
      rawUrl.startsWith("brave://")
    ) {
      return NextResponse.json(
        {
          url: rawUrl,
          domain: "Internal Browser Page",
          riskScore: 0,
          verdict: "SAFE",
          isInternal: true,
          threats: [],
          impersonation: { detected: false },
          scannedAt: new Date().toISOString(),
        },
        { headers: corsHeaders() }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    } catch {
      return NextResponse.json(
        { error: "Malformed URL provided" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();
    const threats: string[] = [];
    let riskScore = 5; // Clean baseline

    // 1. Homoglyph / Impersonation Analysis
    const impersonation = detectImpersonation(hostname);
    if (impersonation.detected) {
      riskScore = Math.max(riskScore, impersonation.riskScore);
      threats.push(impersonation.explanation || `Impersonation spoof of ${impersonation.targetBrand}`);
    }

    // 2. Raw IP Hostname Check
    const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIpHost && !hostname.startsWith("127.") && hostname !== "localhost") {
      riskScore = Math.max(riskScore, 75);
      threats.push("Raw IP address used as hostname instead of certified domain (common in C2 and phishing)");
    }

    // 3. High-Risk TLD Check
    const matchedTld = SUSPICIOUS_TLDS.find((tld) => hostname.endsWith(tld));
    if (matchedTld) {
      riskScore += 25;
      threats.push(`High-abuse TLD detected (${matchedTld}) often associated with disposable phishing campaigns`);
    }

    // 4. Phishing Keywords in Path
    const matchedKeywords = PHISHING_PATH_KEYWORDS.filter((kw) => pathname.includes(kw));
    if (matchedKeywords.length >= 2) {
      riskScore += 20;
      threats.push(`Suspicious credential harvest path keywords detected (${matchedKeywords.join(", ")})`);
    }

    // 5. Insecure HTTP Check
    if (parsedUrl.protocol === "http:" && !hostname.includes("localhost") && !hostname.includes("127.0.0.1")) {
      riskScore += 15;
      threats.push("Insecure unencrypted HTTP protocol in use");
    }

    // Cap score at 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine Verdict
    let verdict: "SAFE" | "SUSPICIOUS" | "MALICIOUS" = "SAFE";
    if (riskScore >= 70) {
      verdict = "MALICIOUS";
    } else if (riskScore >= 35) {
      verdict = "SUSPICIOUS";
    }

    return NextResponse.json(
      {
        url: parsedUrl.toString(),
        domain: hostname,
        riskScore,
        verdict,
        impersonation,
        threats,
        scannedAt: new Date().toISOString(),
      },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[Extension Scan Error]", err);
    return NextResponse.json(
      { error: "Internal scanning failure" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
