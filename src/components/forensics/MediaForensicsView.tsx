"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Sparkles,
  Camera,
  Cpu,
  Layers,
  Copy,
  Check,
  RotateCcw,
  Fingerprint,
  Info,
} from "lucide-react";
import { analyzeMediaProvenance, type ForensicResult } from "@/lib/forensics/mediaParser";
import { notifyCyBroScanComplete } from "@/lib/cybro/events";

export function MediaForensicsView() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ForensicResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setResult(null);

    // Validate image or video type
    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    const isExtensionValid = selectedFile.name.match(/\.(png|jpe?g|webp|mp4|webm|mov)$/i);

    if (!validTypes.includes(selectedFile.type) && !isExtensionValid) {
      setError("Unsupported format. Please upload an image (PNG, JPEG, WebP) or video (MP4, WebM, MOV).");
      return;
    }

    // 50MB limit for high-res images and video clips
    const MAX_SIZE = 50 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError(`File size is ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB. The maximum supported media size is 50 MB.`);
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

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
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runDissection = async () => {
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The maximum supported media size is 50 MB.`);
      return;
    }

    setScanning(true);
    setError(null);
    setResult(null);

    try {
      // Dissect directly in browser using universal binary parser.
      // Operates on ArrayBuffer in-memory up to 50MB with instant ~20ms execution,
      // completely bypassing Vercel's 4.5MB serverless payload limit.
      const arrayBuffer = await file.arrayBuffer();
      const data = await analyzeMediaProvenance(new Uint8Array(arrayBuffer), file.name);
      setResult(data);

      // Notify CyBro for real-time optimal safe action advisory
      const isAi = data.verdict === "CONFIRMED_AI" || data.verdict === "LIKELY_AI";
      notifyCyBroScanComplete({
        tool: "forensics",
        target: file.name,
        isThreat: isAi,
        threatLevel: data.verdict === "CONFIRMED_AI" ? "malicious" : data.verdict === "LIKELY_AI" ? "suspicious" : "clean",
        summary: `Verdict: ${data.verdict}. Generator: ${data.generatorTool || "None"}. Confidence: ${data.confidenceScore}%.`,
        findings: [
          `C2PA Present: ${data.c2pa.detected ? "YES" : "NO"}`,
          `Generator: ${data.generatorTool || "None"}`,
          `SynthID Watermark: ${data.synthId.detectedMarker ? "DETECTED" : "NONE"}`,
          `Format: ${data.format} (${(data.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
        ],
        rawResult: data,
      });

      // Persist scan to database for audit history
      fetch("/api/scans/record", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FILE",
          payload: file.name,
          riskLevel:
            data.verdict === "CONFIRMED_AI"
              ? "CRITICAL"
              : data.verdict === "LIKELY_AI"
              ? "HIGH"
              : data.verdict === "SCRUBBED_METADATA"
              ? "MEDIUM"
              : "SAFE",
          threatCategory: `AI Media: ${data.verdict} (${data.confidenceScore}% conf)`,
          confidenceScore: data.confidenceScore,
          aiProvider: "SENTINEL_MEDIA_FORENSICS",
          aiModel: "Provenance-C2PA-SynthID",
          analysisMetadata: {
            verdict: data.verdict,
            generatorTool: data.generatorTool,
            c2pa: data.c2pa?.detected,
            synthId: data.synthId?.detectedMarker,
          },
        }),
      })
        .then((r) => {
          if (r.ok && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
          }
        })
        .catch((err) => console.error("Failed to log media scan to history:", err));
    } catch (err) {
      console.error("Forensic dissection error:", err);
      // Fallback to server route if client parsing encounters an unexpected environment issue
      try {
        if (file.size <= 4.5 * 1024 * 1024) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/media-forensics", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const fallbackData = await res.json();
            setResult(fallbackData);
            return;
          }
        }
      } catch {
        // ignore fallback errors
      }
      setError(err instanceof Error ? err.message : "Error analyzing media file");
    } finally {
      setScanning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getVerdictDetails = (verdict: ForensicResult["verdict"]) => {
    switch (verdict) {
      case "CONFIRMED_AI":
        return {
          title: "AI-GENERATED MEDIA CONFIRMED",
          color: "var(--crit)",
          bg: "rgba(220,38,38,0.06)",
          border: "rgba(220,38,38,0.35)",
          icon: Sparkles,
        };
      case "LIKELY_AI":
        return {
          title: "LIKELY AI-GENERATED",
          color: "var(--warn)",
          bg: "rgba(180,83,9,0.06)",
          border: "rgba(180,83,9,0.35)",
          icon: Cpu,
        };
      case "AUTHENTIC_MEDIA":
        return {
          title: "AUTHENTIC CAMERA MEDIA VERIFIED",
          color: "var(--ok)",
          bg: "rgba(21,128,61,0.06)",
          border: "rgba(21,128,61,0.35)",
          icon: Camera,
        };
      default:
        return {
          title: "NO AI SIGNATURES DETECTED (METADATA UNATTESTED)",
          color: "var(--accent)",
          bg: "rgba(59,130,246,0.05)",
          border: "rgba(59,130,246,0.35)",
          icon: ShieldCheck,
        };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px" }}>
      {/* ── Intro Panel ── */}
      <div
        className="void-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Fingerprint style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600, fontSize: "14px" }}>
              AI Media & Deepfake Video/Image Forensics Dissector
            </span>
          </div>
          <span
            className="chip"
            style={{
              color: "var(--accent)",
              borderColor: "rgba(59,130,246,0.35)",
              backgroundColor: "rgba(59,130,246,0.06)",
              fontWeight: 500,
            }}
          >
            C2PA • SynthID • Sora / Runway • Stable Diffusion • DALL-E
          </span>
        </div>

        <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.6, fontWeight: 400 }}>
          Detect whether an image or video was created by Generative AI (Runway, Sora, Pika, Stable Diffusion, DALL-E) or captured by a physical camera sensor. Inspects cryptographically signed <strong>C2PA JUMBF manifests</strong>, MP4 ISO base media atoms, IPTC <code>trainedAlgorithmicMedia</code> assertions, Google <strong>SynthID</strong> watermarks, and recovers hidden generation prompts from binary chunks.
        </p>

        {/* ── Upload Area ── */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? "var(--accent)" : "var(--hair-15)"}`,
              padding: "3rem 1.5rem",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: dragActive ? "rgba(59,130,246,0.04)" : "var(--ground-secondary)",
              transition: "all 0.15s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: "none" }}
            />
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                backgroundColor: "var(--panel-card)",
                border: "1px solid var(--hair-10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <UploadCloud style={{ width: "24px", height: "24px" }} />
            </div>
            <div>
              <p style={{ margin: "0 0 0.25rem 0", fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
                Drop image or video here or click to browse
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                Supports Images (PNG, JPEG, WebP) & Videos (MP4, WebM, MOV) • Max 50MB
              </p>
            </div>
          </div>
        ) : (
          /* File Preview & Actions */
          <div
            style={{
              padding: "1.25rem",
              backgroundColor: "var(--ground-secondary)",
              border: "1px solid var(--hair-10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
              {previewUrl && (
                file.type.startsWith("video/") || file.name.match(/\.(mp4|webm|mov)$/i) ? (
                  <div
                    style={{
                      width: "80px",
                      height: "56px",
                      overflow: "hidden",
                      border: "1px solid var(--hair-10)",
                      backgroundColor: "#000",
                      flexShrink: 0,
                    }}
                  >
                    <video
                      src={previewUrl}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      width: "56px",
                      height: "56px",
                      overflow: "hidden",
                      border: "1px solid var(--hair-10)",
                      backgroundColor: "var(--panel-card)",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={previewUrl}
                      alt="Uploaded media preview"
                      fill
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  </div>
                )
              )}
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.name}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", alignItems: "center" }}>
                  <span className="chip" style={{ fontSize: "10px", padding: "1px 6px" }}>
                    {formatBytes(file.size)}
                  </span>
                  <span className="chip" style={{ fontSize: "10px", padding: "1px 6px" }}>
                    {file.type.startsWith("video/") ? "VIDEO" : file.type.replace("image/", "").toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleReset}
                disabled={scanning}
                className="btn-ghost"
                style={{ height: "40px", padding: "0 1rem", fontSize: "12px" }}
              >
                <RotateCcw style={{ width: "13px", height: "13px", marginRight: "4px" }} />
                Change
              </button>
              <button
                type="button"
                onClick={runDissection}
                disabled={scanning}
                className="btn-accent"
                style={{ height: "40px", padding: "0 1.25rem", fontSize: "13px", fontWeight: 600 }}
              >
                {scanning ? "Dissecting Chunks..." : "Dissect Media"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "var(--panel-card)",
              border: "1px solid var(--crit)",
              borderLeft: "4px solid var(--crit)",
              color: "var(--crit)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ── Results Container ── */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* ── 1. Master Verdict Card ── */}
          {(() => {
            const v = getVerdictDetails(result.verdict);
            const VerdictIcon = v.icon;
            return (
              <div
                style={{
                  padding: "1.5rem",
                  backgroundColor: "var(--panel-card)",
                  border: `1px solid ${v.border}`,
                  borderLeft: `5px solid ${v.color}`,
                  boxShadow: "var(--panel-shadow)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <VerdictIcon style={{ width: "20px", height: "20px", color: v.color, flexShrink: 0 }} />
                    <span className="label" style={{ color: v.color, fontWeight: 700, fontSize: "13px" }}>
                      {v.title}
                    </span>
                  </div>
                  <span
                    className="chip"
                    style={{
                      color: v.color,
                      borderColor: v.border,
                      backgroundColor: v.bg,
                      fontWeight: 700,
                    }}
                  >
                    {result.verdict === "SCRUBBED_METADATA"
                      ? "AI ARTIFACTS: ZERO DETECTED"
                      : result.verdict === "CONFIRMED_AI"
                      ? `AI CONFIDENCE: ${result.confidenceScore}%`
                      : `AUTHENTICITY: ${result.confidenceScore}%`}
                  </span>
                </div>

                <p style={{ fontSize: "14px", color: "var(--ink)", margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                  {result.summaryExplanation}
                </p>

                {result.generatorTool && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <span className="label" style={{ color: "var(--muted)", fontSize: "11px" }}>Identified Tool:</span>
                    <span
                      className="chip"
                      style={{
                        color: "var(--ink)",
                        fontWeight: 600,
                        backgroundColor: "var(--ground-secondary)",
                      }}
                    >
                      {result.generatorTool}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── 2. Two-Column Trust Frameworks (C2PA & SynthID) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
            {/* C2PA Box */}
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheck style={{ width: "16px", height: "16px", color: result.c2pa.detected ? "var(--ok)" : "var(--muted)" }} />
                  <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    Content Credentials (C2PA)
                  </span>
                </div>
                <span
                  className="chip"
                  style={{
                    color: result.c2pa.detected ? "var(--ok)" : "var(--muted)",
                    borderColor: result.c2pa.detected ? "rgba(21,128,61,0.3)" : "var(--hair-10)",
                    backgroundColor: result.c2pa.detected ? "rgba(21,128,61,0.06)" : "transparent",
                    fontSize: "11px",
                  }}
                >
                  {result.c2pa.detected ? "ASSERTION FOUND" : "NO MANIFEST"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>JUMBF Container:</span>
                  <span style={{ color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                    {result.c2pa.manifestFound ? "APP11 Box Present" : "Not Detected"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Signing Authority:</span>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                    {result.c2pa.signingAuthority || "None / Unsigned"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Digital Source Type:</span>
                  <span
                    style={{
                      color: result.c2pa.digitalSourceType ? "var(--crit)" : "var(--muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                    }}
                  >
                    {result.c2pa.digitalSourceType ? "trainedAlgorithmicMedia" : "None"}
                  </span>
                </div>
              </div>
            </div>

            {/* SynthID & Watermark Box */}
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Layers style={{ width: "16px", height: "16px", color: result.synthId.detectedMarker ? "var(--accent)" : "var(--muted)" }} />
                  <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    Google SynthID & Watermarks
                  </span>
                </div>
                <span
                  className="chip"
                  style={{
                    color: result.synthId.detectedMarker ? "var(--accent)" : "var(--muted)",
                    borderColor: result.synthId.detectedMarker ? "rgba(59,130,246,0.3)" : "var(--hair-10)",
                    backgroundColor: result.synthId.detectedMarker ? "rgba(59,130,246,0.06)" : "transparent",
                    fontSize: "11px",
                  }}
                >
                  {result.synthId.detectedMarker ? "SYNTHID DETECTED" : "NO WATERMARK"}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.5 }}>
                {result.synthId.explanation}
              </p>

              {result.synthId.detectedMarker && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--muted)" }}>Watermark Classification:</span>
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                    {result.synthId.watermarkType}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Recovered Generation Prompt & Parameters (Showstopper) ── */}
          {result.prompt && (
            <div
              className="void-panel"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Cpu style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
                  <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    Recovered Generative AI Prompt & Model Parameters
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(result.prompt!)}
                  className="btn-ghost"
                  style={{ padding: "0.25rem 0.5rem", fontSize: "11px" }}
                >
                  {copiedPrompt ? (
                    <>
                      <Check style={{ width: "12px", height: "12px", marginRight: "4px", color: "var(--ok)" }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy style={{ width: "12px", height: "12px", marginRight: "4px" }} />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>

              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "var(--ground-secondary)",
                  border: "1px solid var(--hair-10)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  color: "var(--ink)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "180px",
                  overflowY: "auto",
                }}
              >
                {result.prompt}
              </div>

              {result.negativePrompt && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span className="label" style={{ color: "var(--crit)", fontSize: "11px" }}>Negative Prompt:</span>
                  <div
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "var(--ground-secondary)",
                      border: "1px solid var(--hair-10)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      color: "var(--muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {result.negativePrompt}
                  </div>
                </div>
              )}

              {result.generationParameters && Object.keys(result.generationParameters).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
                  {Object.entries(result.generationParameters).map(([k, v]) => (
                    <span
                      key={k}
                      className="chip"
                      style={{
                        fontSize: "11px",
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "var(--ink)",
                      }}
                    >
                      <strong style={{ color: "var(--muted)", marginRight: "4px" }}>{k}:</strong> {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 4. Physical Camera Hardware Audit (if authentic) ── */}
          {result.cameraHardware && (result.cameraHardware.make || result.cameraHardware.model) && (
            <div
              className="void-panel"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Camera style={{ width: "16px", height: "16px", color: "var(--ok)" }} />
                <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  Camera Sensor Hardware Signatures
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                {result.cameraHardware.make && (
                  <div style={{ fontSize: "12px" }}>
                    <span style={{ color: "var(--muted)" }}>Manufacturer:</span>
                    <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: "2px" }}>{result.cameraHardware.make}</div>
                  </div>
                )}
                {result.cameraHardware.model && (
                  <div style={{ fontSize: "12px" }}>
                    <span style={{ color: "var(--muted)" }}>Camera Model:</span>
                    <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: "2px" }}>{result.cameraHardware.model}</div>
                  </div>
                )}
                {result.cameraHardware.lensModel && (
                  <div style={{ fontSize: "12px" }}>
                    <span style={{ color: "var(--muted)" }}>Lens Model:</span>
                    <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: "2px" }}>{result.cameraHardware.lensModel}</div>
                  </div>
                )}
                {result.cameraHardware.software && (
                  <div style={{ fontSize: "12px" }}>
                    <span style={{ color: "var(--muted)" }}>Firmware / Software:</span>
                    <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: "2px" }}>{result.cameraHardware.software}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 5. Technical Forensic Audit Trail ── */}
          <div
            className="void-panel"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
              Forensic Evidence Breakdown
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {result.technicalEvidence.map((ev, idx) => {
                let badgeColor = "var(--muted)";
                let badgeBg = "transparent";
                if (ev.status === "CRITICAL_AI") {
                  badgeColor = "var(--crit)";
                  badgeBg = "rgba(220,38,38,0.06)";
                } else if (ev.status === "VERIFIED_AUTHENTIC") {
                  badgeColor = "var(--ok)";
                  badgeBg = "rgba(21,128,61,0.06)";
                } else if (ev.status === "WARNING") {
                  badgeColor = "var(--warn)";
                  badgeBg = "rgba(180,83,9,0.06)";
                }

                return (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: "var(--ground-secondary)",
                      border: "1px solid var(--hair-10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        className="chip"
                        style={{
                          fontSize: "10px",
                          fontFamily: "'JetBrains Mono', monospace",
                          color: badgeColor,
                          backgroundColor: badgeBg,
                          borderColor: "var(--hair-10)",
                        }}
                      >
                        {ev.category}
                      </span>
                      <span style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>
                        {ev.detail}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: badgeColor,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {ev.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
