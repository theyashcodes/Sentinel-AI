import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

export function ThreatSummary() {
  const threats: unknown[] = [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col h-full">
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <h3 className="text-base font-semibold leading-6 text-white">Threat Intelligence</h3>
        <Link href="/dashboard/threats" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center text-center">
        {threats.length === 0 ? (
          <>
            <ShieldAlert className="mx-auto h-12 w-12 text-emerald-500/50" />
            <h3 className="mt-2 text-sm font-semibold text-white">No threats detected</h3>
            <p className="mt-1 text-sm text-zinc-400">Your infrastructure is clean.</p>
          </>
        ) : (
          <div className="w-full">
            {/* Threat list here */}
          </div>
        )}
      </div>
    </div>
  );
}
