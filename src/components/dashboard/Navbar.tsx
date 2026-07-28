"use client";

import { Menu } from "lucide-react";
import { UserDropdown } from "./UserDropdown";
import { NotificationMenu } from "./NotificationMenu";

interface NavbarProps {
  setSidebarOpen: (open: boolean) => void;
}

export function Navbar({ setSidebarOpen }: NavbarProps) {
  return (
    <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-zinc-400 hover:text-zinc-300 md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1"></div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          
          <NotificationMenu />
          
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-zinc-800" aria-hidden="true" />
          
          <UserDropdown />
          
        </div>
      </div>
    </div>
  );
}
