"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Search, 
  QrCode,
  History, 
  ShieldAlert, 
  FolderGit2, 
  Key, 
  Building2, 
  Settings,
  X,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

const managementNav = [
  { id: "nav-dashboard", name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "nav-url", name: "URL Scanner", href: "/dashboard/scanner/url", icon: Search },
  { id: "nav-qr", name: "QR Scanner", href: "/dashboard/scanner/qr", icon: QrCode },
  { id: "nav-history", name: "Scan History", href: "/dashboard/history", icon: History },
];

const infraNav = [
  { id: "nav-threat", name: "Threat Intel", href: "/dashboard/threats", icon: ShieldAlert },
  { id: "nav-projects", name: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
  { id: "nav-api", name: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { id: "nav-org", name: "Organizations", href: "/dashboard/organizations", icon: Building2 },
  { id: "nav-settings", name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <aside
      className={cn(
        "w-72 fixed h-full border-r border-white/5 bg-black/40 backdrop-blur-xl z-50 flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Brand Header */}
      <div className="p-8 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-[#bc13fe] to-[#00f2ff]">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 font-display">
            SENTINEL AI
          </span>
        </Link>
        <button
          className="md:hidden text-gray-400 hover:text-white"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <p className="px-4 text-[10px] font-bold text-gray-500 tracking-[0.2em] mb-4 uppercase">
          Management
        </p>
        {managementNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              id={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                isActive
                  ? "bg-gradient-to-r from-[rgba(188,19,254,0.15)] to-[rgba(0,242,255,0.15)] border border-[rgba(188,19,254,0.5)] shadow-[0_0_15px_rgba(188,19,254,0.3)] text-white"
                  : "hover:bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-[#bc13fe]" : "group-hover:text-[#00f2ff]"
                )}
              />
              <span className={cn("text-sm font-medium", isActive ? "font-semibold text-white" : "")}>
                {item.name}
              </span>
            </Link>
          );
        })}

        <p className="px-4 text-[10px] font-bold text-gray-500 tracking-[0.2em] mt-8 mb-4 uppercase">
          Infrastructure
        </p>
        {infraNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              id={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                isActive
                  ? "bg-gradient-to-r from-[rgba(188,19,254,0.15)] to-[rgba(0,242,255,0.15)] border border-[rgba(188,19,254,0.5)] shadow-[0_0_15px_rgba(188,19,254,0.3)] text-white"
                  : "hover:bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive
                    ? "text-[#bc13fe]"
                    : item.id === "nav-threat"
                    ? "group-hover:text-red-400"
                    : "group-hover:text-[#00f2ff]"
                )}
              />
              <span className={cn("text-sm font-medium", isActive ? "font-semibold text-white" : "")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <div className="p-6">
        <div className="bg-white/[0.03] backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#00f2ff] p-0.5 overflow-hidden shrink-0">
              <img
                src={user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "Yash"}`}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.name || "Yash K."}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email || "Enterprise Plan"}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
