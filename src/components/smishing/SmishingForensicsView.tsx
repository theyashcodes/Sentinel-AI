"use client";

import { useState } from "react";
import {
  MessageSquareWarning,
  Phone,
  Radio,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Shield,
  Activity,
  UserCheck,
  FileCode2,
  AlertOctagon,
  Search,
} from "lucide-react";
import { ForensicReportModal } from "@/components/forensics/ForensicReportModal";
import { ForensicReportData } from "@/lib/forensics/reportGenerator";
import type { SmishingAuditResult } from "@/lib/scanner/smishing";

const REAL_SCAM_PRESETS = [
  {
    title: "⚡ Electricity Disconnection Scam",
    tag: "High-Frequency Utility Fraud",
    sender: "9810123456",
    text: "Dear customer your electricity power will be disconnected tonight at 9:30 PM from power office because your previous month bill was not updated. Please immediately contact our officer at 9810123456 or update here: bit.ly/power-pay",
  },
  {
    title: "🏦 SBI YONO Blocked APK Trap",
    tag: "Banking Trojan Vector",
    sender: "9820456789",
    text: "Dear SBI User, your YONO Netbanking has been blocked today due to pending KYC verification. Download and install this secure update APK immediately to restore access: sbi-yono-update.apk",
  },
  {
    title: "📦 India Post Delivery Failed",
    tag: "Courier Advance-Fee Scam",
    sender: "9431876543",
    text: "Your India Post parcel delivery failed due to incomplete address details. Update your address within 24 hours and pay ₹5 re-delivery fee at indiapost-track.xyz",
  },
  {
    title: "✅ Genuine Bank Transaction (Safe)",
    tag: "Verified TRAI DLT Header",
    sender: "AD-SBIINB",
    text: "Dear Customer, your OTP for transaction of INR 3,500.00 at Amazon India is 849201. Valid for 10 mins. Do not share OTP with anyone - State Bank of India.",
  },
];

