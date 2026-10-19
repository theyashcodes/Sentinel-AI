"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  QrCode,
  GitFork,
  Fingerprint,
  Mail,
  Shield,
  History,
  Settings,
  LogOut,
  X,
  User,
  KeyRound,
  Sliders,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { AccountSecurityModal, ModalTab } from "./AccountSecurityModal";

const coreNav = [
  { id: "nav-dashboard", name: "Dashboard",          href: "/dashboard",             icon: LayoutDashboard },
  { id: "nav-url",       name: "URL Scanner",        href: "/dashboard/scanner/url", icon: Search },
  { id: "nav-qr",        name: "QR Scanner",         href: "/dashboard/scanner/qr",  icon: QrCode },
  { id: "nav-tracer",    name: "Redirect Tracer",    href: "/dashboard/tracer",      icon: GitFork },
  { id: "nav-forensics", name: "AI Media Forensics", href: "/dashboard/forensics",   icon: Fingerprint },
  { id: "nav-email",     name: "Email Dissector",    href: "/dashboard/email-audit", icon: Mail },
  { id: "nav-extension", name: "Browser Shield",     href: "/dashboard/extension",   icon: Shield },
  { id: "nav-history",   name: "Scan History",       href: "/dashboard/history",     icon: History },
];

const systemNav = [
  { id: "nav-settings",  name: "Settings",      href: "/dashboard/settings",      icon: Settings },
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const sidebarStyle: React.CSSProperties = {
  width: "240px",
  position: "fixed",
  height: "100%",
  borderRight: "1px solid var(--sidebar-border)",
  backgroundColor: "var(--sidebar-bg)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  top: 0,
  left: 0,
};

const navLinkBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.5rem 0.75rem",
  fontSize: "13px",
  fontWeight: 300,
  color: "var(--muted)",
  textDecoration: "none",
  borderLeft: "1px solid transparent",
  transition: "color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease",
  letterSpacing: "0",
};

