"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, Copy, Check } from "lucide-react";
import { captureException } from "@/lib/monitoring";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const incidentId = error.digest || `DASH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  useEffect(() => {
    captureException(error, { digest: error.digest, incidentId });
    console.error("[Sentinel Dashboard Guard] Dashboard view crashed:", error);
  }, [error, incidentId]);

  const handleCopy = () => {
    const payload = {
      incidentId,
      digest: error.digest,
      message: error.message,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div
        className="w-full max-w-lg border border-red-500/30 p-8 text-center"
        style={{
          backgroundColor: "var(--panel-card, #121217)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="h-7 w-7 text-red-500 animate-pulse" />
        </div>

        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/30 px-3 py-1 text-xs font-mono font-medium tracking-wide text-red-400">
          OPERATIONAL STREAM ISOLATED
        </div>

        <h3 className="mt-2 text-lg font-semibold text-white">Dashboard Module Interruption</h3>
        <p className="mx-auto mt-2 max-w-sm text-xs text-zinc-400">
          The threat stream or view component encountered an unhandled exception. The rest of your security workspace remains secure.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 rounded border border-zinc-800 bg-black/50 px-3 py-1 font-mono text-xs text-zinc-400">
          <span className="text-zinc-500">REF:</span>
          <span className="font-semibold text-red-400">{incidentId}</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-red-500/30 hover:border-red-500 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Module
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Diagnostic
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
