import { NextRequest, NextResponse } from "next/server";
import { URLScanRequestSchema, UrlNormalizer } from "@/lib/scanner/url/normalizer";
import { EvidenceGatherer } from "@/lib/scanner/url/gatherer";
import { ThreatAnalyzer, UrlScannerPromptBuilder } from "@/lib/ai/core";
import { db } from "@/lib/db";
import crypto from "crypto";
import type { InputJsonValue } from "@prisma/client/runtime/client";

export async function POST(req: NextRequest) {
  let payloadHash = "";
  let ipHash = "";
  let normalizedUrl = "Unknown URL";
  
  try {
    const body = await req.json();
    const parseResult = URLScanRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid URL", details: parseResult.error }, { status: 400 });
    }

    const { url } = parseResult.data;
    const normalized = UrlNormalizer.normalize(url);
    normalizedUrl = normalized.normalized;

    // Hash payload and IP for anonymous tracking
    payloadHash = crypto.createHash('sha256').update(normalized.normalized).digest('hex');
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // Gather Evidence
    const evidence = await EvidenceGatherer.gather(normalized.normalized, normalized.hostname);

    // AI Analysis
    const promptBuilder = new UrlScannerPromptBuilder();
    const analysisResult = await ThreatAnalyzer.analyze({
      payload: normalized.normalized,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evidence: evidence as any,
      promptBuilder
    });

    // Persist in DB
    const scan = await db.$transaction(async (tx) => {
      const newScan = await tx.scan.create({
        data: {
          type: "URL",
          status: "COMPLETED",
          riskLevel: analysisResult.riskLevel,
          payloadHash,
          ipHash,
        }
      });

      await tx.scanResult.create({
        data: {
          scanId: newScan.id,
          aiProvider: analysisResult.aiResponse.providerName,
          aiModel: analysisResult.aiResponse.modelName,
          inferenceTimeMs: analysisResult.aiResponse.inferenceTimeMs,
          tokenUsage: analysisResult.cost.promptTokens + analysisResult.cost.completionTokens,
          confidenceScore: analysisResult.confidence,
          threatCategory: analysisResult.threatType,
          analysisMetadata: analysisResult.aiResponse as unknown as InputJsonValue,
          processingCost: analysisResult.cost.estimatedCostUsd
        }
      });

      return newScan;
    });

    return NextResponse.json({
      scanId: scan.id,
      normalized: normalized.normalized,
      riskLevel: analysisResult.riskLevel,
      confidence: analysisResult.confidence,
      threatType: analysisResult.threatType,
      reasoning: analysisResult.aiResponse.executiveSummary,
      indicators: analysisResult.aiResponse.analystNotes,
      report: analysisResult.aiResponse.technicalReasoning
    });

  } catch (error) {
    console.error("URL Scan Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.startsWith("Network Error") && payloadHash && ipHash) {
      let specificReason = "An unknown network error occurred.";
      let technicalFindings = "The connection could not be established.";
      
      if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("NXDOMAIN") || errorMessage.includes("Host not found") || errorMessage.includes("DNS lookup failed")) {
        specificReason = "The domain could not be resolved via DNS.";
        technicalFindings = "DNS lookup failed for the hostname. The domain may not exist, might have expired, or is currently experiencing DNS resolution issues.";
      } else if (errorMessage.includes("ECONNREFUSED")) {
        specificReason = "The server refused the connection.";
        technicalFindings = "The host was resolved, but the target server actively refused the connection. The service might be down or heavily firewalled.";
      } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timed out")) {
        specificReason = "The connection timed out.";
        technicalFindings = "The server took too long to respond. The host might be offline, dropping packets, or experiencing high load.";
      } else if (errorMessage.includes("ECONNRESET")) {
        specificReason = "The connection was reset by the peer.";
        technicalFindings = "The connection was established but abruptly terminated by the remote server, possibly due to a firewall or load balancer rule.";
      } else if (errorMessage.includes("tls") || errorMessage.includes("CERT_") || errorMessage.includes("SSL")) {
        specificReason = "The TLS handshake failed.";
        technicalFindings = "The server's SSL/TLS certificate is invalid, expired, or untrusted, preventing a secure connection.";
      } else if (errorMessage.includes("HTTP")) {
        specificReason = "The HTTP request failed.";
        technicalFindings = "The server was reached but an HTTP-level error prevented successful data retrieval.";
      }

      try {
        const scan = await db.scan.create({
          data: {
            type: "URL",
            status: "COMPLETED", // Completed because we successfully determined it's unreachable
            riskLevel: "UNKNOWN",
            payloadHash,
            ipHash,
            evidenceMetadata: { error: errorMessage }
          }
        });
        
        return NextResponse.json({
          scanId: scan.id,
          normalized: normalizedUrl,
          riskLevel: "UNKNOWN",
          confidence: 0,
          threatType: "UNREACHABLE",
          reasoning: specificReason,
          indicators: [
            `Status: UNREACHABLE`,
            `Confidence: Very Low`,
            `Error: ${errorMessage.replace("Network Error: ", "")}`
          ],
          report: `### Threat Assessment\nThe target URL is currently UNREACHABLE. Because the server could not be contacted and no content or valid evidence could be retrieved, a definitive risk classification (SAFE or PHISHING) cannot be made.\n\n### Positive Indicators\nNone.\n\n### Negative Indicators\nNone.\n\n### Unknown Indicators\nAll standard evidence points (TLS, HTTP Headers, Page Content, Redirects) are missing due to the network failure.\n\n### Technical Findings\n${technicalFindings}\n\n### Recommended Action\nVerify the URL spelling or check whether the domain currently exists.`
        });
      } catch (dbError) {
        console.error("Failed to log failed scan:", dbError);
      }
    }

    return NextResponse.json(
      { error: "Internal Server Error", message: errorMessage },
      { status: 500 }
    );
  }
}
