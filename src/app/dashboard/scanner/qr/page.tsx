"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileWarning
} from "lucide-react";
import { motion } from "framer-motion";
import { QRScanResponse, QREvidence } from "@/modules/scanner/qr/types/qr-scanner";

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

  // Fetch recent scans on mount
  useEffect(() => {
    // eslint-disable-next-line
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
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setResult(null);

    const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMimeTypes.includes(selectedFile.type)) {
      setError("Unsupported format: Please upload a valid PNG, JPG, or JPEG image file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Large file: Maximum size allowed is 10MB.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
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
      "Uploading and processing image...",
      "Decoding QR code matrix...",
      "Extracting decoded metadata...",
      "Performing safety validations...",
      "Resolving DNS & auditing SSL/TLS certificate...",
      "Auditing HTTP response headers...",
      "Aggregating intelligence reports...",
    ];

    let currentStageIndex = 0;
    setLoadingStage(stages[0] || "");

    const interval = setInterval(() => {
      if (currentStageIndex < stages.length - 1) {
        currentStageIndex++;
        setLoadingStage(stages[currentStageIndex] || "");
      }
    }, 1500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/scans/qr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to analyze QR code.");
      }

      setResult(data);
      fetchHistory(); // refresh history
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected server error occurred.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };



  const getRiskBadgeColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "SAFE": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "LOW": return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "MEDIUM": return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      case "HIGH": return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      case "CRITICAL": return "bg-red-500/20 text-red-400 border border-red-500/30";
      default: return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "low": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
      case "high": return "bg-red-500/10 text-red-400 border border-red-500/20";
      default: return "bg-zinc-800 text-zinc-400";
    }
  };

  // Convert risk level + confidence into a user-facing safety score (100 = safe, 0 = dangerous)
  const getSecurityScore = (level: string, apiConfidence: number) => {
    if (level === "UNKNOWN") return 0;
    // Map risk levels to maximum safety score ceiling for that band
    // The confidence from the API represents how sure the system is about the classification
    let ceiling: number;
    switch (level?.toUpperCase()) {
      case "SAFE": ceiling = 100; break;
      case "LOW": ceiling = 75; break;
      case "MEDIUM": ceiling = 55; break;
      case "HIGH": ceiling = 30; break;
      case "CRITICAL": ceiling = 10; break;
      default: ceiling = 50;
    }
    // Scale by confidence: if confidence is low, score moves toward 50 (uncertain)
    const confidenceRatio = Math.min(Math.max(apiConfidence, 0), 100) / 100;
    return Math.round(ceiling * confidenceRatio + 50 * (1 - confidenceRatio));
  };

  const securityScore = result ? getSecurityScore(result.riskLevel, result.confidence) : 100;

  // Circle constants
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (securityScore / 100) * circumference;

  return (
    <div className="container max-w-5xl py-8 space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="QR Code Security Scanner" 
        description="Upload a QR code to extract its target destination and run an end-to-end security audit."
      >
        <Button 
          variant="outline" 
          onClick={fetchHistory}
          className="gap-2 border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Stats
        </Button>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Upload / Matrix Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="relative overflow-hidden border-zinc-800 bg-zinc-950/60 backdrop-blur-xl shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-white">
                <QrCode className="h-5 w-5 text-indigo-500" />
                Upload QR Code Image
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Drop your image here or select it from files. Supported: PNG, JPG, JPEG, WEBP. Max 10MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!previewUrl ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex flex-col items-center justify-center rounded-lg border border-dashed py-12 px-6 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-500/5 shadow-indigo-500/5 shadow-md" 
                      : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <div className="rounded-full bg-zinc-900 p-4 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                    <UploadCloud className="h-8 w-8 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-zinc-300">
                    Drag and drop file here, or click to upload
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    PNG, JPG, or JPEG up to 10MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative mx-auto max-w-xs overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={previewUrl} 
                      alt="Uploaded QR Code Preview" 
                      className="h-auto w-full object-contain rounded-md"
                    />
                    
                    {/* Scan Line effect during scan */}
                    {loading && (
                      <div className="absolute inset-x-0 h-1 bg-indigo-500 shadow-glow-accent animate-[bounce_2s_infinite]" style={{ top: '50%' }} />
                    )}
                  </div>

                  <div className="flex justify-center gap-4">
                    <Button 
                      variant="outline" 
                      onClick={clearFile}
                      disabled={loading}
                      className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
                    >
                      Remove
                    </Button>
                    <Button 
                      onClick={handleScan}
                      disabled={loading}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white w-44"
                    >
                      {loading ? "Analyzing Matrix..." : "Start Diagnostics"}
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-6 flex gap-3 items-start p-4 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg text-sm">
                  <FileWarning className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Error details</span>
                    {error}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading Indicator */}
          {loading && (
            <Card className="border-zinc-800 bg-zinc-950/40 backdrop-blur-xl">
              <CardContent className="py-8 flex flex-col items-center justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 animate-spin">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-white">Security Inspection in Progress</h3>
                  <p className="text-xs text-zinc-400 mt-1">{loadingStage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Details */}
          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
              
              {/* Security Warnings / Badges */}
              {result.securityChecks?.warnings && result.securityChecks.warnings.length > 0 && (
                <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-400 text-base">
                      <AlertTriangle className="h-5 w-5" />
                      Pre-Scan Flagged Threats ({result.securityChecks.warnings.length})
                    </CardTitle>
                    <CardDescription className="text-zinc-400 text-xs">
                      The extracted destination URL contains structural abnormalities that are highly common in malicious scams.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.securityChecks.warnings.map((warn, i) => (
                      <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                            {warn.title}
                          </span>
                          <p className="text-xs text-zinc-400 leading-relaxed">{warn.description}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getSeverityBadgeColor(warn.severity)}`}>
                          {warn.severity}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Decoded QR & URL Header info */}
              <Card className="border-zinc-800 bg-zinc-950/60 overflow-hidden">
                <div className="p-6 border-b border-zinc-900 bg-zinc-900/10">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Decoded QR Code</h4>
                      <p className="font-mono text-sm text-zinc-300 break-all bg-zinc-950/80 p-2.5 rounded border border-zinc-900">{result.decodedText}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Target Destination</h4>
                      <p className="font-mono text-sm text-indigo-400 break-all bg-zinc-950/80 p-2.5 rounded border border-zinc-900">{result.extractedUrl}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* URL Scanner Results Detail Panels */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* AI Reasoning */}
                <Card className="border-zinc-800 bg-zinc-950/60">
                  <CardHeader className="pb-3 border-b border-zinc-900">
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-400" />
                      Executive Verdict
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <p className="text-sm text-zinc-200 leading-relaxed font-sans">{result.reasoning}</p>
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Key Indicators</h4>
                      {result.indicators && result.indicators.length > 0 ? (
                        <ul className="space-y-2">
                          {result.indicators.map((ind, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">•</span>
                              <span>{ind}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">No malicious signatures detected.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* DNS Records */}
                <Card className="border-zinc-800 bg-zinc-950/60">
                  <CardHeader className="pb-3 border-b border-zinc-900">
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-400" />
                      Resolved DNS Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 font-mono text-xs">
                    {result.evidence?.dns ? (
                      <div className="space-y-3">
                        {/* A records */}
                        <div>
                          <span className="text-zinc-500 block mb-1">A Records</span>
                          {result.evidence.dns.a && result.evidence.dns.a.length > 0 ? (
                            result.evidence.dns.a.map((ip: string, i: number) => (
                              <div key={i} className="text-zinc-300 bg-zinc-900/50 p-1.5 rounded border border-zinc-900">{ip}</div>
                            ))
                          ) : (
                            <span className="text-zinc-600 italic">None</span>
                          )}
                        </div>

                        {/* AAAA records */}
                        <div>
                          <span className="text-zinc-500 block mb-1">AAAA Records</span>
                          {result.evidence.dns.aaaa && result.evidence.dns.aaaa.length > 0 ? (
                            result.evidence.dns.aaaa.map((ip: string, i: number) => (
                              <div key={i} className="text-zinc-300 bg-zinc-900/50 p-1.5 rounded border border-zinc-900">{ip}</div>
                            ))
                          ) : (
                            <span className="text-zinc-600 italic">None</span>
                          )}
                        </div>

                        {/* MX records */}
                        <div>
                          <span className="text-zinc-500 block mb-1">MX Records</span>
                          {result.evidence.dns.mx && result.evidence.dns.mx.length > 0 ? (
                            result.evidence.dns.mx.map((mx, i: number) => (
                              <div key={i} className="text-zinc-300 bg-zinc-900/50 p-1.5 rounded border border-zinc-900 flex justify-between">
                                <span>{mx.exchange}</span>
                                <span className="text-zinc-500">Pref: {mx.priority}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-zinc-600 italic">None</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-500 italic">No DNS records returned for target host.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* SSL Certificate & Security Headers */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* SSL Certificate */}
                <Card className="border-zinc-800 bg-zinc-950/60">
                  <CardHeader className="pb-3 border-b border-zinc-900">
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-indigo-400" />
                      SSL / TLS Certificate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    {result.evidence?.tls ? (
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-400">Subject</span>
                          <span className="text-zinc-200 font-medium font-mono text-[11px]">{result.evidence.tls.subject?.CN || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-400">Issuer</span>
                          <span className="text-zinc-200 font-medium font-mono text-[11px]">{result.evidence.tls.issuer?.O || result.evidence.tls.issuer?.CN || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-400">Valid From</span>
                          <span className="text-zinc-200 font-mono">{result.evidence.tls.valid_from || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-400">Valid To</span>
                          <span className="text-zinc-200 font-mono">{result.evidence.tls.valid_to || "Unknown"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>No secure SSL/TLS tunnel was established. Domain may use HTTP.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* HTTP Security Headers */}
                <Card className="border-zinc-800 bg-zinc-950/60">
                  <CardHeader className="pb-3 border-b border-zinc-900">
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-400" />
                      HTTP Security Headers Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2 text-xs">
                    {result.evidence?.headers ? (
                      (() => {
                        const headers = result.evidence.headers as Record<string, string>;
                        const checkHeader = (name: string) => {
                          const val = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
                          return val ? headers[val] : null;
                        };

                        const audits = [
                          { name: "Strict-Transport-Security", desc: "HSTS Encrypted Gating" },
                          { name: "Content-Security-Policy", desc: "Script/Resource Sandboxing" },
                          { name: "X-Frame-Options", desc: "Clickjacking Prevention" },
                          { name: "X-Content-Type-Options", desc: "MIME-sniffing Block" },
                        ];

                        return (
                          <div className="space-y-2.5">
                            {audits.map((item, i) => {
                              const foundVal = checkHeader(item.name);
                              return (
                                <div key={i} className="flex items-center justify-between p-2 rounded bg-zinc-900/40 border border-zinc-900/60">
                                  <div>
                                    <span className="font-semibold text-zinc-300 block">{item.name}</span>
                                    <span className="text-zinc-500 text-[10px]">{item.desc}</span>
                                  </div>
                                  <div>
                                    {foundVal ? (
                                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-zinc-500 italic">No headers resolved. Host is unreachable or request timed out.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Technical Report */}
              <Card className="border-zinc-800 bg-zinc-950/60 overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    Deep Technical Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 prose prose-invert max-w-none text-sm text-zinc-300 leading-relaxed font-sans space-y-4">
                  {result.report.split('\n\n').map((para, i) => {
                    if (para.startsWith('###')) {
                      return <h3 key={i} className="text-sm font-bold text-indigo-400 mt-4 uppercase tracking-wider">{para.replace('###', '').trim()}</h3>;
                    }
                    if (para.startsWith('-')) {
                      return (
                        <ul key={i} className="list-disc pl-5 space-y-1 text-zinc-400 text-xs">
                          {para.split('\n').map((li, j) => (
                            <li key={j}>{li.replace('-', '').trim()}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={i} className="text-xs text-zinc-400">{para}</p>;
                  })}
                </CardContent>
              </Card>

            </div>
          )}
        </div>

        {/* Right Column: Diagnostic summary & score gauge */}
        <div className="space-y-8">
          {/* Security Score Card */}
          <Card className="border-zinc-800 bg-zinc-950/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Platform Security Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="relative flex items-center justify-center">
                {/* SVG Gauge */}
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke="#27272a"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke={
                      result
                        ? result.riskLevel === "SAFE" ? "#34d399" : result.riskLevel === "LOW" ? "#3b82f6" : result.riskLevel === "MEDIUM" ? "#fbbf24" : result.riskLevel === "HIGH" ? "#f97316" : "#f87171"
                        : "#6366f1"
                    }
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold text-white">
                    {result ? securityScore : "—"}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                    Score
                  </span>
                </div>
              </div>

              <div className="space-y-2 w-full">
                <span className="text-xs text-zinc-400 block font-medium">Verified Threat Classification</span>
                {result ? (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getRiskBadgeColor(result.riskLevel)}`}>
                    {result.riskLevel}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-zinc-500 bg-zinc-900 border border-zinc-800 uppercase tracking-wide">
                    Diagnostics Idle
                  </span>
                )}
              </div>

              {result && (
                <div className="w-full pt-4 border-t border-zinc-900 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Model Provider:</span>
                    <span className="text-zinc-300 font-medium">Gemini 2.5 Flash</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Scan Class:</span>
                    <span className="text-zinc-300 font-medium font-mono text-[10px]">{result.threatType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Target Host:</span>
                    <span className="text-zinc-300 font-medium font-mono text-[10px] truncate max-w-[150px]">{result.normalized}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Scans Panel */}
          <Card className="border-zinc-800 bg-zinc-950/60 backdrop-blur-xl">
            <CardHeader className="pb-3 border-b border-zinc-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-400" />
                  Recent QR Audits
                </CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 mt-0.5">Your last 5 scans.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((scan) => (
                    <div 
                      key={scan.id} 
                      onClick={() => {
                        // Quick populate result for inspection
                        setResult({
                          scanId: scan.id,
                          decodedText: scan.payload || "",
                          extractedUrl: scan.payload || "",
                          securityChecks: scan.evidenceMetadata?.securityChecks || {
                            isShortener: false,
                            isPunycode: false,
                            isUnicodeSpoof: false,
                            isHttp: false,
                            isSuspiciousTld: false,
                            warnings: []
                          },
                          normalized: scan.payload || "",
                          riskLevel: (scan.riskLevel as "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN") || "UNKNOWN",
                          confidence: scan.result?.confidenceScore || 0,
                          threatType: scan.result?.threatCategory || "SAFE",
                          reasoning: scan.result?.analysisMetadata?.executiveSummary || "No reasoning logged.",
                          indicators: scan.result?.analysisMetadata?.analystNotes || [],
                          report: scan.result?.analysisMetadata?.technicalReasoning || "No detailed report logged.",
                          evidence: scan.result?.analysisMetadata?.evidence || null
                        });
                      }}
                      className="group cursor-pointer p-3 rounded-lg bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800/80 hover:bg-zinc-900/50 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[160px] group-hover:text-white transition-colors">
                          {scan.payload}
                        </span>
                        <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${getRiskBadgeColor(scan.riskLevel)}`}>
                          {scan.riskLevel}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-zinc-500">
                        <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                        <span className="group-hover:text-indigo-400 transition-colors">Inspect →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-zinc-600 italic">
                  No previous QR scans found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
