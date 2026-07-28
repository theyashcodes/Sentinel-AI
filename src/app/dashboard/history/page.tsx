import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { History } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan History",
};

export default function HistoryPage() {
  return (
    <div>
      <PageHeader 
        title="Scan History" 
        description="View and filter all your previous scans."
      />
      <EmptyState 
        icon={History}
        title="No scan history"
        description="You haven't run any scans yet. Run your first scan to see the history."
      />
    </div>
  );
}
