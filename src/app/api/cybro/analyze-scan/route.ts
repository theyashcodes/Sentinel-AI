import { NextRequest, NextResponse } from "next/server";
import { queryGrok } from "@/lib/cybro/grok";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, target, isThreat, threatLevel, summary, findings } = body;

    const toolLabels: Record<string, string> = {
      tracer: "Redirect Tracer & Homoglyph Detector",
      forensics: "AI Media Forensics (C2PA & Spectral FFT)",
      voice: "AI Voice Clone & Audio Deepfake Forensics",
      email: "Phishing Email Dissector (SPF/DKIM/DMARC)",
      scanner: "URL Threat Scanner",
      qr: "QR Phishing Scanner",
    };

    const friendlyTool = toolLabels[tool] || tool || "Scanner";

    const prompt = `REAL-TIME DASHBOARD SCAN JUST COMPLETED:
- Tool: ${friendlyTool}
- Target: ${target || "Unknown"}
- Threat Detected: ${isThreat ? "YES (MALICIOUS/SUSPICIOUS)" : "NO (VERIFIED SAFE)"}
- Threat Level: ${threatLevel || (isThreat ? "malicious" : "clean")}
- Summary: ${summary || "Scan completed"}
- Findings: ${Array.isArray(findings) ? findings.join(", ") : "None"}

YOUR TASK:
Provide an immediate, optimal real-time advisory in maximum 3-4 short lines:
1. Quick 1-line witty, sharp reaction based on what was found.
2. Clear verdict in 1 line: VERDICT: ${isThreat ? "THREAT DETECTED" : "VERIFIED SAFE"} (DO NOT enclose in brackets).
3. Optimal Safe Action: 2 concise bullet points for what the user or admin should do right now.

End with: <!--METADATA:{"threatDetected":${isThreat ? "true" : "false"},"mood":"${isThreat ? "angry" : "happy"}"}-->`;

    const grokResult = await queryGrok(
      [{ role: "user", content: prompt }],
      undefined,
      {
        tool: friendlyTool,
        target: target || "Target",
        isThreat: Boolean(isThreat),
        threatLevel: threatLevel || (isThreat ? "malicious" : "clean"),
        summary: summary || "Scan completed",
        findings: Array.isArray(findings) ? findings : [],
      }
    );

    if (grokResult) {
      return NextResponse.json({
        reply: grokResult.reply,
        mood: grokResult.mood,
        threatDetected: grokResult.threatDetected,
        quickSuggestions: isThreat
          ? ["How do I block this threat?", "Explain technical risk", "Generate incident report"]
          : ["Scan another target", "What makes this safe?", "View forensic metadata"],
      });
    }

    // Local smart fallback if Groq is momentarily busy
    if (isThreat) {
      return NextResponse.json({
        reply: `🛡️ **Sentinel Threat Advisory: ${friendlyTool}**\nTarget \`${target}\` flagged with suspicious risk indicators.\nVERDICT: THREAT DETECTED\n- Avoid interaction, credentials entry, or execution on this target.\n- Quarantine the asset and inspect technical telemetry.`,
        mood: "angry",
        threatDetected: true,
        quickSuggestions: ["How do I block this threat?", "Explain technical risk"],
      });
    } else {
      return NextResponse.json({
        reply: `⚡ **Verified Clean Scan on \`${target}\`!**\nZero anomalies, homoglyphs, or malicious signatures detected in ${friendlyTool}.\nVERDICT: VERIFIED SAFE\n- All cryptographic seals and heuristic baselines passed cleanly.\n- Safe to proceed with normal workflow.`,
        mood: "happy",
        threatDetected: false,
        quickSuggestions: ["Scan another target", "What makes this safe?", "View forensic metadata"],
      });
    }
  } catch (error) {
    console.error("[CyBro Analyze Scan API Error]", error);
    return NextResponse.json(
      { error: "Failed to generate scan advisory" },
      { status: 500 }
    );
  }
}