const navLinkActive: React.CSSProperties = {
  color: "var(--ink)",
  borderLeft: "1px solid var(--accent)",
  backgroundColor: "var(--accent-subtle)",
};

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [customUser, setCustomUser] = useState<{ name?: string; image?: string | null } | null>(null);
  const user = customUser ? { ...session?.user, ...customUser } : session?.user;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("profile");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } finally {
      router.push("/auth/sign-in");
      router.refresh();
    }
  };

  return (
    <aside
      style={{
        ...sidebarStyle,
        transform: sidebarOpen ? "translateX(0)" : undefined,
      }}
      className={cn(
        "transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Wordmark */}
      <div style={{ padding: "1.5rem 1rem 1rem", borderBottom: "1px solid var(--hair-06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <Image
            src="/logo-icon.png"
            alt="Sentinel AI"
            width={22}
            height={22}
            className="dark:invert dark:brightness-100 brightness-0"
            style={{ objectFit: "contain" }}
            priority
          />
          <div>
            <span style={{ display: "block", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 300, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink)" }}>
              Sentinel{" "}
              <span style={{ color: "var(--accent)" }}>AI</span>
            </span>
            <span style={{ display: "block", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginTop: "1px" }}>
              Security Platform
            </span>
          </div>
        </Link>

        <button
          className="md:hidden"
          style={{ padding: "0.25rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}
          onClick={() => setSidebarOpen(false)}
        >
          <X style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "1rem 0", overflowY: "auto" }}>
        {/* Section: Detection Engine */}
        <div style={{ padding: "0 1rem 0.5rem", marginBottom: "0.25rem" }}>
          <span className="label" style={{ color: "var(--muted)" }}>Security Engine</span>
        </div>
        {coreNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              id={item.id}
              href={item.href}
              style={{ ...navLinkBase, ...(isActive ? navLinkActive : {}) }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hair-06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <item.icon style={{ width: "14px", height: "14px", flexShrink: 0, color: isActive ? "var(--accent)" : undefined }} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Section: Configuration */}
        <div style={{ padding: "1.25rem 1rem 0.5rem", marginBottom: "0.25rem", marginTop: "0.5rem", borderTop: "1px solid var(--hair-06)" }}>
          <span className="label" style={{ color: "var(--muted)" }}>Preferences</span>
        </div>
        {systemNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              id={item.id}
              href={item.href}
              style={{ ...navLinkBase, ...(isActive ? navLinkActive : {}) }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hair-06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <item.icon style={{ width: "14px", height: "14px", flexShrink: 0, color: isActive ? "var(--accent)" : undefined }} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + Interactive Account Hub */}
      <div
        ref={menuRef}
        style={{
          position: "relative",
          padding: "0.75rem 1rem",
          borderTop: "1px solid var(--hair-06)",
          backgroundColor: isMenuOpen ? "var(--ground-secondary)" : "transparent",
          transition: "background-color 0.15s ease",
        }}
      >
        {/* Floating Options Menu (Appears above the user bar) */}
        {isMenuOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: "8px",
              right: "8px",
              backgroundColor: "var(--ground)",
              border: "1px solid var(--hair-10)",
              boxShadow: "0 -10px 30px -5px rgba(0, 0, 0, 0.6)",
              zIndex: 60,
              display: "flex",
              flexDirection: "column",
              animation: "fade-in 0.15s ease-out",
            }}
          >
            {/* Header / Security Status */}
            <div
              style={{
                padding: "0.75rem 0.875rem",
                borderBottom: "1px solid var(--hair-06)",
                backgroundColor: "var(--panel-card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}
                >
                  SEC-OPS OPERATOR
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "8px",
                    color: "var(--ok)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span className="status-dot pulse" style={{ width: "5px", height: "5px" }} />
                  AUTHENTICATED
                </span>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--ink)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name || "Yash Gupta"}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--muted)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.email || "user@sentinel.internal"}
              </p>
            </div>

            {/* Menu Items */}
            <div style={{ padding: "4px 0" }}>
              {/* Profile Change Button */}
              <button
                type="button"
                onClick={() => {
                  setModalTab("profile");
                  setIsModalOpen(true);
                  setIsMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.875rem",
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  color: "var(--ink)",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hair-06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <User style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
                <span>Change Profile / Avatar</span>
              </button>

              {/* Password Change Button */}
              <button
                type="button"
                onClick={() => {
                  setModalTab("password");
                  setIsModalOpen(true);
                  setIsMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.875rem",
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  color: "var(--ink)",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hair-06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <KeyRound style={{ width: "13px", height: "13px", color: "var(--accent)" }} />
                <span>Change Password</span>
              </button>

              <div style={{ height: "1px", backgroundColor: "var(--hair-06)", margin: "4px 0" }} />

              {/* Security Scan History */}
              <Link
                href="/dashboard/history"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  color: "var(--muted-light)",
                  fontSize: "12px",
                  textDecoration: "none",
                  transition: "all 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hair-06)";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--muted-light)";
                }}
              >
                <History style={{ width: "13px", height: "13px" }} />
                <span>Security Audit History</span>
              </Link>

              {/* System Preferences */}
              <Link
                href="/dashboard/settings"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  color: "var(--muted-light)",
                  fontSize: "12px",
                  textDecoration: "none",
                  transition: "all 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hair-06)";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--muted-light)";
                }}
              >
                <Settings style={{ width: "13px", height: "13px" }} />
                <span>System & Controls</span>
              </Link>

              <div style={{ height: "1px", backgroundColor: "var(--hair-06)", margin: "4px 0" }} />

              {/* Sign out */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleSignOut();
                }}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.875rem",
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  color: "var(--crit)",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <LogOut style={{ width: "13px", height: "13px" }} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* User Card Row (Clicking toggles menu) */}
        <div
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
            cursor: "pointer",
            padding: "4px",
            margin: "-4px -4px 0.5rem -4px",
            border: "1px solid transparent",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hair-06)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--hair-10)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
          title="Click to open Profile & Security Menu"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden", minWidth: 0 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img
                src={user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || "Yash"}`}
                alt="Profile"
                style={{ width: "28px", height: "28px", objectFit: "cover", border: "1px solid var(--hair-10)", backgroundColor: "var(--ground)" }}
              />
              <span className="status-dot pulse" style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "6px", height: "6px" }} />
            </div>
            <div style={{ overflow: "hidden", minWidth: 0 }}>
              <p style={{ fontSize: "12px", fontWeight: 400, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                {user?.name || "Yash Gupta"}
              </p>
              <p className="label" style={{ color: "var(--muted)", letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "none", fontSize: "10px", margin: 0 }}>
                {user?.email || "user@sentinel.internal"}
              </p>
            </div>
          </div>

          <ChevronUp
            style={{
              width: "12px",
              height: "12px",
              color: isMenuOpen ? "var(--accent)" : "var(--muted)",
              transform: isMenuOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease",
              flexShrink: 0,
            }}
          />
        </div>

        {/* Action Buttons: Expand Options & Direct Sign Out */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn-ghost"
            style={{
              flex: 1,
              justifyContent: "space-between",
              padding: "0.375rem 0.5rem",
              fontSize: "10px",
              letterSpacing: "0.05em",
              borderColor: isMenuOpen ? "var(--accent)" : undefined,
              color: isMenuOpen ? "var(--accent)" : "var(--ink)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Sliders style={{ width: "11px", height: "11px" }} />
              <span>PROFILE & SECURITY</span>
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px" }}>
              {isMenuOpen ? "▲" : "▼"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="btn-ghost"
            title="Sign out immediately"
            style={{
              padding: "0.375rem 0.6rem",
              color: "var(--muted)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--crit)";
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239, 68, 68, 0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--muted)";
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <LogOut style={{ width: "12px", height: "12px" }} />
          </button>
        </div>
      </div>

      {/* Account & Security Dialog Modal */}
      <AccountSecurityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab={modalTab}
        currentUser={{
          name: user?.name,
          email: user?.email,
          image: user?.image,
        }}
        onUserUpdated={(updated) => {
          setCustomUser((prev) => ({ ...prev, ...updated }));
        }}
      />
    </aside>
  );
}
