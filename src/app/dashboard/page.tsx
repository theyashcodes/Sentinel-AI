import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Layers,
  Key,
  Bell,
  ShieldAlert
} from "lucide-react";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ThreatSummary } from "@/components/dashboard/ThreatSummary";
import { RecentScans } from "@/components/dashboard/RecentScans";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");
  const user = session.user;
  const firstName = user?.name?.split(" ")[0] || "Yash";

  return (
    <div className="space-y-12">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-white font-display">
            Welcome back, <span className="text-[#00f2ff] drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]">{firstName}</span>
          </h1>
          <p className="text-gray-400 font-medium">
            Your digital perimeter is currently <span className="text-emerald-400 font-semibold">Shielded</span>.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            <Bell className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">3 Alerts</span>
          </div>
          <Link
            id="header-scan-cta"
            href="/dashboard/scanner/url"
            className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #bc13fe 0%, #00f2ff 100%)",
              boxShadow: "0 0 20px rgba(188,19,254,0.4)",
            }}
          >
            <ShieldAlert className="w-5 h-5 text-white" />
            INITIATE QUICK SCAN
          </Link>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
        {/* Critical Threats */}
        <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Critical Threats
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-white">0</span>
            <span className="text-xs text-emerald-400 font-bold tracking-tight">-12% today</span>
          </div>
        </div>

        {/* Total Scans */}
        <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <BarChart3 className="w-6 h-6 text-[#00f2ff]" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Total Scans
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-white">1,284</span>
            <span className="text-xs text-cyan-400 font-bold tracking-tight">+2.4k total</span>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Layers className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Active Projects
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-bold text-white">12</span>
            <span className="text-xs text-white/40 font-bold tracking-tight italic">Full capacity</span>
          </div>
        </div>

        {/* API Requests */}
        <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[2rem] border border-[#00f2ff]/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Key className="w-6 h-6 text-[#bc13fe]" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              API Requests
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-display font-bold tracking-tight text-white">
              432 / <span className="text-white/30">1,000</span>
            </span>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
              <div
                className="h-full w-[43%]"
                style={{ background: "linear-gradient(135deg, #bc13fe 0%, #00f2ff 100%)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
        <div className="lg:col-span-1">
          <ThreatSummary />
        </div>
      </div>

      {/* FOOTER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentScans />
        <RecentActivity />
      </div>
    </div>
  );
}
