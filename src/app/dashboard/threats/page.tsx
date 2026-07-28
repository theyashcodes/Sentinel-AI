import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ShieldAlert } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Threat Intelligence",
};

export default function ThreatsPage() {
  return (
    <div>
      <PageHeader 
        title="Threat Intelligence" 
        description="Explore detected threats, campaigns, and indicators of compromise (IoC)."
      />
      <EmptyState 
        icon={ShieldAlert}
        title="No active threats"
        description="We couldn't find any active threats associated with your account."
      />
    </div>
  );
}
