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
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "URL Scanner", href: "/dashboard/scanner/url", icon: Search },
  { name: "QR Scanner", href: "/dashboard/scanner/qr", icon: QrCode },
  { name: "Scan History", href: "/dashboard/history", icon: History },
  { name: "Threat Intelligence", href: "/dashboard/threats", icon: ShieldAlert },
  { name: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
  { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { name: "Organizations", href: "/dashboard/organizations", icon: Building2 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed }: SidebarProps) {
  const pathname = usePathname();

  // Close sidebar on route change for mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-xl transition-all duration-300",
        // Mobile translation
        sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
        // Desktop width based on collapse state
        sidebarCollapsed ? "md:w-20" : "md:w-64"
      )}>
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-zinc-800">
          <Link href="/dashboard" className={cn("flex items-center gap-2 font-bold text-lg tracking-tight text-white transition-opacity", sidebarCollapsed ? "md:opacity-0 md:hidden" : "opacity-100")}>
            <ShieldAlert className="h-6 w-6 text-indigo-500 shrink-0" />
            <span className="whitespace-nowrap">Sentinel AI</span>
          </Link>
          
          {/* Mobile close button */}
          <button 
            type="button" 
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-300"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-5 w-5" />
          </button>

          {/* Desktop logo icon when collapsed */}
          {sidebarCollapsed && (
            <Link href="/dashboard" className="hidden md:flex mx-auto items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-indigo-500" />
            </Link>
          )}
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={cn(
                    isActive
                      ? "bg-zinc-800/80 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white",
                    "group flex items-center gap-x-3 rounded-md py-2 text-sm font-medium transition-all duration-200",
                    sidebarCollapsed ? "md:justify-center px-0" : "px-3"
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-indigo-400" : "text-zinc-400 group-hover:text-indigo-400",
                      "h-5 w-5 shrink-0 transition-colors"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn("whitespace-nowrap transition-opacity", sidebarCollapsed ? "md:hidden" : "block")}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop collapse toggle */}
        <div className="hidden md:flex p-4 border-t border-zinc-800">
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </>
  );
}
