"use client";

import { useState } from "react";
import { Globe2, Radar, ShieldCheck, TriangleAlert } from "lucide-react";

export default function UrlScannerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  // API response is intentionally untyped until the scanner contract is shared.
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Failed to scan URL");
      setResult(data);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "SAFE": return "text-emerald-400";
      case "LOW": return "text-cyan-400";
      case "MEDIUM": return "text-yellow-400";
      case "HIGH": return "text-orange-400";
      case "CRITICAL": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00f2ff]">Analysis protocol</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">URL Scanner</h1>
        <p className="mt-3 text-sm font-medium text-gray-400">Deep AI analysis of URLs, WHOIS, DNS, and HTTP headers.</p>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#00f2ff]/10 blur-3xl" />
        <div className="relative mb-7 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
            <Globe2 className="h-6 w-6 text-[#00f2ff]" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">Scan a new URL</h2>
            <p className="mt-1 text-sm text-gray-500">Enter a suspicious link to analyze it instantly.</p>
          </div>
        </div>
        <form onSubmit={handleScan} className="relative flex flex-col gap-3 sm:flex-row">
          <label htmlFor="url" className="sr-only">URL</label>
          <input
            id="url"
            type="url"
            placeholder="https://example.com/login"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 font-mono text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#bc13fe] to-[#00f2ff] px-6 text-sm font-bold text-white shadow-[0_0_20px_rgba(188,19,254,0.35)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
            <Radar className="h-4 w-4" />
            {loading ? "Analyzing..." : "Analyze URL"}
          </button>
        </form>
        {error && (
          <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md">
          <div className="border-b border-white/10 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Target</h3>
                <p className="break-all font-mono text-base text-white sm:text-lg">{result.normalized}</p>
              </div>
              <div className="shrink-0 text-right">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Risk Level</h3>
                <p className={`text-2xl font-bold ${getRiskColor(result.riskLevel)}`}>{result.riskLevel}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-bold text-white">AI Reasoning</h3></div>
              <p className="text-sm leading-relaxed text-gray-300">{result.reasoning}</p>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold text-white">Key Indicators</h3>
              {result.indicators?.length ? (
                <ul className="space-y-2">
                  {result.indicators.map((indicator: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300"><span className="mt-0.5 text-red-400">•</span><span>{indicator}</span></li>
                  ))}
                </ul>
              ) : <p className="text-sm italic text-gray-500">No malicious indicators found.</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
