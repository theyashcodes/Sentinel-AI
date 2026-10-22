"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, ShieldAlert } from "lucide-react";
import { captureException } from "@/lib/monitoring";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  incidentId: string;
}

export class SentinelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      incidentId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const incidentId = `SEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    return {
      hasError: true,
      error,
      incidentId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Report to monitoring service
    captureException(error, {
      component: this.props.componentName || "SentinelErrorBoundary",
      componentStack: errorInfo.componentStack,
      incidentId: this.state.incidentId,
    });

    console.error("[Sentinel Security Guard] Caught an unhandled UI exception:", error, errorInfo);
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
  };

  handleCopyReport = () => {
    const { error, errorInfo, incidentId } = this.state;
    const report = {
      incidentId,
      component: this.props.componentName || "Unknown",
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, incidentId, copied } = this.state;
      const isDev = process.env.NODE_ENV !== "production";

      return (
        <div
          className="relative my-4 flex w-full flex-col items-center justify-center overflow-hidden border p-8 text-center transition-all"
          style={{
            backgroundColor: "rgba(10, 10, 15, 0.85)",
            borderColor: "rgba(239, 68, 68, 0.35)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {/* Subtle Cyber scanline background pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 20%, rgba(239,68,68,0.3) 0%, transparent 70%)",
            }}
          />

          {/* Alert Indicator */}
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <ShieldAlert className="h-8 w-8 text-red-500 animate-pulse" />
          </div>

          {/* Heading */}
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/30 px-3 py-1 text-xs font-mono font-medium tracking-wide text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            SECURITY SUBSYSTEM FAULT
          </div>

          <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">
            {this.props.componentName ? `${this.props.componentName} Interrupted` : "Interface Component Fault"}
          </h3>

          <p className="mt-2 max-w-md text-sm text-zinc-400">
            A safeguard isolated this component to prevent state corruption. You can retry initialization or export diagnostic telemetry.
          </p>

          {/* Incident ID Banner */}
          <div className="mt-4 flex items-center gap-2 rounded bg-black/50 border border-zinc-800/80 px-3 py-1.5 font-mono text-xs text-zinc-400">
            <span className="text-zinc-500">REF:</span>
            <span className="text-red-400 font-semibold">{incidentId}</span>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-red-500/30 hover:border-red-500 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reinitialize Engine
            </button>

            <button
              onClick={this.handleCopyReport}
              className="inline-flex items-center gap-2 border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Telemetry Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Diagnostic
                </>
              )}
            </button>
          </div>

          {/* Developer Debug Details */}
          {isDev && error && (
            <div className="mt-6 w-full max-w-xl text-left">
              <details className="group rounded border border-zinc-800 bg-black/60 p-3 text-xs">
                <summary className="cursor-pointer font-mono text-zinc-400 transition-colors group-hover:text-zinc-200">
                  Developer Stack Trace ({error.name})
                </summary>
                <div className="mt-2 max-h-48 overflow-auto font-mono text-[11px] text-red-300/80 whitespace-pre-wrap">
                  {error.message}
                  {"\n\n"}
                  {error.stack}
                </div>
              </details>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
