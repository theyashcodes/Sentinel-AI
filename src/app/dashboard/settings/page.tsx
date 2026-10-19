import { PageHeader } from "@/components/dashboard/PageHeader";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings & Appearance",
  description: "Configure dashboard themes, interface appearance, and security policies.",
};

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="Settings & Appearance"
        description="Configure dashboard theme (Void Dark Mode or Quantum Day Mode), security policies, and cluster telemetry."
      />

      <SettingsView />
    </div>
  );
}
