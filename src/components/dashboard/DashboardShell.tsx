"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen text-white flex relative"
      style={{ backgroundColor: "#050508", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Mesh gradient background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at 10% 20%, rgba(188,19,254,0.10) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(0,242,255,0.10) 0%, transparent 40%)",
        }}
      />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="relative z-10 flex-1 ml-0 md:ml-72 min-h-screen p-6 md:p-10">
        {/* Mobile hamburger */}
        <button
          className="md:hidden mb-6 p-2 rounded-xl border border-white/10 bg-white/5 text-white"
          onClick={() => setSidebarOpen(true)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {children}
      </main>
    </div>
  );
}