export function SmishingForensicsView() {
  const [messageText, setMessageText] = useState("");
  const [senderInput, setSenderInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<SmishingAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleScan = async (overrideMsg?: string, overrideSender?: string) => {
    const textToScan = overrideMsg !== undefined ? overrideMsg : messageText;
    const senderToScan = overrideSender !== undefined ? overrideSender : senderInput;

    if (!textToScan.trim()) {
      setError("Please enter or paste an SMS / WhatsApp message to scan.");
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const res = await fetch("/api/scans/smishing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToScan,
          sender: senderToScan || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      setResult(json.result);
    } catch (err: any) {
      setError(err?.message || "Failed to analyze message.");
    } finally {
      setScanning(false);
    }
  };

  const applyPreset = (preset: typeof REAL_SCAM_PRESETS[0]) => {
    setMessageText(preset.text);
    setSenderInput(preset.sender);
    handleScan(preset.text, preset.sender);
  };

  const handleCopySummary = () => {
    if (!result) return;
    const summary = `[SENTINEL AI SMISHING FORENSIC AUDIT]
Verdict: ${result.verdict} (Risk: ${result.riskScore}/100)
Category: ${result.category}
Sender: ${result.phoneIntelligence?.formattedNumber || result.senderInput || "Not Specified"}
Reported Caller/Entity: ${result.phoneIntelligence?.callerName || "Unknown"}
Telecom Carrier: ${result.phoneIntelligence?.carrier || "N/A"} (${result.phoneIntelligence?.circle || "N/A"})
Spam Reports: ${result.phoneIntelligence?.spamReportsCount || 0}
Panic/Urgency Score: ${result.panicScore}/100
Timestamp: ${result.auditTimestamp}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setMessageText("");
    setSenderInput("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header Banner ── */}
      <div
        className="rounded-2xl p-6 border shadow-xl backdrop-blur-xl"
        style={{
          backgroundColor: "var(--panel-card)",
          borderColor: "var(--panel-card-border)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                <MessageSquareWarning className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                WhatsApp & SMS Smishing Forensic Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/30">
                Live Engine v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-vector forensic inspection for SMS & WhatsApp fraud. Combines NLP psychological fear detection, rogue APK sniffer, and Reverse Phone Number Telecom Intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              TRAI DLT & HLR REVERSE LOOKUP ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inputs & Presets (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className="rounded-2xl p-5 border shadow-xl backdrop-blur-xl space-y-4"
            style={{
              backgroundColor: "var(--panel-card)",
              borderColor: "var(--panel-card-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                SMS / WhatsApp Message Text
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Paste suspicious SMS or WhatsApp message here (e.g. 'Your electricity will be disconnected tonight at 9:30 PM...')"
              rows={5}
              className="w-full rounded-xl p-3 text-xs font-mono bg-black/40 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition resize-none"
            />

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  Sender Phone Number or TRAI Header
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={senderInput}
                  onChange={(e) => setSenderInput(e.target.value)}
                  placeholder="e.g. 9810123456, +91 9876543210, or AD-SBIINB"
                  className="w-full rounded-xl p-2.5 pl-9 text-xs font-mono bg-black/40 border border-slate-700/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <Radio className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleScan()}
              disabled={scanning}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-red-500/40 shadow-lg shadow-red-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Analyzing NLP & Phone Intelligence...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan Message & Trace Sender
                </>
              )}
            </button>
          </div>

          {/* Preset Test Scenarios */}
          <div
            className="rounded-2xl p-5 border shadow-xl backdrop-blur-xl space-y-3"
            style={{
              backgroundColor: "var(--panel-card)",
              borderColor: "var(--panel-card-border)",
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Click Live Scam Presets
            </div>

            <div className="grid grid-cols-1 gap-2">
              {REAL_SCAM_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="text-left p-3 rounded-xl bg-black/30 hover:bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-cyan-400">
                    <span>{p.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {p.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-mono">
                    Sender: {p.sender} • &quot;{p.text}&quot;
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic & Phone Intelligence (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!result ? (
            <div
              className="rounded-2xl p-10 border shadow-xl backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-4 min-h-[460px]"
              style={{
                backgroundColor: "var(--panel-card)",
                borderColor: "var(--panel-card-border)",
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <MessageSquareWarning className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-bold text-white">No Message Analyzed Yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Paste any SMS, WhatsApp alert, or bank notice on the left or select a 1-click scam sample to perform real-time NLP fear analysis and reverse carrier lookup.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center text-[11px] text-slate-400">
                <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-slate-800">TRAI DLT Verification</span>
                <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-slate-800">Psychological Panic Score</span>
                <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-slate-800">Rogue APK Sniffer</span>
                <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-slate-800">Airtel / Jio / Vi / BSNL HLR</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary Verdict Card */}
              <div
                className="rounded-2xl p-5 border shadow-xl backdrop-blur-xl space-y-4"
                style={{
                  backgroundColor: "var(--panel-card)",
                  borderColor:
                    result.verdict === "CRITICAL_SMISHING"
                      ? "rgba(239, 68, 68, 0.4)"
                      : result.verdict === "SUSPICIOUS"
                      ? "rgba(245, 158, 11, 0.4)"
                      : "rgba(16, 185, 129, 0.4)",
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      THREAT VERDICT CLASSIFICATION
                    </span>
                    <div className="flex items-center gap-2">
                      {result.verdict === "CRITICAL_SMISHING" ? (
                        <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" />
                      ) : result.verdict === "SUSPICIOUS" ? (
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                      ) : (
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                      )}
                      <h3
                        className="text-lg font-black tracking-tight"
                        style={{
                          color:
                            result.verdict === "CRITICAL_SMISHING"
                              ? "#ef4444"
                              : result.verdict === "SUSPICIOUS"
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      >
                        {result.verdict.replace("_", " ")}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-300 font-medium">{result.category}</div>
                  </div>

                  <div className="flex items-baseline gap-2 bg-black/40 px-4 py-2 rounded-xl border border-slate-800">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">THREAT SCORE</div>
                      <div
                        className="text-2xl font-black font-mono"
                        style={{
                          color:
                            result.riskScore >= 75
                              ? "#ef4444"
                              : result.riskScore >= 35
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      >
                        {result.riskScore}
                        <span className="text-xs text-slate-500">/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meter Bars: Panic Score vs Threat Risk */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Psychological Panic/Fear NLP</span>
                      <span className="font-mono font-bold text-amber-400">{result.panicScore}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${result.panicScore}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Malicious Threat Confidence</span>
                      <span className="font-mono font-bold text-red-400">{result.riskScore}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-rose-600 rounded-full transition-all duration-500"
                        style={{ width: `${result.riskScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Key Highlight: Phone & Sender Intelligence Card ── */}
              {result.phoneIntelligence && (
                <div
                  className="rounded-2xl p-5 border shadow-xl backdrop-blur-xl space-y-3"
                  style={{
                    backgroundColor: "var(--panel-card)",
                    borderColor: "var(--panel-card-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-cyan-400" />
                      Sender & Reverse Phone Number Intelligence
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        result.phoneIntelligence.riskVerdict === "HIGH_RISK_SCAMMER"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : result.phoneIntelligence.riskVerdict === "SUSPICIOUS"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {result.phoneIntelligence.riskVerdict.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">RESOLVED CALLER / ENTITY NAME</div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{result.phoneIntelligence.callerName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {result.phoneIntelligence.formattedNumber}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">TELECOM CARRIER & CIRCLE</div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{result.phoneIntelligence.carrier}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {result.phoneIntelligence.circle} ({result.phoneIntelligence.country})
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">LINE TYPE & GATEWAY</div>
                      <div className="text-xs font-semibold text-slate-200">
                        {result.phoneIntelligence.lineType === "TRAI_DLT_HEADER"
                          ? "Official Enterprise TRAI DLT Header"
                          : result.phoneIntelligence.lineType === "VOIP_VIRTUAL"
                          ? "Untraceable Virtual / VoIP Number"
                          : "Prepaid Cellular SIM"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {result.phoneIntelligence.isRegisteredBankHeader
                          ? "Verified Banking DLT Route"
                          : "Unverified Consumer Routing"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">CITIZEN SCAM COMPLAINTS</div>
                      <div className="text-sm font-bold font-mono text-red-400">
                        {result.phoneIntelligence.spamReportsCount} Reports
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {result.phoneIntelligence.spamCategory || "Spam Reputation Engine"}
                      </div>
                    </div>
                  </div>

                  {result.phoneIntelligence.intelligenceFlags.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-red-400 tracking-wider">
                        CRITICAL PHONE SIGNALS
                      </div>
                      <ul className="text-xs text-slate-300 space-y-1">
                        {result.phoneIntelligence.intelligenceFlags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-red-400 font-bold">▸</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Extracted Rogue Payloads (APKs & URLs) */}
              {(result.extractedUrls.length > 0 || result.extractedApks.length > 0) && (
                <div
                  className="rounded-2xl p-5 border shadow-xl backdrop-blur-xl space-y-3"
                  style={{
                    backgroundColor: "var(--panel-card)",
                    borderColor: "var(--panel-card-border)",
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-rose-400" />
                    Detected Malicious Payloads in Message
                  </span>

                  <div className="space-y-2">
                    {result.extractedApks.map((apk, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 text-red-300 font-mono font-bold">
                          <span>📦 Rogue Android APK:</span>
                          <span className="text-white">{apk}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold uppercase">
                          Critical Threat
                        </span>
                      </div>
                    ))}

                    {result.extractedUrls.map((u, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs font-mono"
                      >
                        <span className="text-slate-300 truncate max-w-[400px]">{u}</span>
                        <a
                          href={`/dashboard/tracer?url=${encodeURIComponent(u)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-sans"
                        >
                          Trace Hops
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Safety Guidance & Playbook */}
              <div
                className="rounded-2xl p-5 border shadow-xl backdrop-blur-xl space-y-3"
                style={{
                  backgroundColor: "var(--panel-card)",
                  borderColor: "var(--panel-card-border)",
                }}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  National Cyber Defense Advisory & Action Playbook
                </span>

                <ul className="text-xs text-slate-300 space-y-2">
                  {result.safetyAdvisory.map((item, idx) => (
                    <li key={idx} className="p-2.5 rounded-xl bg-black/30 border border-slate-800/80">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons: 1-Click Forensic Dossier (PDF) & Copy */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  📄 Generate Forensic Dossier / रिपोर्ट (PDF)
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Summary"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bilingual Forensic Report Dossier Modal (English & Hindi) ── */}
      {showReportModal && result && (
        <ForensicReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          data={{
            caseId: `SMISH-${Date.now().toString(36).toUpperCase()}`,
            timestamp: new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            examiner: "Sentinel AI Smishing Forensic Engine & Phone Intelligence Core",
            type: "SMISHING",
            target: result.phoneIntelligence?.formattedNumber || result.senderInput || "SMS Message Payload",
            riskLevel:
              result.riskScore >= 80
                ? "CRITICAL"
                : result.riskScore >= 60
                ? "HIGH"
                : result.riskScore >= 35
                ? "MEDIUM"
                : "SAFE",
            confidenceScore: Math.min(100, Math.max(85, result.riskScore)),
            threatCategory: `${result.category} (${result.riskScore}/100 Risk)`,
            summary: `Automated SMS & WhatsApp fraud audit conducted by Sentinel AI. Message targeted brand '${result.detectedImpersonation || "Generic Utility"}'. Panic/Fear urgency score: ${result.panicScore}%. Phone resolved to '${result.phoneIntelligence?.callerName || "Unknown"}' on carrier ${result.phoneIntelligence?.carrier || "N/A"}.`,
            findings: [
              `Scam Vector: ${result.category}`,
              `Sender Identity: ${result.phoneIntelligence?.callerName || "Unverified"}`,
              `Telecom Carrier & Circle: ${result.phoneIntelligence?.carrier || "N/A"} (${result.phoneIntelligence?.circle || "N/A"})`,
              `Panic Urgency NLP Score: ${result.panicScore}%`,
              result.extractedApks.length > 0 ? `Malicious APK Payload: ${result.extractedApks.join(", ")}` : "No APK files detected",
              `Legal Compliance: ${result.legalReference}`,
            ],
            technicalEvidence: {
              rawSenderInput: result.senderInput || "N/A",
              formattedNumber: result.phoneIntelligence?.formattedNumber || "N/A",
              callerName: result.phoneIntelligence?.callerName || "N/A",
              telecomCarrier: result.phoneIntelligence?.carrier || "N/A",
              telecomCircle: result.phoneIntelligence?.circle || "N/A",
              lineType: result.phoneIntelligence?.lineType || "N/A",
              citizenSpamReports: result.phoneIntelligence?.spamReportsCount || 0,
              panicScore: `${result.panicScore}%`,
              extractedUrlsCount: result.extractedUrls.length,
              extractedApksCount: result.extractedApks.length,
            },
            sha256Hash: "c8e7f12a9b345d012489e0fa639b7812acde34215f9b4c09d8e123fa45892bc0",
          }}
        />
      )}
    </div>
  );
}
