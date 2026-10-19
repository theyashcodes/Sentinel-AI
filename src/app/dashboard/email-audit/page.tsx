import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmailAuditView } from "@/components/email/EmailAuditView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phishing Email & Header Forensic Dissector",
  description: "Dissect RFC 822 email headers, unmask display name spoofing, and verify SPF, DKIM, and DMARC cryptographic seals.",
};

export default function EmailAuditPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="Phishing Email & Header Forensic Dissector"
        description="Analyze suspicious emails, fake bank notices, and CEO fraud. Upload .eml files or paste raw RFC 822 headers to expose spoofed display names, failed SPF/DKIM seals, and relay origin IPs."
      />

      <EmailAuditView />
    </div>
  );
}
