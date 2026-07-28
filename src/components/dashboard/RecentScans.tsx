import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

export function RecentScans() {
  // Placeholder data
  const scans: unknown[] = [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col h-full">
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <h3 className="text-base font-semibold leading-6 text-white">Recent Scans</h3>
        <Link href="/dashboard/history" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center text-center">
        {scans.length === 0 ? (
          <>
            <Activity className="mx-auto h-12 w-12 text-zinc-500" />
            <h3 className="mt-2 text-sm font-semibold text-white">No scans yet</h3>
            <p className="mt-1 text-sm text-zinc-400">Run your first scan to see it here.</p>
          </>
        ) : (
          <div className="w-full">
            {/* List goes here */}
          </div>
        )}
      </div>
    </div>
  );
}
