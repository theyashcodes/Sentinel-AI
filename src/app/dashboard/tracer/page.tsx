import { PageHeader } from "@/components/dashboard/PageHeader";
import { RedirectTracerView } from "@/components/tracer/RedirectTracerView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redirect Tracer & URL Unmasker",
  description: "Deep hop-by-hop HTTP redirect tracer, shortlink unmasker, and homoglyph brand impersonation detector.",
};

export default function TracerPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="Redirect Tracer & URL Unmasker"
        description="Inspect multi-hop redirect chains, uncover hidden phishing destinations, and expose visual homoglyph character spoofing."
      />

      <RedirectTracerView />
    </div>
  );
}
