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
      
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="font-display text-lg font-bold leading-6 text-white">Profile</h3>
          <p className="mt-1 text-sm text-gray-500">Update your personal information.</p>
        </div>
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5"><Settings className="h-9 w-9 text-[#00f2ff]" /></div>
          <h3 className="mt-6 font-display text-xl font-bold text-white">Settings Coming Soon</h3>
          <p className="mt-2 text-sm text-gray-500">We are currently building this section.</p>
        </div>
      </div>
    </div>
  );
}
