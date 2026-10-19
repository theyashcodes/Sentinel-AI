import { PageHeader } from "@/components/dashboard/PageHeader";
import { MediaForensicsView } from "@/components/forensics/MediaForensicsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Media Forensics & C2PA Dissector",
  description: "Cryptographic Content Credentials (C2PA) inspector, Google SynthID detector, and AI prompt parameter dissector.",
};

export default function ForensicsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="AI Media Forensics & Provenance Dissector"
        description="Verify whether images are genuine camera captures or AI-generated deepfakes by dissecting C2PA JUMBF manifests, SynthID watermarks, and hidden model parameters."
      />

      <MediaForensicsView />
    </div>
  );
}
