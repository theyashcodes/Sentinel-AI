import Link from "next/link";
import { Search, FileText, Zap } from "lucide-react";

export function QuickActions() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="border-b border-zinc-800 px-6 py-5">
        <h3 className="text-base font-semibold leading-6 text-white">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
        <Link href="/dashboard/scanner/url" className="flex flex-col items-center p-6 text-center hover:bg-zinc-800/30 transition-colors group">
          <div className="rounded-full bg-indigo-500/10 p-3 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <Search className="h-6 w-6" />
          </div>
          <h4 className="mt-4 text-sm font-medium text-white">New Scan</h4>
          <p className="mt-1 text-xs text-zinc-400">Scan a URL or file instantly</p>
        </Link>
        <Link href="/dashboard/projects" className="flex flex-col items-center p-6 text-center hover:bg-zinc-800/30 transition-colors group">
          <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <FileText className="h-6 w-6" />
          </div>
          <h4 className="mt-4 text-sm font-medium text-white">Create Project</h4>
          <p className="mt-1 text-xs text-zinc-400">Organize your scans</p>
        </Link>
        <Link href="/dashboard/api-keys" className="flex flex-col items-center p-6 text-center hover:bg-zinc-800/30 transition-colors group">
          <div className="rounded-full bg-orange-500/10 p-3 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <Zap className="h-6 w-6" />
          </div>
          <h4 className="mt-4 text-sm font-medium text-white">API Integration</h4>
          <p className="mt-1 text-xs text-zinc-400">Generate an API key</p>
        </Link>
      </div>
    </div>
  );
}
