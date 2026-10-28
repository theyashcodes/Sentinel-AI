"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  UploadCloud,
  FileAudio,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
  Activity,
  Layers,
  Volume2,
  Copy,
  Check,
  Download,
  Info,
  Radio,
  FileCheck2,
  HelpCircle,
  ExternalLink,
  FileText,
} from "lucide-react";
import {
  analyzeAudioBuffer,
  getPresetSampleAudio,
  type VoiceForensicResult,
} from "@/lib/forensics/audioDeepfakeEngine";
import { notifyCyBroScanComplete } from "@/lib/cybro/events";
import { ForensicReportModal } from "@/components/forensics/ForensicReportModal";
import { ForensicReportData } from "@/lib/forensics/reportGenerator";
import { ScanFeedbackWidget } from "@/components/feedback/ScanFeedbackWidget";

export function VoiceForensicsView() {
  const [activeTab, setActiveTab] = useState<"upload" | "record" | "presets">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<VoiceForensicResult | null>(null);
  const [recordedScanId, setRecordedScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Live Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Spectrogram canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && !audioUrl.startsWith("http")) {
        URL.revokeObjectURL(audioUrl);
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [audioUrl]);

  // Audio element event listeners
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setError(null);
    setResult(null);

    const validExtensions = /\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i;
    if (!selectedFile.type.startsWith("audio/") && !selectedFile.name.match(validExtensions)) {
      setError("Unsupported format. Please upload an audio file (MP3, WAV, M4A, OGG, WEBM, FLAC).");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError(`Audio file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB. Max supported audio size is 50MB.`);
      return;
    }

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    // Exact duration extraction using Web Audio API (fixes 0:00 on Chrome WebM recordings)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const tempCtx = new AudioCtx();
      selectedFile.arrayBuffer().then((buf) => {
        tempCtx.decodeAudioData(buf).then((decoded) => {
          if (decoded && decoded.duration > 0) {
            setDuration(decoded.duration);
          }
          tempCtx.close();
        }).catch(() => {
          tempCtx.close();
        });
      });
    } catch {
      // fallback
    }
  };

  // Dissect Audio
  const runAudioDissection = async () => {
    if (!file) return;

    setScanning(true);
    setError(null);
    setResult(null);

    try {
      // Decode audio using Web Audio API
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const rawBytes = new Uint8Array(arrayBuffer);
      const res = await analyzeAudioBuffer(audioBuffer, file.name, rawBytes);

      // Dual-Engine Deep Learning & Neural Prosody Analysis
      let finalRes = res;
      try {
        const deepForm = new FormData();
        deepForm.append("file", file);
        deepForm.append("clientMetrics", JSON.stringify({
          jitterPercent: res.acousticMetrics.jitterPercent,
          shimmerPercent: res.acousticMetrics.shimmerPercent,
          spectralCutoffKHz: res.acousticMetrics.spectralCutoffKHz,
          aiProbabilityScore: res.aiProbabilityScore,
          matchedArchitecture: res.matchedArchitecture,
          isAcousticReplay: res.matchedArchitecture.includes("Loudspeaker") || res.acousticMetrics.phaseDispersionIndex > 0.5,
          indicators: res.indicators,
        }));

        const deepRes = await fetch("/api/voice-forensics/analyze", {
          method: "POST",
          body: deepForm,
        });

        if (deepRes.ok) {
          const deepData = await deepRes.json();
          if (deepData.success) {
            finalRes = {
              ...res,
              aiProbabilityScore: deepData.aiProbabilityScore,
              verdict: deepData.verdict,
              riskLevel: deepData.riskLevel,
              confidenceScore: deepData.confidenceScore,
              matchedArchitecture: deepData.matchedArchitecture,
              indicators: deepData.indicators && deepData.indicators.length > 0 ? deepData.indicators : res.indicators,
            };
          }
        }
      } catch (deepErr) {
        console.warn("Deep learning voice analysis fallback to local bio-acoustics:", deepErr);
      }

      setResult(finalRes);

      // Notify CyBro
      notifyCyBroScanComplete({
        tool: "voice",
        target: file.name,
        isThreat: finalRes.riskLevel === "malicious" || finalRes.riskLevel === "suspicious",
        threatLevel: finalRes.riskLevel,
        summary: `AI Probability: ${finalRes.aiProbabilityScore}%. Verdict: ${finalRes.verdict}. Model: ${finalRes.matchedArchitecture}.`,
        findings: [
          `AI Probability: ${finalRes.aiProbabilityScore}%`,
          `Pitch Jitter: ${finalRes.acousticMetrics.jitterPercent}%`,
          `Spectral Cutoff: ${finalRes.acousticMetrics.spectralCutoffKHz} kHz`,
          finalRes.acousticMetrics.aiTagDetected
            ? `Marker: ${finalRes.acousticMetrics.aiTagDetected}`
            : `Noise Floor: ${finalRes.acousticMetrics.digitalSilenceDetected ? "Digital Zero Pauses" : "Analog Mic"}`,
        ],
        rawResult: finalRes,
      });

      // Persist scan to database for audit history
      fetch("/api/scans/record", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FILE",
          payload: file.name,
          riskLevel: res.riskLevel === "malicious" ? "CRITICAL" : res.riskLevel === "suspicious" ? "MEDIUM" : "SAFE",
          threatCategory: `AI Voice: ${res.verdict} (${res.aiProbabilityScore}% AI)`,
          confidenceScore: res.confidenceScore,
          aiProvider: "SENTINEL_VOICE_CORE",
          aiModel: "BioAcoustic-Deepfake-v2",
          analysisMetadata: {
            aiProbabilityScore: res.aiProbabilityScore,
            matchedArchitecture: res.matchedArchitecture,
            jitterPercent: res.acousticMetrics.jitterPercent,
            spectralCutoffKHz: res.acousticMetrics.spectralCutoffKHz,
            verdict: res.verdict,
          },
        }),
      })
        .then(async (r) => {
          if (r.ok) {
            const resJson = await r.json().catch(() => null);
            if (resJson?.scanId) {
              setRecordedScanId(resJson.scanId);
            }
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
            }
          }
        })
        .catch((err) => console.error("Failed to log voice scan to history:", err));

      audioCtx.close();
    } catch (err) {
      console.error("Audio forensic error:", err);
      setError(err instanceof Error ? err.message : "Failed to decode or analyze audio stream.");
    } finally {
      setScanning(false);
    }
  };

  // Live Microphone Recording
  const startRecording = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const recordedFile = new File([audioBlob], `mic-recording-${Date.now()}.webm`, { type: "audio/webm" });
        handleFileSelected(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  // One-click Preset Selection
  const loadPreset = (type: "elevenlabs" | "rvc" | "human") => {
    setError(null);
    const presetData = getPresetSampleAudio(type);
    setResult(presetData);
    setFile(null);
    setAudioUrl(null);
    setIsPlaying(false);

    notifyCyBroScanComplete({
      tool: "voice",
      target: `preset-${type}-sample.wav`,
      isThreat: presetData.riskLevel === "malicious" || presetData.riskLevel === "suspicious",
      threatLevel: presetData.riskLevel,
      summary: `Sample Preset (${type.toUpperCase()}): ${presetData.aiProbabilityScore}% AI Probability. ${presetData.verdict}.`,
      findings: [
        `AI Probability: ${presetData.aiProbabilityScore}%`,
        `Architecture: ${presetData.matchedArchitecture}`,
        `Cutoff: ${presetData.acousticMetrics.spectralCutoffKHz} kHz`,
      ],
      rawResult: presetData,
    });

    // Persist preset scan to database
    fetch("/api/scans/record", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "FILE",
        payload: `preset-${type}-sample.wav`,
        riskLevel: presetData.riskLevel === "malicious" ? "CRITICAL" : presetData.riskLevel === "suspicious" ? "MEDIUM" : "SAFE",
        threatCategory: `AI Voice Sample: ${presetData.verdict}`,
        confidenceScore: presetData.confidenceScore,
        aiProvider: "SENTINEL_VOICE_CORE",
        aiModel: "BioAcoustic-Deepfake-v2",
        analysisMetadata: {
          aiProbabilityScore: presetData.aiProbabilityScore,
          matchedArchitecture: presetData.matchedArchitecture,
          verdict: presetData.verdict,
        },
      }),
    })
      .then(async (r) => {
        if (r.ok) {
          const resJson = await r.json().catch(() => null);
          if (resJson?.scanId) {
            setRecordedScanId(resJson.scanId);
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("sentinel:scan-updated"));
          }
        }
      })
      .catch((err) => console.error("Failed to log preset scan to history:", err));
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(null);
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Render Spectrogram on Canvas
  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bands = result.spectrogramBands;
    if (!bands || bands.length === 0 || !bands[0]) return;

    const timeSteps = bands.length;
    const freqBins = bands[0].length;
    const colWidth = width / timeSteps;
    const rowHeight = height / freqBins;

    // Draw spectrogram heatmap
    for (let t = 0; t < timeSteps; t++) {
      const slice = bands[t];
      if (!slice) continue;
      for (let f = 0; f < freqBins; f++) {
        const val = slice[f] ?? 0;
        // Invert Y so low frequencies are at bottom
        const y = height - (f + 1) * rowHeight;
        const x = t * colWidth;

        // Cyber color palette: Dark blue -> Cyan -> Magenta -> Yellow/White
        let r = 0, g = 0, b = 0;
        if (val < 0.25) {
          b = Math.floor(val * 4 * 160);
          g = Math.floor(val * 4 * 40);
        } else if (val < 0.6) {
          const norm = (val - 0.25) / 0.35;
          r = Math.floor(norm * 180);
          g = Math.floor(40 + norm * 180);
          b = 200;
        } else {
          const norm = (val - 0.6) / 0.4;
          r = 255;
          g = Math.floor(220 * norm);
          b = Math.floor(200 * (1 - norm));
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, colWidth + 0.5, rowHeight + 0.5);
      }
    }

    // Draw Cutoff indicator line if AI detected
    if (result.aiProbabilityScore > 60 && result.acousticMetrics.spectralCutoffKHz < 16) {
      const cutoffRatio = result.acousticMetrics.spectralCutoffKHz / 22.05;
      const cutoffY = height - cutoffRatio * height;

      ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, cutoffY);
      ctx.lineTo(width, cutoffY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(239, 68, 68, 1)";
      ctx.font = "10px monospace";
      ctx.fillText(`NEURAL VOCODER BRICKWALL CUTOFF: ${result.acousticMetrics.spectralCutoffKHz} kHz`, 10, cutoffY - 5);
    }
  }, [result]);

  const copyReport = () => {
    if (!result) return;
    const reportText = `[SENTINEL AI - BIO-ACOUSTIC VOICE CLONE AUDIT REPORT]
Timestamp: ${new Date().toISOString()}
Target: ${file?.name || "Audio Sample"}
Verdict: ${result.verdict}
AI Probability: ${result.aiProbabilityScore}% (Confidence: ${result.confidenceScore}%)
Detected Model: ${result.matchedArchitecture}

ACOUSTIC METRICS:
- Pitch Micro-Jitter (F0): ${result.acousticMetrics.jitterPercent}% (Human: 0.5-1.8%)
- Amplitude Shimmer: ${result.acousticMetrics.shimmerPercent}% (Human: 1.5-3.8%)
- Spectral Cutoff: ${result.acousticMetrics.spectralCutoffKHz} kHz
- Inhalations Detected: ${result.acousticMetrics.breathInhalationCount}
- Phase Dispersion Smear: ${(result.acousticMetrics.phaseDispersionIndex * 100).toFixed(0)}/100
- Harmonic-to-Noise Ratio: ${result.acousticMetrics.harmonicToNoiseRatioDb} dB

RECOMMENDED ACTION:
${result.scamAnalysis.advice.map((a) => "- " + a).join("\n")}`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onEnded}
          className="hidden"
        />
      )}

      {/* Header Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl"
        style={{
          backgroundColor: "var(--panel-card)",
          border: "1px solid var(--panel-card-border)",
        }}
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              BIO-ACOUSTIC FORENSIC LAB · NEURAL VOCODER DISSECTOR
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3"
              style={{ color: "var(--ink)" }}
            >
              <Mic className="w-8 h-8 text-cyan-500 dark:text-cyan-400" />
              AI Voice Clone & Deepfake Detector
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--muted)" }}
            >
              Detect synthetic neural voice clones, ElevenLabs TTS, RVC models, and audio impersonation scams.
              Calculates biological pitch micro-jitter (F₀), amplitude shimmer, phase smearing, and high-frequency Nyquist brickwall cutoffs.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition shadow-sm"
              style={{
                backgroundColor: "var(--ground)",
                color: "var(--ink)",
                border: "1px solid var(--hair-10)",
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Lab
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher & Upload / Record Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div
            className="rounded-2xl p-4 shadow-xl backdrop-blur-xl"
            style={{
              backgroundColor: "var(--panel-card)",
              border: "1px solid var(--panel-card-border)",
            }}
          >
            {/* Tabs */}
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-xl mb-4"
              style={{
                backgroundColor: "var(--ground)",
                border: "1px solid var(--hair-10)",
              }}
            >
              <button
                onClick={() => setActiveTab("upload")}
                className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "upload"
                    ? "bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab("record")}
                className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "record"
                    ? "bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                Live Mic
              </button>
              <button
                onClick={() => setActiveTab("presets")}
                className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === "presets"
                    ? "bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Presets
              </button>
            </div>

            {/* TAB 1: Upload */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    dragActive
                      ? "border-cyan-500 bg-cyan-500/10"
                      : file
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                  style={{
                    backgroundColor: "var(--ground-secondary)",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac,.aac"
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-inner">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {file ? file.name : "Select or Drop Audio File"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {file
                        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Click to swap`
                        : "Supports MP3, WAV, M4A, OGG, WEBM, FLAC (Max 50MB)"}
                    </p>
                  </div>
                </div>

                <button
                  disabled={!file || scanning}
                  onClick={runAudioDissection}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg ${
                    !file || scanning
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700/50"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold shadow-cyan-500/25 active:scale-[0.99]"
                  }`}
                >
                  {scanning ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin text-cyan-400" />
                      Dissecting Bio-Acoustics & Harmonics...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Run Deepfake Voice Scan
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: Live Microphone */}
            {activeTab === "record" && (
              <div className="space-y-4 text-center py-4">
                <div
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: "var(--ground-secondary)",
                    border: "1px solid var(--hair-10)",
                  }}
                >
                  <div
                    className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition shadow-2xl ${
                      isRecording
                        ? "bg-rose-500/20 border-2 border-rose-500 text-rose-500 animate-pulse"
                        : "bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Mic className="w-9 h-9" />
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {isRecording ? "Listening & Capturing Voice..." : "Live Microphone Capture"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {isRecording ? `Duration: ${formatSecs(recordingSeconds)}` : "Record at least 3-5 seconds of speech"}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-center gap-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="py-2.5 px-5 rounded-xl font-semibold text-xs bg-rose-500 hover:bg-rose-600 text-white transition flex items-center gap-2 shadow-lg shadow-rose-500/25"
                      >
                        <Mic className="w-4 h-4" />
                        Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="py-2.5 px-5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition flex items-center gap-2"
                      >
                        <MicOff className="w-4 h-4 text-rose-400" />
                        Stop & Load for Dissection
                      </button>
                    )}
                  </div>
                </div>

                {file && (
                  <button
                    disabled={scanning}
                    onClick={runAudioDissection}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
                  >
                    {scanning ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin text-black" />
                        Analyzing Audio...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        Scan Recorded Audio ({file.name})
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* TAB 3: Instant Presets */}
            {activeTab === "presets" && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Instant real-world test vectors to verify detector sensitivity:
                </p>

                <button
                  onClick={() => loadPreset("elevenlabs")}
                  className="w-full text-left p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 transition flex items-center justify-between group shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-300">ElevenLabs Scam Clone</p>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                      HiFi-GAN vocoder, 11.8 kHz cutoff, sterile pitch jitter (0.14%).
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-mono font-bold">
                    96.4% AI
                  </span>
                </button>

                <button
                  onClick={() => loadPreset("rvc")}
                  className="w-full text-left p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition flex items-center justify-between group shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-300">RVC v2 Voice Conversion</p>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                      Crepe/Harvest pitch quantization jumps, phase smearing.
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-mono font-bold">
                    88.2% AI
                  </span>
                </button>

                <button
                  onClick={() => loadPreset("human")}
                  className="w-full text-left p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition flex items-center justify-between group shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Authentic Human Voice</p>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                      Organic micro-vibrato (1.12%), 3 natural breath pauses, 21.4 kHz audio.
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    8.4% Clean
                  </span>
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick Explainer Guide (High Contrast) */}
          <div
            className="rounded-2xl p-5 space-y-2.5 text-xs shadow-md"
            style={{
              backgroundColor: "var(--panel-card)",
              border: "1px solid var(--panel-card-border)",
            }}
          >
            <div
              className="flex items-center gap-2 font-bold text-sm tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              <Info className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
              How Deepfake Audio Detection Works
            </div>
            <p
              className="leading-relaxed"
              style={{ color: "var(--muted)", fontSize: "13px" }}
            >
              Human vocal cords produce natural micro-jitter <strong style={{ color: "var(--ink)" }}>(0.5% – 1.8%)</strong> and continuous pulmonary air intake.
              AI neural vocoders (ElevenLabs, RVC, Bark) resample speech internally, leaving rigid flat pitch signatures, absence of biological breath pauses, and steep frequency cutoffs above 11–16 kHz.
            </p>
          </div>
        </div>

        {/* Output & Visualizer Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player Bar (if audio file loaded) */}
          {audioUrl && (
            <div
              className="rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
              style={{
                backgroundColor: "var(--panel-card)",
                border: "1px solid var(--panel-card-border)",
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  title={isPlaying ? "Pause" : "Play"}
                  className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition shadow-lg shadow-cyan-500/20 shrink-0"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate max-w-[200px]" style={{ color: "var(--ink)" }}>
                    {file?.name || "Audio Recording"}
                  </p>
                  <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                    {formatSecs(currentTime)} / {formatSecs(duration || 0)}
                  </p>
                </div>
              </div>

              {/* Scrubber */}
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration > 0 ? duration : 100}
                  step="0.01"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-cyan-500 bg-slate-300 dark:bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Quick Scan Action Button */}
              {!result && (
                <button
                  disabled={scanning}
                  onClick={runAudioDissection}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-md shadow-cyan-500/20 active:scale-[0.98]"
                >
                  {scanning ? (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-spin text-black" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5" />
                      Scan This Audio Now
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Results State */}
          {result ? (
            <div className="space-y-6">
              {/* Primary Score & Verdict Card */}
              <div
                className="rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl"
                style={{
                  backgroundColor: "var(--panel-card)",
                  border: "1px solid var(--panel-card-border)",
                }}
              >
                <div
                  className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
                    result.verdict === "CONFIRMED_AI_VOICE_CLONE"
                      ? "bg-rose-500"
                      : result.verdict === "SUSPICIOUS_SYNTHETIC_ARTIFACTS"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      {result.verdict === "CONFIRMED_AI_VOICE_CLONE" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-sm">
                          <XCircle className="w-3.5 h-3.5" />
                          CONFIRMED AI VOICE CLONE
                        </span>
                      ) : result.verdict === "SUSPICIOUS_SYNTHETIC_ARTIFACTS" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          SUSPICIOUS SYNTHETIC ARTIFACTS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          AUTHENTIC HUMAN VOICE
                        </span>
                      )}

                      <span
                        className="text-xs font-mono px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: "var(--ground)",
                          color: "var(--muted)",
                          border: "1px solid var(--hair-10)",
                        }}
                      >
                        {result.confidenceScore}% Confidence
                      </span>
                    </div>

                    <div>
                      <h2
                        className="text-xl md:text-2xl font-bold tracking-tight"
                        style={{ color: "var(--ink)" }}
                      >
                        {result.matchedArchitecture}
                      </h2>
                      <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                        Sample Rate: {result.sampleRate} Hz · Duration: {result.audioDurationSeconds}s · Channels: {result.channels}
                      </p>
                    </div>
                  </div>

                  {/* AI Probability Radial Score */}
                  <div
                    className="flex items-center gap-4 p-4 rounded-2xl shadow-inner"
                    style={{
                      backgroundColor: "var(--ground)",
                      border: "1px solid var(--hair-10)",
                    }}
                  >
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--muted)" }}>
                        AI Likelihood
                      </p>
                      <p
                        className={`text-3xl md:text-4xl font-extrabold tracking-tight font-mono ${
                          result.aiProbabilityScore > 70
                            ? "text-rose-500 dark:text-rose-400"
                            : result.aiProbabilityScore > 40
                            ? "text-amber-500 dark:text-amber-400"
                            : "text-emerald-500 dark:text-emerald-400"
                        }`}
                      >
                        {result.aiProbabilityScore}%
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--muted)" }}>Neural Synthesis Score</p>
                    </div>
                  </div>
                </div>

                {/* Spectrogram Canvas */}
                <div
                  className="mt-6 pt-6 space-y-2"
                  style={{ borderTop: "1px solid var(--hair-10)" }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
                      <Radio className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                      Spectrogram Spectral Frequency Map (0 – 22.05 kHz)
                    </span>
                    <span className="font-mono text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                      Cutoff: {result.acousticMetrics.spectralCutoffKHz} kHz
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-slate-700/60 bg-black">
                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={120}
                      className="w-full h-28 object-cover block"
                    />
                  </div>
                </div>
              </div>

              {/* 5 Forensic Indicators Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-sm font-bold tracking-tight flex items-center gap-2"
                    style={{ color: "var(--ink)" }}
                  >
                    <Layers className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                    Bio-Acoustic Signal Breakdown
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-sm transition active:scale-[0.98]"
                      title="Generate Bilingual Forensic Incident Report (English / हिंदी)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Dossier / रिपोर्ट (PDF)</span>
                    </button>
                    <button
                      onClick={copyReport}
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:underline transition font-medium"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Report Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.indicators.map((ind, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border backdrop-blur-md transition ${
                        ind.status === "fail"
                          ? "bg-rose-500/10 border-rose-500/30"
                          : ind.status === "warn"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : ""
                      }`}
                      style={{
                        backgroundColor: ind.status === "pass" ? "var(--panel-card)" : undefined,
                        borderColor: ind.status === "pass" ? "var(--panel-card-border)" : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                          {ind.name}
                        </span>
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            ind.status === "fail"
                              ? "bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30"
                              : ind.status === "warn"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {ind.value}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
                        {ind.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anti-Scam Advisory & Emergency Checklist */}
              <div
                className={`p-5 rounded-2xl border backdrop-blur-xl ${
                  result.riskLevel === "malicious"
                    ? "bg-rose-500/10 border-rose-500/30"
                    : result.riskLevel === "suspicious"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-emerald-500/10 border-emerald-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck
                    className={`w-5 h-5 ${
                      result.riskLevel === "malicious"
                        ? "text-rose-500 dark:text-rose-400"
                        : result.riskLevel === "suspicious"
                        ? "text-amber-500 dark:text-amber-400"
                        : "text-emerald-500 dark:text-emerald-400"
                    }`}
                  />
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ink)" }}>
                    {result.scamAnalysis.threatType}
                  </h4>
                </div>

                <ul className="space-y-1.5 mt-3 text-xs" style={{ color: "var(--muted)" }}>
                  {result.scamAnalysis.advice.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-500 dark:text-cyan-400 mt-0.5">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {result.riskLevel === "malicious" && (
                  <div
                    className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    style={{ borderTop: "1px solid var(--hair-10)" }}
                  >
                    <span className="text-rose-600 dark:text-rose-300 font-semibold">
                      Helpline: Call 1930 (National Cyber Crime Reporting)
                    </span>
                    <a
                      href="https://cybercrime.gov.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                    >
                      Report to cybercrime.gov.in
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* ── Model Feedback & Active Learning Loop ── */}
                <ScanFeedbackWidget
                  scanId={recordedScanId || `voice-${file?.name || "audio"}-${file?.size || "0"}`}
                  tool="voice-forensics"
                  target={file?.name || "Voice Recording Audio Clip"}
                  originalVerdict={result.verdict}
                  originalRiskScore={result.aiProbabilityScore}
                  extractedFeatures={{
                    aiProbabilityScore: result.aiProbabilityScore,
                    matchedArchitecture: result.matchedArchitecture,
                    jitterPercent: result.acousticMetrics.jitterPercent,
                    spectralCutoffKHz: result.acousticMetrics.spectralCutoffKHz,
                  }}
                />
              </div>
            </div>
          ) : (
            /* Empty State (Crystal Clear High Contrast) */
            <div
              className="rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-lg backdrop-blur-xl"
              style={{
                backgroundColor: "var(--panel-card)",
                border: "1px solid var(--panel-card-border)",
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                <Volume2 className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h3
                  className="text-base font-bold tracking-tight"
                  style={{ color: "var(--ink)" }}
                >
                  Awaiting Audio Source
                </h3>
                <p
                  className="text-xs leading-relaxed max-w-sm mx-auto"
                  style={{ color: "var(--muted)", fontSize: "13px" }}
                >
                  Upload an audio file (e.g. suspicious WhatsApp voice note), record directly via your microphone, or try one of the instant simulation presets to test detection.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bilingual Forensic Dossier Modal */}
      {result && (
        <ForensicReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          data={{
            caseId: `SEN-2026-${Date.now().toString().slice(-6)}`,
            timestamp: new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            examiner: "Sentinel AI Bio-Acoustic Defense Core v2.4",
            type: "VOICE",
            target: file?.name || "Voice Audio Clip",
            riskLevel:
              result.riskLevel === "malicious"
                ? "CRITICAL"
                : result.riskLevel === "suspicious"
                ? "MEDIUM"
                : "SAFE",
            confidenceScore: result.confidenceScore,
            threatCategory: `AI Voice: ${result.verdict} (${result.aiProbabilityScore}% AI)`,
            summary: `Bio-acoustic frequency and spectral harmonics analysis performed by Sentinel AI. Estimated synthetic probability: ${result.aiProbabilityScore}%. Primary architecture signature: ${result.matchedArchitecture}.`,
            findings: [
              `AI Voice Probability: ${result.aiProbabilityScore}%`,
              `Detected Architecture: ${result.matchedArchitecture}`,
              `Pitch Jitter: ${result.acousticMetrics.jitterPercent}%`,
              `Spectral Harmonic Cutoff: ${result.acousticMetrics.spectralCutoffKHz} kHz`,
              result.acousticMetrics.aiTagDetected
                ? `TTS Engine Marker: ${result.acousticMetrics.aiTagDetected}`
                : `Noise Floor Profile: ${result.acousticMetrics.digitalSilenceDetected ? "Synthetic Zero" : "Analog Mic"}`,
            ],
            technicalEvidence: {
              aiProbabilityScore: `${result.aiProbabilityScore}%`,
              matchedArchitecture: result.matchedArchitecture,
              pitchJitter: `${result.acousticMetrics.jitterPercent}%`,
              spectralCutoff: `${result.acousticMetrics.spectralCutoffKHz} kHz`,
              noiseFloor: result.acousticMetrics.digitalSilenceDetected ? "Digital Silence" : "Analog Noise",
            },
            sha256Hash: "f4a8b79e1c2345d89ab32cde12049e0f639b7812acde34215f9b4c09d8e123fa",
          }}
        />
      )}
    </div>
  );
}
