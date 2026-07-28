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
          className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
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
