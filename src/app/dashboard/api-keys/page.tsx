import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Key, Plus } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Keys",
};

export default function ApiKeysPage() {
  return (
    <div>
      <PageHeader 
        title="API Keys" 
        description="Manage API keys to authenticate your requests to the Sentinel AI API."
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#bc13fe] to-[#00f2ff] px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(188,19,254,0.3)] transition hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </button>
      </PageHeader>
      <EmptyState 
        icon={Key}
        title="No API keys"
        description="Create your first API key to start integrating Sentinel AI into your applications."
      />
    </div>
  );
}
