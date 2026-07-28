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
          className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
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
