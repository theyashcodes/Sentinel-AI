"use client";

import { useState } from "react";
import {
  Shield,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  Download,
  AlertTriangle,
  Bell,
  Activity,
  Layers,
  ArrowRight,
  FolderArchive,
} from "lucide-react";

export function ExtensionManagementView() {
  const [copied, setCopied] = useState(false);
  const localRelativePath = "Sentinel-AI/extension";

  const copyPath = () => {
    navigator.clipboard.writeText(localRelativePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px" }}>
      {/* ── Status & Banner Panel ── */}
      <div
        className="void-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Shield style={{ width: "20px", height: "20px", color: "var(--accent)" }} />
            <span className="label" style={{ color: "var(--ink)", fontWeight: 700, fontSize: "15px" }}>
              Sentinel AI • Real-Time Chrome Extension Shield
            </span>
          </div>
          <span
            className="chip"
            style={{
              color: "var(--ok)",
              borderColor: "rgba(21,128,61,0.35)",
              backgroundColor: "rgba(21,128,61,0.06)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--ok)", display: "inline-block" }}></span>
            API ENGINE ONLINE (PORT 3000)
          </span>
        </div>

        <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0, lineHeight: 1.6, fontWeight: 400 }}>
          Bring Sentinel AI’s neural threat engine directly into your daily web browsing. As you surf the web, the extension monitors active tabs in the background, unmasks Cyrillic homoglyphs in real time, changes icon badge colors (Safe / Warn / Danger), and fires desktop notifications if you land on a phishing clone.
        </p>

        {/* ── Universal Quick Download Button Banner ── */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "var(--ground-secondary)",
            border: "1px solid var(--hair-15)",
            borderLeft: "4px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FolderArchive style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
              Works on Any Device (Windows, Mac, Linux)
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Download the ready-to-install ZIP package. Unzip it anywhere on your computer and load it directly into Chrome.
            </p>
          </div>

          <a
            href="/sentinel-ai-extension.zip"
            download="sentinel-ai-extension.zip"
            className="btn-accent"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              textDecoration: "none",
              height: "40px",
              padding: "0 1.25rem",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            <Download style={{ width: "15px", height: "15px" }} />
            Download Extension (.zip)
          </a>
        </div>

        {/* ── 3-Step Installation Box ── */}
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "var(--ground-secondary)",
            border: "1px solid var(--hair-10)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Globe style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
              How to Install in Chrome, Brave, or Edge (Manifest V3)
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "13px", color: "var(--ink)", lineHeight: 1.6 }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "var(--panel-card)",
                  border: "1px solid var(--hair-15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  flexShrink: 0,
                  color: "var(--accent)",
                }}
              >
                1
              </span>
              <div>
                Open a new tab and navigate to: <code style={{ backgroundColor: "var(--panel-card)", padding: "2px 6px", border: "1px solid var(--hair-10)", fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>chrome://extensions/</code>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "var(--panel-card)",
                  border: "1px solid var(--hair-15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  flexShrink: 0,
                  color: "var(--accent)",
                }}
              >
                2
              </span>
              <div>
                Turn on the <strong>Developer mode</strong> toggle switch in the top-right corner.
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "var(--panel-card)",
                  border: "1px solid var(--hair-15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  flexShrink: 0,
                  color: "var(--accent)",
                }}
              >
                3
              </span>
              <div style={{ flex: 1 }}>
                Click <strong>Load unpacked</strong> button (top left), and select the unzipped <code>extension</code> folder:
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "var(--panel-card)",
                    border: "1px solid var(--hair-10)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "var(--ink)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ flex: 1, minWidth: "220px", wordBreak: "break-all" }}>
                    Select the <strong>&quot;extension&quot;</strong> folder (inside your downloaded zip or local repo: <code>extension/</code>)
                  </span>
                  <button
                    type="button"
                    onClick={copyPath}
                    className="btn-ghost"
                    style={{ height: "30px", padding: "0 0.75rem", fontSize: "11px", fontWeight: 600 }}
                  >
                    {copied ? (
                      <>
                        <Check style={{ width: "12px", height: "12px", marginRight: "4px" }} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy style={{ width: "12px", height: "12px", marginRight: "4px" }} />
                        Copy Folder Name
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Capabilities Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {/* Real-time background sweep */}
        <div
          className="void-panel"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity style={{ width: "18px", height: "18px", color: "var(--accent)" }} />
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
              Zero-Click Background Sweeper
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
            Whenever you navigate to a new site, the background service worker automatically queries Sentinel AI. Zero copy-pasting required.
          </p>
        </div>

        {/* Dynamic Icon Badge */}
        <div
          className="void-panel"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers style={{ width: "18px", height: "18px", color: "var(--ok)" }} />
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
              Dynamic Icon Badge Indicator
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
            Displays 🟢 <strong style={{ color: "var(--ok)" }}>✓ Safe</strong>, 🟡 <strong style={{ color: "var(--warn)" }}>Suspicious</strong>, or 🔴 <strong style={{ color: "var(--crit)" }}>! Danger</strong> right on the browser toolbar icon.
          </p>
        </div>

        {/* Chrome Push Notifications */}
        <div
          className="void-panel"
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Bell style={{ width: "18px", height: "18px", color: "var(--crit)" }} />
            <span className="label" style={{ color: "var(--ink)", fontWeight: 600 }}>
              Instant Threat Desktop Alerts
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
            If you click a phishing link or visit a spoofed domain (like Cyrillic <code>pаypal.com</code>), Chrome immediately fires a native system alert.
          </p>
        </div>
      </div>
    </div>
  );
}
