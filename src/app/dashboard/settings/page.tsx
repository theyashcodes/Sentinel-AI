import { PageHeader } from "@/components/dashboard/PageHeader";
import { Settings } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Settings" 
        description="Manage your account settings and preferences."
      />
      
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 px-6 py-5">
          <h3 className="text-base font-semibold leading-6 text-white">Profile</h3>
          <p className="mt-1 text-sm text-zinc-400">Update your personal information.</p>
        </div>
        <div className="px-6 py-10 text-center">
          <Settings className="mx-auto h-12 w-12 text-zinc-500" />
          <h3 className="mt-2 text-sm font-semibold text-white">Settings Coming Soon</h3>
          <p className="mt-1 text-sm text-zinc-400">We are currently building this section.</p>
        </div>
      </div>
    </div>
  );
}
