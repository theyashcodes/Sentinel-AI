"use client";

import Link from "next/link";
import { Search, FolderPlus, Cpu } from "lucide-react";

export function QuickActions() {
  return (
    <div className="bg-white/[0.03] backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-xl font-bold tracking-tight text-white font-display">System Operations</h3>
        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/50 tracking-widest uppercase">
          AVAILABLE COMMANDS
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          id="action-new-scan"
          href="/dashboard/scanner/url"
          className="group bg-white/5 hover:bg-white/10 border border-white/5 p-8 rounded-3xl flex flex-col items-center text-center transition-all"
        >
          <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 group-hover:rotate-6 group-hover:bg-white/10">
            <Search className="w-7 h-7 text-[#00f2ff]" />
          </div>
          <h4 className="font-bold text-white mb-2">Scan Protocol</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Launch instant diagnostic sweep of URLs or files.
          </p>
        </Link>

        <Link
          id="action-project"
          href="/dashboard/projects"
          className="group bg-white/5 hover:bg-white/10 border border-white/5 p-8 rounded-3xl flex flex-col items-center text-center transition-all"
        >
          <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 group-hover:rotate-6 group-hover:bg-white/10">
            <FolderPlus className="w-7 h-7 text-[#bc13fe]" />
          </div>
          <h4 className="font-bold text-white mb-2">New Workspace</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Partition secure storage for new client assets.
          </p>
        </Link>

        <Link
          id="action-api"
          href="/dashboard/api-keys"
          className="group bg-white/5 hover:bg-white/10 border border-white/5 p-8 rounded-3xl flex flex-col items-center text-center transition-all"
        >
          <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 group-hover:rotate-6 group-hover:bg-white/10">
            <Cpu className="w-7 h-7 text-orange-400" />
          </div>
          <h4 className="font-bold text-white mb-2">Sync Engine</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Authenticate external nodes via API keys.
          </p>
        </Link>
      </div>
    </div>
  );
}
