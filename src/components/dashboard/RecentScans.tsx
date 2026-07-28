"use client";

import { Database, RotateCw } from "lucide-react";

export function RecentScans() {
  return (
    <div className="bg-white/[0.03] backdrop-blur-md rounded-[2.5rem] p-8 min-h-[300px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col justify-between group">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold tracking-tight text-white font-display">Audit Logs</h3>
        <button
          id="scans-refresh"
          onClick={() => window.location.reload()}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <RotateCw className="w-4 h-4 text-white/50" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-6">
          <Database className="w-9 h-9 text-gray-600" />
        </div>
        <p className="text-gray-400 font-bold mb-1">Audit Vault Empty</p>
        <p className="text-xs text-gray-600">Execute a scan to generate compliance reports.</p>
      </div>
    </div>
  );
}
