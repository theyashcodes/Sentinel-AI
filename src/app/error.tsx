'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { captureException } from '@/lib/monitoring';
import Link from 'next/link';

/**
 * Global Sentinel Error Boundary
 *
 * Catches unhandled errors across the entire app and reports them to telemetry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const incidentId = error.digest || `SEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  useEffect(() => {
    captureException(error, { digest: error.digest, incidentId });
    console.error('[Sentinel Global Guard] Unhandled application error:', error);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <div
        className="relative mx-auto w-full max-w-lg border border-red-500/30 p-8 shadow-2xl"
        style={{
          backgroundColor: 'rgba(12, 12, 16, 0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
          <ShieldAlert className="h-8 w-8 text-red-500 animate-pulse" />
        </div>

        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/40 px-3 py-1 text-xs font-mono font-medium tracking-wider text-red-400">
          SYSTEM INTEGRITY SAFEGUARD
        </div>

        <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
          Unexpected Engine Interruption
        </h2>

        <p className="mx-auto mt-2 text-sm text-zinc-400">
          The Sentinel AI subsystem encountered an unexpected fault. Our telemetry stream has captured the incident footprint.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 rounded border border-zinc-800 bg-black/60 px-3 py-1.5 font-mono text-xs text-zinc-400">
          <span className="text-zinc-500">INCIDENT HASH:</span>
          <span className="font-semibold text-red-400">{incidentId}</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 border border-red-500/40 bg-red-600/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-red-600/40 hover:border-red-500 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Restart Subsystem
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Hash
              </>
            )}
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-all hover:text-zinc-200"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
