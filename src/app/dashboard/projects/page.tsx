import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FolderGit2, Plus } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader 
        title="Projects" 
        description="Manage your projects and their associated scans and settings."
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#bc13fe] to-[#00f2ff] px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(188,19,254,0.3)] transition hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </PageHeader>
      <EmptyState 
        icon={FolderGit2}
        title="No projects found"
        description="Get started by creating a new project to organize your scans."
      />
    </div>
  );
}
