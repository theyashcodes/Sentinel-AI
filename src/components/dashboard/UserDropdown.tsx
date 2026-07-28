"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, Building2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session } = authClient.useSession();
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

  const user = session?.user;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-x-2 rounded-full outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        <span className="sr-only">Open user menu</span>
        {user?.image ? (
          // User profile image URLs are provided by the authentication provider and may use arbitrary hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name || "User avatar"} className="h-8 w-8 rounded-full bg-zinc-800 object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
            <User className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-zinc-900 shadow-lg ring-1 ring-white/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm text-white font-medium truncate">{user?.name || "Loading..."}</p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{user?.email || "..."}</p>
          </div>
          
          <div className="py-1 border-b border-zinc-800">
            <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <Building2 className="h-3 w-3" />
              Organization
            </div>
            <div className="px-4 py-1.5 text-sm text-zinc-300">
              Personal Workspace
            </div>
          </div>

          <div className="py-1 border-b border-zinc-800">
            <Link 
              href="/dashboard/settings" 
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4 text-zinc-400 group-hover:text-white" />
              Settings
            </Link>
          </div>

          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300"
            >
              <LogOut className="h-4 w-4 text-red-400 group-hover:text-red-300" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
