"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AccountSecurityModal, ModalTab } from "./AccountSecurityModal";

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("profile");
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session } = authClient.useSession();
  const [customUser, setCustomUser] = useState<{ name?: string; image?: string | null } | null>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth/sign-in");
        },
      },
    });
  };

  const user = customUser ? { ...session?.user, ...customUser } : session?.user;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-x-2 rounded-full outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <span className="sr-only">Open user menu</span>
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name || "User avatar"} className="h-8 w-8 rounded-full bg-zinc-800 object-cover border border-white/10" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 border border-white/10">
            <User className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right bg-zinc-950 border border-white/10 shadow-2xl focus:outline-none animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-indigo-400">
                SEC-OPS AGENT
              </span>
              <span className="font-mono text-[9px] text-emerald-400 flex items-center gap-1">
                ● ACTIVE
              </span>
            </div>
            <p className="text-sm text-white font-medium truncate">{user?.name || "Operator"}</p>
            <p className="font-mono text-xs text-zinc-400 truncate mt-0.5">{user?.email || "..."}</p>
          </div>
          
          {/* Account & Profile Options */}
          <div className="py-1 border-b border-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                setModalTab("profile");
                setIsModalOpen(true);
                setIsOpen(false);
              }}
              className="group flex w-full items-center gap-2 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              <User className="h-3.5 w-3.5 text-indigo-400" />
              <span>Change Profile / Avatar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalTab("password");
                setIsModalOpen(true);
                setIsOpen(false);
              }}
              className="group flex w-full items-center gap-2 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
              <span>Change Password</span>
            </button>
          </div>

          {/* Quick Platform Links */}
          <div className="py-1 border-b border-zinc-800/80">

            <Link 
              href="/dashboard/settings" 
              className="group flex w-full items-center gap-2 px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
              <span>System Settings</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5 text-red-400" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* Account Security Modal Dialog */}
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
    </div>
  );
}
