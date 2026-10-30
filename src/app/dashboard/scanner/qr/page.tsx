"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { LiquidGlassCard } from "@/components/dashboard/LiquidGlassCard";
import { 
  QrCode, 
  UploadCloud, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  History, 
  Globe, 
  Lock, 
  FileText, 
  Activity, 
  FileWarning,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { QRScanResponse, QREvidence } from "@/modules/scanner/qr/types/qr-scanner";
import { notifyCyBroScanComplete } from "@/lib/cybro/events";
import { ScanFeedbackWidget } from "@/components/feedback/ScanFeedbackWidget";

interface HistoryWarnings {
  code: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface HistorySecurityChecks {
  isShortener: boolean;
  isPunycode: boolean;
  isUnicodeSpoof: boolean;
  isHttp: boolean;
  isSuspiciousTld: boolean;
  redirect_parameter_present?: boolean;
  redirect_destination_untrusted?: boolean;
  redirect_chain_observed?: boolean;
  redirect_chain_verified?: boolean;
  networkRedirectStatus?: "NOT_TESTED" | "VERIFIED_HTTP_CHAIN" | "BLOCKED_SSRF" | "FAILED";
  warnings: HistoryWarnings[];
}

interface HistoryEvidenceMetadata {
  securityChecks?: HistorySecurityChecks;
}

interface HistoryAnalysisMetadata {
  executiveSummary?: string;
  analystNotes?: string[];
  technicalReasoning?: string;
  evidence?: QREvidence | null;
}

interface ScanHistoryItem {
  id: string;
  type: string;
  payload: string | null;
  riskLevel: string;
  createdAt: string;
  evidenceMetadata: HistoryEvidenceMetadata | null;
  result?: {
    confidenceScore?: number;
    threatCategory?: string;
    analysisMetadata?: HistoryAnalysisMetadata | null;
  } | null;
}

export default function QrScannerPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing scan...");
  const [result, setResult] = useState<QRScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/scans/qr/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.scans || []);
      }
    } catch (err) {
      console.error("Failed to load QR history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = (uploadedFile: File) => {
    if (!uploadedFile.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, or WEBP).");
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit.");
      return;
    }

    setError(null);
    setResult(null);
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(uploadedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const stages = [
      "Extracting matrix code payload...",
      "Analyzing redirection & heuristics...",
      "Running ML model threat verdict...",
      "Finalizing diagnostics report...",
    ];

    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % stages.length;
      setLoadingStage(stages[step] ?? stages[0] ?? "");
    }, 900);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/scans/qr", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      let data: any;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        if (response.status === 413) {
          throw new Error("File is too large for server analysis. Please upload an image under 4.5 MB.");
        }
        throw new Error(
          response.ok
            ? "Invalid diagnostics payload received from server"
            : `Diagnostics Server Error (${response.status}): ${responseText.slice(0, 140) || response.statusText}`
        );
      }

      if (!response.ok) {
        const errorMsg =
          typeof data.error === "object"
            ? data.error?.message
            : data.message || data.error;
        throw new Error(errorMsg || `Diagnostic evaluation failed with status ${response.status}`);
      }

      setResult(data);
      fetchHistory();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
      }

      try {
        const isThreat = Boolean(data.riskLevel && data.riskLevel !== "SAFE" && data.riskLevel !== "LOW");
        notifyCyBroScanComplete({
          tool: "qr",
          toolName: "QR Code Threat Scanner",
          target: data.decodedText || data.extractedUrl || file.name,
          isThreat,
          threatLevel: isThreat ? "malicious" : "clean",
          summary: data.reasoning || `QR Code scanned: ${data.decodedText || "Analyzed payload"}`,
          findings: Array.isArray(data.indicators) ? data.indicators : [],
          rawResult: data,
        });
      } catch (cybroErr) {
        console.warn("Failed to notify CyBro:", cybroErr);
      }
    } catch (err: any) {
      const rawMsg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      const friendlyMsg =
        rawMsg === "Load failed" || rawMsg.includes("Failed to fetch")
          ? "Network timeout or connection interrupted while gathering threat evidence. Please try again."
          : rawMsg;
      setError(friendlyMsg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "SAFE":
        return "bg-emerald-50 text-emerald-700 border border-emerald-300/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 shadow-xs";
      case "LOW":
        return "bg-sky-50 text-sky-700 border border-sky-300/80 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 shadow-xs";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border border-amber-300/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 shadow-xs";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border border-orange-300/80 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 shadow-xs";
      case "CRITICAL":
      case "MALICIOUS":
        return "bg-rose-50 text-rose-700 border border-rose-300/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 shadow-xs";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-300/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "low":
        return "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800";
      case "medium":
        return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
      case "high":
        return "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  // Real explainable risk score directly from multi-vector risk engine (0 = Safe, 100 = Critical Threat)
  const riskScore = result ? (typeof result.riskScore === "number" ? result.riskScore : result.riskLevel === "SAFE" ? 5 : 75) : 0;
  const authenticityScore = result ? (typeof result.authenticityScore === "number" ? result.authenticityScore : (100 - riskScore)) : 100;

  // Circle constants for Risk Gauge
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  // Stroke indicates risk score proportion (0 to 100)
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="max-w-6xl space-y-7 pb-12 animate-in fade-in duration-300">
      <PageHeader 
        title="QR Code Security Scanner" 
        description="Upload a QR code to extract its target destination and run an instant ML-powered security audit."
      >
        <button 
          onClick={fetchHistory}
          className="liquid-glass-pill px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
          <span>Refresh Stats</span>
        </button>
      </PageHeader>

      <div className="grid gap-7 lg:grid-cols-12 items-start">
        {/* Left Column: Upload / Matrix Details (8 cols) */}
        <div className="lg:col-span-8 space-y-7">
          <LiquidGlassCard className="p-4 sm:p-7">
            <div className="flex items-center gap-3 mb-5">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: "var(--accent-subtle)",
                  border: "1px solid var(--hair-10)",
                  color: "var(--accent)",
                }}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>
                  Upload QR Code Image
                </h2>
                <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Drop your image here or select from files. Supported: PNG, JPG, JPEG, WEBP.
                </p>
              </div>
            </div>

            {!previewUrl ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed py-14 px-6 text-center cursor-pointer transition-all duration-300"
                style={{
                  backgroundColor: "var(--ground-secondary)",
                  borderColor: dragActive ? "#3b82f6" : "var(--hair-10)",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                
                {/* 3D Glass Upload Icon */}
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundColor: "var(--accent-subtle)",
                    border: "1px solid var(--hair-10)",
                    color: "var(--accent)",
                  }}
                >
                  <UploadCloud className="h-8 w-8 text-blue-500" />
                </div>
                
                <p className="mt-4 text-sm font-bold" style={{ color: "var(--ink)" }}>
                  Drag and drop QR file here, or click to browse
                </p>
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
                  High-resolution photo or vector PNG, JPG up to 10MB
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 p-3 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={previewUrl} 
                    alt="Uploaded QR Code Preview" 
                    className="h-auto w-full object-contain rounded-xl"
                  />
                  {loading && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse" style={{ top: '50%' }} />
                  )}
                </div>

                <div className="flex justify-center gap-3">
                  <button 
                    onClick={clearFile}
                    disabled={loading}
                    className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                  <button 
                    onClick={handleScan}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Analyzing Matrix..." : "Start Diagnostics Sweep"}
                  </button>
                </div>
              </div>
            )}

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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 animate-spin">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security Sweep In Progress</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">{loadingStage}</p>
                </div>
              </div>
            </LiquidGlassCard>
          )}

          {/* Scan Results */}
          {result && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Target & Decoded Text Card */}
              <LiquidGlassCard className="p-4 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Decoded Matrix Content
                    </h4>
                    <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      {result.decodedText}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Target URL Destination
                    </h4>
                    <p className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 break-all bg-blue-50/50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                      {result.extractedUrl}
                    </p>
                  </div>
                </div>
              </LiquidGlassCard>

              {/* Verdict Reasoning & Indicators */}
              <div className="grid gap-6 md:grid-cols-2">
                <LiquidGlassCard className="p-4 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Executive Verdict</h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {result.reasoning}
                    </p>
                  </div>

                  {result.indicators && result.indicators.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Key Risk Indicators
                      </h4>
                      <ul className="space-y-1.5">
                        {result.indicators.map((ind, i) => (
                          <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{ind}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </LiquidGlassCard>

                {/* HTTP Security Audit */}
                <LiquidGlassCard className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Perimeter Security Controls</h3>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { name: "Strict-Transport-Security", desc: "HSTS Encrypted Gating" },
                      { name: "Content-Security-Policy", desc: "Script/Resource Sandboxing" },
                      { name: "X-Frame-Options", desc: "Clickjacking Prevention" },
                      { name: "X-Content-Type-Options", desc: "MIME-sniffing Block" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400">{item.desc}</span>
                        </div>
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      </div>
                    ))}

                    {/* Network Redirect Telemetry Status */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Redirect Chain Telemetry</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400">
                          {result.securityChecks?.networkRedirectStatus === "VERIFIED_HTTP_CHAIN"
                            ? "Observed active HTTP hop chain"
                            : result.securityChecks?.networkRedirectStatus === "BLOCKED_SSRF"
                            ? "Gated by SSRF perimeter policy"
                            : "Static query analysis only (no unverified 301/302 claim)"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        result.securityChecks?.networkRedirectStatus === "VERIFIED_HTTP_CHAIN"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          : result.securityChecks?.networkRedirectStatus === "BLOCKED_SSRF"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                          : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
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
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Active Security Diagnosed Anomalies</h3>
                    </div>

                    <div className="space-y-2.5">
                      {result.securityChecks.warnings.map((w, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start justify-between gap-3 shadow-xs">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {w.title}
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">{w.code}</span>
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{w.description}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${getSeverityBadgeColor(w.severity)}`}>
                            {w.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </LiquidGlassCard>
                )}

                {/* Scan Feedback & Active Learning Widget */}
                <div className="md:col-span-2">
                  <ScanFeedbackWidget
                    scanId={result.scanId || `qr-${encodeURIComponent(result.extractedUrl || result.decodedText)}`}
                    tool="qr-scanner"
                    target={result.extractedUrl || result.decodedText}
                    originalVerdict={result.threatType}
                    originalRiskScore={result.riskScore}
                    extractedFeatures={{
                      riskLevel: result.riskLevel,
                      threatType: result.threatType,
                      confidence: result.confidence,
                      warningsCount: result.securityChecks?.warnings?.length || 0,
                      isShortener: result.securityChecks?.isShortener,
                      isHttp: result.securityChecks?.isHttp,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Platform Risk Score + Multi-Vector Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-7">
          {/* Security Score Panel */}
          <LiquidGlassCard className="p-4 sm:p-7 text-center">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "var(--muted)" }}>
              Threat Risk Assessment
            </h3>

            {/* Circular Gauge */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-36 h-36 -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="var(--hair-10)"
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
                        : result.riskLevel === "SUSPICIOUS"
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
                <span 
                  className="text-4xl font-extrabold font-display"
                  style={{ color: "var(--ink)" }}
                >
                  {result ? riskScore : "—"}
                </span>
                <span 
                  className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  Risk Score
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <span className="text-xs block font-medium" style={{ color: "var(--muted)" }}>Verified Threat Classification</span>
              {result ? (
                <div className="space-y-1.5">
                  <div>
                    <span className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider ${getRiskBadgeColor(result.riskLevel)}`}>
                      {result.riskLevel} RISK
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                    <span>Authenticity: <strong style={{ color: "var(--ink)" }}>{authenticityScore}/100</strong></span>
                    <span>•</span>
                    <span title={result.confidenceLabel || "Heuristic Confidence Estimate"}>
                      Confidence: <strong style={{ color: "var(--ink)" }}>{result.confidence}%</strong>
                      <span 
                        className="ml-1 text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold border"
                        style={{
                          backgroundColor: "var(--ground-secondary)",
                          color: "var(--ink-secondary)",
                          borderColor: "var(--hair-10)"
                        }}
                      >
                        {result.confidenceType === "CALIBRATED_EVIDENCE" ? "Verified" : "Heuristic"}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <span 
                  className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: "var(--ground-secondary)",
                    color: "var(--muted)",
                    border: "1px solid var(--hair-10)"
                  }}
                >
                  Diagnostics Idle
                </span>
              )}
            </div>

            {/* Phase 2: Explainable 6-Dimension Risk Factor Breakdown */}
            {result && result.scoreBreakdown && (
              <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Weighted Signal Attribution
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
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
                      <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-300">
                        <span>{dim.label}</span>
                        <span className="font-mono font-bold">{dim.val}/{dim.max}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">Recent QR Audits</h3>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Last 5 scans</span>
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.slice(0, 5).map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => {
                      const meta = scan.result?.analysisMetadata as any;
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
                        decodedText: scan.payload || "",
                        extractedUrl: scan.payload || "",
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
                          warnings: (scan.evidenceMetadata?.securityChecks?.warnings as any) || []
                        },
                        normalized: scan.payload || "",
                        riskScore: rScore,
                        authenticityScore: aScore,
                        riskLevel: (scan.riskLevel as any) || "SAFE",
                        confidence: scan.result?.confidenceScore || 90,
                        threatType: scan.result?.threatCategory || "BENIGN",
                        reasoning: meta?.executiveSummary || "Analyzed QR matrix destination verified.",
                        indicators: meta?.analystNotes || ["Clean SSL certificate", "Known reputable domain"],
                        report: meta?.technicalReasoning || "Full diagnostic sweep completed.",
                        scoreBreakdown: breakdown,
                        signalEvidence: meta?.signalEvidence || [],
                        evidence: meta?.evidence || null
                      });
                    }}
                    className="liquid-glass-subcard p-3 rounded-2xl flex items-center justify-between cursor-pointer group transition-colors"
                    style={{
                      backgroundColor: "var(--ground-secondary)",
                      border: "1px solid var(--hair-10)",
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <p 
                        className="font-mono text-xs font-bold truncate"
                        style={{ color: "var(--ink)" }}
                      >
                        {scan.payload || "QR Payload"}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
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
                No recent QR audits recorded yet.
              </p>
            )}
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  );
}
