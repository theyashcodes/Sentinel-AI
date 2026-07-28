"use client";

import { Activity } from "lucide-react";

export function RecentActivity() {
  return (
    <div className="bg-white/[0.03] backdrop-blur-md rounded-[2.5rem] p-8 min-h-[300px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col justify-between">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold tracking-tight text-white font-display">Signal Feed</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-ping" />
          <span className="text-[10px] font-bold text-[#00f2ff] uppercase tracking-widest">
            Live
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-6">
          <Activity className="w-9 h-9 text-gray-600" />
        </div>
        <p className="text-gray-400 font-bold mb-1">No Active Signals</p>
        <p className="text-xs text-gray-600">Waiting for telemetry data from perimeter nodes.</p>
      </div>
    </div>
  );
}
