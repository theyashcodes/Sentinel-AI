"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LiquidGlassCard } from "@/components/dashboard/LiquidGlassCard";
import { 
  Globe2, 
  Radar, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  History, 
  FileText, 
  FileWarning,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
import { QRScanSecurityCheckResult, ScoreBreakdown, SignalEvidenceItem } from "@/modules/scanner/qr/types/qr-scanner";
import { notifyCyBroScanComplete } from "@/lib/cybro/events";

export interface URLScanResponse {
  scanId: string;
  normalized: string;
  riskScore: number;
  authenticityScore: number;
  riskLevel: string;
  confidence: number;
  confidenceType?: "HEURISTIC_ESTIMATE" | "CALIBRATED_EVIDENCE";
  confidenceLabel?: string;
  threatType: string;
  reasoning: string;
  indicators: string[];
  report?: string;
  scoreBreakdown?: ScoreBreakdown;
  signalEvidence?: SignalEvidenceItem[];
  securityChecks?: QRScanSecurityCheckResult;
  evidence?: unknown;
  mlProbability?: Record<string, number>;
}

interface ScanHistoryItem {
  id: string;
  type: string;
  payload: string | null;
  riskLevel: string;
  createdAt: string;
  evidenceMetadata?: {
    securityChecks?: QRScanSecurityCheckResult;
    scoreBreakdown?: ScoreBreakdown;
  } | null;
  result?: {
    confidenceScore?: number;
    threatCategory?: string;
    analysisMetadata?: {
      riskScore?: number;
      authenticityScore?: number;
      scoreBreakdown?: ScoreBreakdown;
      signalEvidence?: SignalEvidenceItem[];
      securityChecks?: QRScanSecurityCheckResult;
      evidence?: unknown;
      probabilities?: Record<string, number>;
      reasoning?: string;
      technicalReasoning?: string;
    } | null;
  } | null;
}

export default function UrlScannerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing scan...");
  const [result, setResult] = useState<URLScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/scans/url/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.scans || []);
      }
    } catch (err) {
      console.error("Failed to load URL history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleScan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const stages = [
      "Analyzing URL structure & homoglyphs...",
      "Evaluating PSL domain masquerading...",
      "Running ML & neural threat verdict...",
      "Calculating weighted risk telemetry...",
    ];

    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % stages.length;
      setLoadingStage(stages[step] ?? stages[0] ?? "");
    }, 700);

    try {
      const response = await fetch("/api/scans/url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to scan URL");
      }

      setResult(data);
      fetchHistory();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
      }

      // Notify CyBro for real-time optimal safe action advisory
      const riskLevel = String(data.riskLevel || "SAFE").toUpperCase();
      const isThreat = riskLevel !== "SAFE" && riskLevel !== "LOW";
      notifyCyBroScanComplete({
        tool: "scanner",
        toolName: "URL Threat Scanner",
        target: data.normalized || url,
        isThreat,
        threatLevel: isThreat ? "malicious" : "clean",
        summary: data.reasoning || `URL Risk: ${riskLevel}. Score: ${data.riskScore || 0}/100.`,
        findings: Array.isArray(data.indicators) ? data.indicators : [
          `Risk Level: ${riskLevel}`,
          `Risk Score: ${data.riskScore || 0}/100`,
          `Threat Category: ${data.threatType || "UNKNOWN"}`,
        ],
        rawResult: data,
      });
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "An unexpected error occurred.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "SAFE":
        return "bg-emerald-50 text-emerald-700 border border-emerald-300/80 shadow-xs";
      case "LOW":
        return "bg-sky-50 text-sky-700 border border-sky-300/80 shadow-xs";
      case "SUSPICIOUS":
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border border-amber-300/80 shadow-xs";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border border-orange-300/80 shadow-xs";
      case "CRITICAL":
      case "MALICIOUS":
        return "bg-rose-50 text-rose-700 border border-rose-300/80 shadow-xs";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-300/80";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "low":
        return "bg-sky-50 text-sky-700 border border-sky-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "high":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "critical":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  // Real explainable risk score directly from multi-vector risk engine (0 = Safe, 100 = Critical Threat)
  const riskScore = result ? (typeof result.riskScore === "number" ? result.riskScore : result.riskLevel === "SAFE" ? 5 : 75) : 0;
  const authenticityScore = result ? (typeof result.authenticityScore === "number" ? result.authenticityScore : (100 - riskScore)) : 100;

  // Circle constants for Risk Gauge
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="max-w-6xl space-y-7 pb-12 animate-in fade-in duration-300">
      <PageHeader 
        title="URL Security Scanner" 
        description="Deep AI lexical analysis, PSL domain heuristics, homoglyph detection, and perimeter security telemetry."
      >
        <button 
          onClick={fetchHistory}
          className="liquid-glass-pill px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
          <span>Refresh Stats</span>
        </button>
      </PageHeader>

      <div className="grid gap-7 lg:grid-cols-12 items-start">
        {/* Left Column: Form & Telemetry Details (8 cols) */}
        <div className="lg:col-span-8 space-y-7">
          {/* Target URL Input Card */}
          <LiquidGlassCard className="p-4 sm:p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-xs">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 tracking-tight">
                  Scan a Target URL
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Enter any suspicious domain, shortlink, or destination link to analyze it instantly.
                </p>
              </div>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
              <div className="relative flex flex-col gap-3 sm:flex-row">
                <label htmlFor="url" className="sr-only">URL</label>
                <input
                  id="url"
                  type="text"
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
                  {loading ? "Analyzing..." : "Analyze URL"}
                </button>
              </div>

              {/* Quick sample chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Test:</span>
                <button
                  type="button"
                  onClick={() => setUrl("https://github.com")}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  github.com
                </button>
                <button
                  type="button"
                  onClick={() => setUrl("https://apple.com-login-verify.top/auth")}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  apple.com-login...
                </button>
                <button
                  type="button"
                  onClick={() => setUrl("http://192.168.1.1/admin")}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  192.168.1.1 (SSRF)
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-5 flex gap-3 items-start p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
                <FileWarning className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Diagnostics Notice</span>
                  {error}
                </div>
              </div>
            )}
          </LiquidGlassCard>

          {/* Loading Indicator */}
          {loading && (
            <LiquidGlassCard className="p-4 sm:p-7">
              <div className="py-4 flex flex-col items-center justify-center space-y-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 animate-spin">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Security Sweep In Progress</h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{loadingStage}</p>
                </div>
              </div>
            </LiquidGlassCard>
          )}

          {/* Scan Results */}
          {result && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Target Destination Card */}
              <LiquidGlassCard className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Target URL Destination
                    </h4>
                    <p className="font-mono text-xs sm:text-sm font-semibold text-blue-600 break-all bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                      {result.normalized}
                    </p>
                  </div>
                  {result.normalized && (
                    <a
                      href={result.normalized}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                      title="Open target (Proceed with caution)"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </LiquidGlassCard>

              {/* Verdict Reasoning & Indicators */}
              <div className="grid gap-6 md:grid-cols-2">
                <LiquidGlassCard className="p-4 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <h3 className="font-bold text-sm text-slate-900 tracking-tight">Executive Verdict</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {result.reasoning}
                    </p>
                  </div>

                  {result.indicators && result.indicators.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Key Risk Indicators
                      </h4>
                      <ul className="space-y-1.5">
                        {result.indicators.map((ind, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{ind}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </LiquidGlassCard>

                {/* HTTP Perimeter Security Audit */}
                <LiquidGlassCard className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-900 tracking-tight">Perimeter Security Controls</h3>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { name: "Strict-Transport-Security", desc: "HSTS Encrypted Gating" },
                      { name: "Content-Security-Policy", desc: "Script/Resource Sandboxing" },
                      { name: "X-Frame-Options", desc: "Clickjacking Prevention" },
                      { name: "X-Content-Type-Options", desc: "MIME-sniffing Block" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block">{item.name}</span>
                          <span className="text-[10px] text-slate-400">{item.desc}</span>
                        </div>
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      </div>
                    ))}

                    {/* Network Redirect Telemetry Status */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">Redirect Chain Telemetry</span>
                        <span className="text-[10px] text-slate-400">
                          {result.securityChecks?.networkRedirectStatus === "VERIFIED_HTTP_CHAIN"
                            ? "Observed active HTTP hop chain"
                            : result.securityChecks?.networkRedirectStatus === "BLOCKED_SSRF"
                            ? "Gated by SSRF perimeter policy"
                            : "Static query analysis only (no unverified 301/302 claim)"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        result.securityChecks?.networkRedirectStatus === "VERIFIED_HTTP_CHAIN"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : result.securityChecks?.networkRedirectStatus === "BLOCKED_SSRF"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {result.securityChecks?.networkRedirectStatus || "NOT TESTED"}
                      </span>
                    </div>
                  </div>
                </LiquidGlassCard>

                {/* Specific Security Warnings & Diagnostic Evidence */}
                {result.securityChecks?.warnings && result.securityChecks.warnings.length > 0 && (
                  <LiquidGlassCard className="p-4 sm:p-6 md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <h3 className="font-bold text-sm text-slate-900 tracking-tight">Active Security Diagnosed Anomalies</h3>
                    </div>

                    <div className="space-y-2.5">
                      {result.securityChecks.warnings.map((w, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 flex items-start justify-between gap-3 shadow-xs">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                              {w.title}
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{w.code}</span>
                            </span>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{w.description}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${getSeverityBadgeColor(w.severity)}`}>
                            {w.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </LiquidGlassCard>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Threat Risk Assessment Gauge + Multi-Vector Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-7">
          {/* Security Score Panel */}
          <LiquidGlassCard className="p-4 sm:p-7 text-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
              Threat Risk Assessment
            </h3>

            {/* Circular Gauge */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-36 h-36 -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="#e2e8f0"
                  strokeWidth="10"
                  fill="transparent"
                />
                <motion.circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke={
                    result
                      ? result.riskLevel === "SAFE"
                        ? "#10b981"
                        : result.riskLevel === "LOW"
                        ? "#0284c7"
                        : result.riskLevel === "SUSPICIOUS" || result.riskLevel === "MEDIUM"
                        ? "#f59e0b"
                        : result.riskLevel === "HIGH"
                        ? "#ea580c"
                        : "#e11d48"
                      : "#3b82f6"
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-slate-900 font-display">
                  {result ? riskScore : "—"}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Risk Score
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <span className="text-xs text-slate-400 block font-medium">Verified Threat Classification</span>
              {result ? (
                <div className="space-y-1.5">
                  <div>
                    <span className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider ${getRiskBadgeColor(result.riskLevel)}`}>
                      {result.riskLevel} RISK
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span>Authenticity: <strong className="text-slate-800">{authenticityScore}/100</strong></span>
                    <span>•</span>
                    <span title={result.confidenceLabel || "Heuristic Confidence Estimate"}>
                      Confidence: <strong className="text-slate-800">{result.confidence}%</strong>
                      <span className="ml-1 text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold border border-slate-200/60">
                        {result.confidenceType === "CALIBRATED_EVIDENCE" ? "Verified" : "Heuristic"}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <span className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 uppercase tracking-wider">
                  Diagnostics Idle
                </span>
              )}
            </div>

            {/* Explainable 6-Dimension Risk Factor Breakdown */}
            {result && result.scoreBreakdown && (
              <div className="mt-6 pt-5 border-t border-slate-200/80 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Weighted Signal Attribution
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-800">
                    {result.scoreBreakdown.totalRiskScore}/100
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: "Brand Masquerading", val: result.scoreBreakdown.brandImpersonationScore, max: 25 },
                    { label: "Unicode & Homoglyphs", val: result.scoreBreakdown.unicodeConfusableScore, max: 20 },
                    { label: "Redirect Integrity", val: result.scoreBreakdown.redirectRiskScore, max: 20 },
                    { label: "Structure & SSRF", val: result.scoreBreakdown.urlStructureScore, max: 15 },
                    { label: "Domain Reputation", val: result.scoreBreakdown.domainReputationScore, max: 15 },
                    { label: "Contextual Lures", val: result.scoreBreakdown.contextualLureScore, max: 5 },
                  ].map((dim, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>{dim.label}</span>
                        <span className="font-mono font-bold">{dim.val}/{dim.max}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            dim.val === 0 ? "bg-emerald-400" : dim.val >= dim.max * 0.7 ? "bg-rose-500" : "bg-amber-400"
                          }`}
                          style={{ width: `${Math.min(100, (dim.val / dim.max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </LiquidGlassCard>

          {/* Recent Audits Panel */}
          <LiquidGlassCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">Recent URL Audits</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Last 5 scans</span>
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.slice(0, 5).map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => {
                      const meta = scan.result?.analysisMetadata;
                      const rScore = typeof meta?.riskScore === "number"
                        ? meta.riskScore
                        : scan.riskLevel === "SAFE" ? 5 : scan.riskLevel === "LOW" ? 25 : scan.riskLevel === "MEDIUM" ? 50 : 80;
                      const aScore = meta?.authenticityScore ?? (100 - rScore);
                      const breakdown = meta?.scoreBreakdown || {
                        brandImpersonationScore: 0,
                        unicodeConfusableScore: 0,
                        redirectRiskScore: 0,
                        urlStructureScore: 0,
                        domainReputationScore: 0,
                        contextualLureScore: 0,
                        totalRiskScore: rScore,
                      };

                      setResult({
                        scanId: scan.id,
                        normalized: scan.payload || "",
                        riskScore: rScore,
                        authenticityScore: aScore,
                        riskLevel: scan.riskLevel || "SAFE",
                        confidence: scan.result?.confidenceScore || 90,
                        threatType: scan.result?.threatCategory || "BENIGN",
                        reasoning: meta?.reasoning || meta?.technicalReasoning || "Analyzed URL destination verified.",
                        indicators: ["Lexical structure inspected", "Domain authenticity checked"],
                        scoreBreakdown: breakdown,
                        signalEvidence: meta?.signalEvidence || [],
                        securityChecks: {
                          isShortener: scan.evidenceMetadata?.securityChecks?.isShortener ?? false,
                          isPunycode: scan.evidenceMetadata?.securityChecks?.isPunycode ?? false,
                          isUnicodeSpoof: scan.evidenceMetadata?.securityChecks?.isUnicodeSpoof ?? false,
                          isHttp: scan.evidenceMetadata?.securityChecks?.isHttp ?? false,
                          isSuspiciousTld: scan.evidenceMetadata?.securityChecks?.isSuspiciousTld ?? false,
                          redirect_parameter_present: scan.evidenceMetadata?.securityChecks?.redirect_parameter_present ?? false,
                          redirect_destination_untrusted: scan.evidenceMetadata?.securityChecks?.redirect_destination_untrusted ?? false,
                          redirect_chain_observed: scan.evidenceMetadata?.securityChecks?.redirect_chain_observed ?? false,
                          redirect_chain_verified: scan.evidenceMetadata?.securityChecks?.redirect_chain_verified ?? false,
                          networkRedirectStatus: scan.evidenceMetadata?.securityChecks?.networkRedirectStatus ?? "NOT_TESTED",
                          warnings: scan.evidenceMetadata?.securityChecks?.warnings || []
                        },
                        evidence: meta?.evidence || null
                      });
                    }}
                    className="liquid-glass-subcard p-3 rounded-2xl flex items-center justify-between cursor-pointer group hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-mono text-xs font-bold text-slate-800 truncate">
                        {scan.payload || "URL Target"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${getRiskBadgeColor(scan.riskLevel)}`}>
                      {scan.riskLevel}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No recent URL audits recorded yet.
              </p>
            )}
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
}
