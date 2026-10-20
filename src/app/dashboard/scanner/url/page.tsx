"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LiquidGlassCard } from "@/components/dashboard/LiquidGlassCard";
import { Globe2, Radar, ShieldCheck, TriangleAlert, CheckCircle2, ShieldAlert } from "lucide-react";
import { notifyCyBroScanComplete } from "@/lib/cybro/events";

export default function UrlScannerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/scans/url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Failed to scan URL");
      setResult(data);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
      }

      // Notify CyBro for real-time optimal safe action advisory
      const riskLevel = String(data.riskLevel || data.threatLevel || "SAFE").toUpperCase();
      const isThreat = riskLevel === "CRITICAL" || riskLevel === "MALICIOUS" || riskLevel === "HIGH" || (data.score && data.score > 50);
      notifyCyBroScanComplete({
        tool: "scanner",
        target: url,
        isThreat,
        threatLevel: isThreat ? "malicious" : "clean",
        summary: `URL Risk: ${riskLevel}. Score: ${data.score || 0}/100. Category: ${data.category || "General"}`,
        findings: [
          `Risk Level: ${riskLevel}`,
          `Threat Score: ${data.score || 0}/100`,
          `Detected Threats: ${data.threats?.length || 0}`,
        ],
        rawResult: data,
      });
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "SAFE": return "text-emerald-600";
      case "LOW": return "text-sky-600";
      case "MEDIUM": return "text-amber-600";
      case "HIGH": return "text-orange-600";
      case "CRITICAL":
      case "MALICIOUS": return "text-rose-600";
      default: return "text-slate-600";
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case "SAFE":
        return "bg-emerald-50 text-emerald-700 border-emerald-300";
      case "LOW":
        return "bg-sky-50 text-sky-700 border-sky-300";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-300";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-300";
      case "CRITICAL":
      case "MALICIOUS":
        return "bg-rose-50 text-rose-700 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="max-w-5xl space-y-7 pb-12 animate-in fade-in duration-300">
      <PageHeader 
        title="URL Scanner" 
        description="Deep AI lexical analysis of URLs, domain heuristics, DNS, and HTTP security headers."
      />

      {/* Input Glass Card */}
      <LiquidGlassCard className="p-7 sm:p-8">
        <div className="relative mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200/80 bg-gradient-to-tr from-blue-50 to-indigo-50 shadow-xs text-blue-600">
            <Globe2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 tracking-tight">
              Scan a New Target URL
            </h2>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Enter any suspicious domain, shortlink, or destination link to analyze it instantly.
            </p>
          </div>
        </div>

        <form onSubmit={handleScan} className="relative flex flex-col gap-3 sm:flex-row">
          <label htmlFor="url" className="sr-only">URL</label>
          <input
            id="url"
            type="url"
            placeholder="https://example-banking-verification.com/login"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-13 min-w-0 flex-1 rounded-2xl border border-slate-200/90 bg-white/90 px-4 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-inner"
            required
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 px-7 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] hover:shadow-[0_12px_28px_rgba(37,99,235,0.38)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            <Radar className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Analyzing Matrix..." : "Analyze URL"}
          </button>
        </form>

        {error && (
          <div className="relative mt-5 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
            <TriangleAlert className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </LiquidGlassCard>

      {/* Result Glass Card */}
      {result && (
        <LiquidGlassCard className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="border-b border-slate-100 p-6 sm:p-8 bg-white/40">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
              <div className="min-w-0">
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Target Destination
                </h3>
                <p className="break-all font-mono text-sm sm:text-base font-bold text-slate-900 bg-white/80 p-3 rounded-xl border border-slate-200/80">
                  {result.normalized}
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Risk Level
                </h3>
                <div className="flex items-center sm:justify-end gap-2.5">
                  {result.threatType && (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700 shadow-xs">
                      {result.threatType}
                    </span>
                  )}
                  <span className={`text-2xl font-extrabold font-display ${getRiskColor(result.riskLevel)}`}>
                    {result.riskLevel}
                  </span>
                </div>
                {result.confidence > 0 && (
                  <p className="mt-1 font-mono text-xs text-slate-400 font-semibold">
                    Confidence: {result.confidence}%
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-7 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI & Model Verdict Reasoning</h3>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 font-medium">
                {result.reasoning}
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Key Security Indicators</h3>
              </div>
              {result.indicators?.length ? (
                <ul className="space-y-2">
                  {result.indicators.map((indicator: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 font-medium">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic font-medium">
                  No malicious indicators detected.
                </p>
              )}
            </div>
          </div>
        </LiquidGlassCard>
      )}
    </div>
  );
}
