import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Building2, Plus } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organizations",
};

export default function OrganizationsPage() {
  return (
    <div>
      <PageHeader 
        title="Organizations" 
        description="Manage your organizations, team members, and billing details."
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#bc13fe] to-[#00f2ff] px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(188,19,254,0.3)] transition hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </button>
      </PageHeader>
      <EmptyState 
        icon={Building2}
        title="No organizations"
        description="You don't belong to any organizations yet. Create one to collaborate with your team."
      />
    </div>
  );
}
