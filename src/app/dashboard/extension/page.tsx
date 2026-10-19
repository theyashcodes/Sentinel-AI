import { PageHeader } from "@/components/dashboard/PageHeader";
import { ExtensionManagementView } from "@/components/extension/ExtensionManagementView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browser Shield • Chrome Extension",
  description: "Real-time active tab security monitor, homoglyph unmasking, and desktop alert shield for Chrome, Brave, and Edge.",
};

export default function ExtensionPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="Browser Shield • Real-Time Chrome Extension"
        description="Integrate Sentinel AI directly into Google Chrome, Brave, and Microsoft Edge for instant tab threat analysis, dynamic toolbar badges, and desktop phishing alerts."
      />

      <ExtensionManagementView />
    </div>
  );
}
