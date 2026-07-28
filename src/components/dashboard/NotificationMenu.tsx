"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";

export function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-zinc-400 hover:text-zinc-300 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">View notifications</span>
        <Bell className="h-6 w-6" aria-hidden="true" />
        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-zinc-950"></span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-zinc-900 shadow-lg ring-1 ring-white/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white">Notifications</h3>
            <button className="text-xs text-indigo-400 hover:text-indigo-300">Mark all as read</button>
          </div>
          <div className="py-2 px-4 max-h-64 overflow-y-auto">
            <div className="text-sm text-zinc-400 text-center py-4">
              <Bell className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
              You&apos;re all caught up!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
