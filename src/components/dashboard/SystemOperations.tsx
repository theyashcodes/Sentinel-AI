"use client";

import Link from "next/link";
import { Search, QrCode, GitFork, Fingerprint, Mic, Mail, Shield, History, ArrowRight } from "lucide-react";

const operations = [
  {
    id: "scan-protocol",
    title: "URL Threat Inspection",
    description: "Launch real-time ML sweep of URLs, domains, and DNS records.",
    href: "/dashboard/scanner/url",
    icon: Search,
  },
  {
    id: "qr-protocol",
    title: "QR Visual Sweeper",
    description: "Decode QR images to detect malicious quishing and redirection attacks.",
    href: "/dashboard/scanner/qr",
    icon: QrCode,
  },
  {
    id: "tracer-protocol",
    title: "Redirect & Homoglyph Tracer",
    description: "Unmask multi-hop shortlinks and detect Cyrillic/Unicode brand spoofing.",
    href: "/dashboard/tracer",
    icon: GitFork,
  },
  {
    id: "forensics-protocol",
    title: "AI Media Forensics",
    description: "Dissect C2PA Content Credentials, SynthID, and extract GenAI prompts.",
    href: "/dashboard/forensics",
    icon: Fingerprint,
  },
  {
    id: "voice-protocol",
    title: "AI Voice Clone Detector",
    description: "Detect synthetic voices, ElevenLabs/RVC deepfakes, and pitch micro-jitter anomalies.",
    href: "/dashboard/voice-forensics",
    icon: Mic,
  },
  {
    id: "email-protocol",
    title: "Email Phishing Dissector",
    description: "Analyze .eml headers to unmask spoofed senders, failed SPF/DKIM, and relay hops.",
    href: "/dashboard/email-audit",
    icon: Mail,
  },
  {
    id: "extension-protocol",
    title: "Browser Shield Extension",
    description: "Install Chrome real-time tab protector with dynamic badges & alerts.",
    href: "/dashboard/extension",
    icon: Shield,
  },
  {
    id: "history-engine",
    title: "Inspection History",
    description: "Review complete database audit logs, verdicts, and target telemetry.",
    href: "/dashboard/history",
    icon: History,
  },
];

const panelStyle: React.CSSProperties = {
  backgroundColor: "var(--panel-card)",
  border: "1px solid var(--panel-card-border)",
  borderRadius: 0,
  boxShadow: "none",
  padding: "1.5rem",
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

export function SystemOperations() {
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--hair-06)" }}>
        <span className="label" style={{ color: "var(--ink)" }}>Security Operations & Tools</span>
        <Link href="/dashboard/tracer" className="btn-ghost" style={{ padding: "0.25rem 0.75rem", fontSize: "10px" }}>
          Launch Tracer
        </Link>
      </div>

      {/* Real working op sub-panels in a grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1px",
          backgroundColor: "var(--grid-gap-color)",
          flex: 1,
        }}
      >
        {operations.map((op) => (
          <Link
            key={op.id}
            href={op.href}
            style={{
              backgroundColor: "var(--panel-card)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              textDecoration: "none",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--panel-card-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--panel-card)"; }}
          >
            <op.icon style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)", margin: 0, marginBottom: "0.25rem" }}>{op.title}</p>
              <p style={{ fontSize: "12px", fontWeight: 300, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{op.description}</p>
            </div>
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
              <ArrowRight style={{ width: "12px", height: "12px", color: "var(--muted)" }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
