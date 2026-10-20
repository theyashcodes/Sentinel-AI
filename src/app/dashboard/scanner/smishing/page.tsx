import { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SmishingForensicsView } from "@/components/smishing/SmishingForensicsView";

export const metadata: Metadata = {
  title: "Smishing & Phone Forensics • WhatsApp & SMS Fraud",
  description:
    "AI-powered multi-vector SMS and WhatsApp fraud detector. Psychological urgency scoring, rogue APK sniffer, and Reverse Phone Number Telecom Intelligence.",
};

export default function SmishingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Smishing & Phone Forensics"
        description="Inspect suspicious WhatsApp and SMS messages for psychological fear manipulation, rogue APK downloads, and perform reverse phone number carrier & caller-ID intelligence."
      />
      <SmishingForensicsView />
    </div>
  );
}
