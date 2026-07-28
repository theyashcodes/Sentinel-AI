"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function ThreatSummary() {
  return (
    <div className="bg-white/[0.03] backdrop-blur-md rounded-[2.5rem] p-8 border border-emerald-500/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold tracking-tight text-white font-display">Perimeter Status</h3>
        <Link
          id="intel-view-all"
          href="/dashboard/threats"
          className="text-[#00f2ff] text-xs font-bold hover:underline underline-offset-4 tracking-wider uppercase"
        >
          HISTORY
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-6">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
          <ShieldCheck className="w-24 h-24 text-emerald-400 relative" />
        </div>

        <h4 className="text-2xl font-bold font-display mt-8 mb-2 tracking-tight text-white">
          INTEGRITY SECURE
        </h4>
        <p className="text-sm text-gray-500 text-center px-4 font-medium leading-relaxed">
          Zero intrusion attempts detected in the last 24 working hours.
        </p>

        <div className="mt-10 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
        </div>
      </div>
    </div>
  );
}
