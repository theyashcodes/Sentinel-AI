"use client";

import { useState, useEffect, useRef } from "react";
import {
  Database,
  Download,
  UploadCloud,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  Trash2,
  Clock,
  HardDrive,
  FileText,
  Lock,
  X,
  Sparkles,
} from "lucide-react";
import { CloudRestorePoint, RestoreReport, SentinelBackupArchive } from "@/lib/backup/types";

export function BackupRecoverySection() {
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [snapshots, setSnapshots] = useState<CloudRestorePoint[]>([]);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);

  // File restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileArchive, setFileArchive] = useState<SentinelBackupArchive | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [restoreReport, setRestoreReport] = useState<RestoreReport | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud restore confirmation modal
  const [confirmRestorePoint, setConfirmRestorePoint] = useState<CloudRestorePoint | null>(null);

  // Load cloud snapshots on mount
  const fetchSnapshots = async () => {
    try {
      setLoadingSnapshots(true);
      const res = await fetch("/api/user/backup/snapshots");
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error("Failed to fetch restore points:", err);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  // 1. Export Backup Archive
  const handleExportBackup = async () => {
    try {
      setLoadingExport(true);
      setStatusMessage(null);
      const res = await fetch("/api/user/backup");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate backup archive.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `sentinel-backup-${new Date().toISOString().split("T")[0]}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: "Tamper-evident backup archive generated and downloaded successfully.",
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Backup export failed.",
      });
    } finally {
      setLoadingExport(false);
    }
  };

  // 2. Select & Parse Local Backup File
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setRestoreReport(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setFileError("Please select a valid Sentinel AI JSON backup file.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.metadata || !parsed.data) {
          throw new Error("Invalid archive schema. Missing metadata or data payload.");
        }
        setFileArchive(parsed as SentinelBackupArchive);
      } catch (parseErr) {
        setFileError(parseErr instanceof Error ? parseErr.message : "Failed to parse JSON file.");
        setFileArchive(null);
      }
    };
    reader.readAsText(file);
  };

  // 3. Execute Restore from Local File
  const handleExecuteFileRestore = async () => {
    if (!fileArchive) return;
    try {
      setRestoring(true);
      setFileError(null);
      const res = await fetch("/api/user/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileArchive),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Data restoration failed.");
      }

      setRestoreReport(data);
      setStatusMessage({
        type: "success",
        text: data.message || "Data recovery completed successfully!",
      });

      // Reload snapshots and refresh state
      fetchSnapshots();
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Restoration execution failed.");
    } finally {
      setRestoring(false);
    }
  };

  // 4. Create Cloud Restore Point
  const handleCreateSnapshot = async () => {
    try {
      setCreatingSnapshot(true);
      setStatusMessage(null);
      const res = await fetch("/api/user/backup/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newSnapshotLabel.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to create cloud snapshot.");
      }

      setNewSnapshotLabel("");
      setShowLabelInput(false);
      setStatusMessage({
        type: "success",
        text: `Cloud restore point "${data.snapshot.label}" created successfully.`,
      });
      setTimeout(() => setStatusMessage(null), 5000);
      fetchSnapshots();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Snapshot creation failed.",
      });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  // 5. Restore from Cloud Snapshot
  const handleExecuteCloudRestore = async (point: CloudRestorePoint) => {
    try {
      setRestoring(true);
      setStatusMessage(null);
      const res = await fetch(`/api/user/backup/snapshots/${point.id}/restore`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to restore cloud snapshot.");
      }

      setConfirmRestorePoint(null);
      setRestoreReport(data);
      setStatusMessage({
        type: "success",
        text: data.message || "Cloud snapshot successfully restored!",
      });
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Cloud restore failed.",
      });
    } finally {
      setRestoring(false);
    }
  };

  // 6. Delete Cloud Snapshot
  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm("Are you sure you want to remove this cloud restore point?")) return;
    try {
      const res = await fetch(`/api/user/backup/snapshots/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSnapshots((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete snapshot:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Header / Overview Card */}
      <div
        className="rounded-2xl p-4 sm:p-6 backdrop-blur-xl relative overflow-hidden"
        style={{
          backgroundColor: "var(--panel-card)",
          border: "1px solid var(--panel-card-border)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                color: "#3B82F6",
                border: "1px solid rgba(59, 130, 246, 0.25)",
              }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  Data Backup & Disaster Recovery
                </h2>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.06em",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "#10B981",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  ● SHA-256 INTEGRITY PROTECTED
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.35rem 0 0 0", maxWidth: "700px", lineHeight: 1.5 }}>
                Export comprehensive offline backup archives of your scans, forensic diagnostics, custom threat records, and workspace preferences—or revert changes with one-click cloud restore points.
              </p>
            </div>
          </div>

          {/* Quick Action: Export Full Backup */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={loadingExport}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-98 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <Download className={`w-3.5 h-3.5 ${loadingExport ? "animate-bounce" : ""}`} />
              <span>{loadingExport ? "Generating Archive..." : "Export Full Backup"}</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Two Column Grid: Local File Recovery & Cloud Restore Points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Restore From Backup File */}
        <div
          className="rounded-2xl p-4 sm:p-6 backdrop-blur-xl flex flex-col justify-between"
          style={{
            backgroundColor: "var(--panel-card)",
            border: "1px solid var(--panel-card-border)",
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(99, 102, 241, 0.12)",
                    color: "#6366F1",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                  }}
                >
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                    Recover Data from Archive
                  </h3>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: "2px 0 0 0" }}>
                    Select a previously exported Sentinel .json archive
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Drop / Select Zone */}
            {!fileArchive ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group hover:border-blue-500/50 hover:bg-blue-500/5"
                style={{ borderColor: "var(--hair-15)" }}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-200 mt-2">
                  Click to select Sentinel Backup File (.json)
                </p>
                <p className="text-[11px] text-slate-400">
                  Files are validated with SHA-256 checksums before restoration.
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: "var(--ground)",
                  border: "1px solid var(--hair-15)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-[260px]">
                        {selectedFile?.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Exported on: {new Date(fileArchive.metadata.exportedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileArchive(null);
                      setFileError(null);
                      setRestoreReport(null);
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Archive Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[10px] text-slate-400 block">Scans</span>
                    <strong className="text-white font-mono">{fileArchive.metadata.counts.scans}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[10px] text-slate-400 block">Reports</span>
                    <strong className="text-white font-mono">{fileArchive.metadata.counts.communityReports}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[10px] text-slate-400 block">Training</span>
                    <strong className="text-white font-mono">{fileArchive.metadata.counts.lessonProgress}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-[10px] text-slate-400 block">Alerts</span>
                    <strong className="text-white font-mono">{fileArchive.metadata.counts.notifications}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Checksum: {fileArchive.metadata.checksum.slice(0, 16)}...</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {fileError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Restoration Report Summary */}
            {restoreReport && (
              <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Restoration Completed</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  {restoreReport.message}
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          {fileArchive && (
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={handleExecuteFileRestore}
                disabled={restoring}
                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-98 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                }}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${restoring ? "animate-spin" : ""}`} />
                <span>{restoring ? "Replaying & Restoring Records..." : "Confirm & Restore Data"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Automated Cloud Restore Points */}
        <div
          className="rounded-2xl p-4 sm:p-6 backdrop-blur-xl flex flex-col justify-between"
          style={{
            backgroundColor: "var(--panel-card)",
            border: "1px solid var(--panel-card-border)",
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    color: "#10B981",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                    Cloud Restore Points
                  </h3>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: "2px 0 0 0" }}>
                    Instant rollback points stored safely in the database
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLabelInput((prev) => !prev)}
                className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition border border-white/10"
              >
                {showLabelInput ? "Cancel" : "+ New Snapshot"}
              </button>
            </div>

            {/* Create Snapshot Drawer */}
            {showLabelInput && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2.5 animate-in fade-in duration-200">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Snapshot Description / Label (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSnapshotLabel}
                    onChange={(e) => setNewSnapshotLabel(e.target.value)}
                    placeholder="e.g. Pre-Audit Backup or Sprint Checkpoint"
                    className="flex-1 h-9 px-3 text-xs rounded-lg bg-black/40 border border-white/15 text-white outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCreateSnapshot}
                    disabled={creatingSnapshot}
                    className="cursor-pointer px-4 h-9 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creatingSnapshot && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>{creatingSnapshot ? "Saving..." : "Save Point"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Snapshots List */}
            {loadingSnapshots ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-xs">Fetching restore points...</span>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-white/2 border border-dashed border-white/10 p-6">
                <Clock className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No cloud restore points saved yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click "+ New Snapshot" to capture an immediate recovery checkpoint.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {snapshots.map((pt) => (
                  <div
                    key={pt.id}
                    className="p-3 rounded-xl flex items-center justify-between gap-3 group transition"
                    style={{
                      backgroundColor: "var(--ground)",
                      border: "1px solid var(--hair-10)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-200 truncate">{pt.label}</p>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {pt.counts.scans} scans
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{new Date(pt.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>{(pt.sizeBytes / 1024).toFixed(1)} KB</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmRestorePoint(pt)}
                        disabled={restoring}
                        className="cursor-pointer px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 transition border border-emerald-500/30 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(pt.id)}
                        className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Restore Confirmation Modal */}
      {confirmRestorePoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: "var(--panel-card)",
              border: "1px solid var(--hair-15)",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Restore Cloud Point</h3>
                  <p className="text-xs text-slate-400">Confirm disaster recovery execution</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRestorePoint(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to restore data from checkpoint:{" "}
              <strong className="text-white block mt-1 font-mono text-[11px] bg-white/5 p-2 rounded-lg">
                {confirmRestorePoint.label} ({new Date(confirmRestorePoint.createdAt).toLocaleString()})
              </strong>
            </p>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              This process safely re-populates any missing scan telemetry, investigations, and training records. Existing scans will not be overwritten or lost.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestorePoint(null)}
                disabled={restoring}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteCloudRestore(confirmRestorePoint)}
                disabled={restoring}
                className="cursor-pointer px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1.5"
              >
                {restoring && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{restoring ? "Restoring..." : "Yes, Restore Data"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
