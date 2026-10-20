// Sentinel AI • Popup Controller
const PROD_BASE_URL = "https://sentinel-ai-omega-two.vercel.app";
const LOCAL_BASE_URL = "http://localhost:3000";
let activeBaseUrl = PROD_BASE_URL;

// Auto-detect whether local development server or 24/7 cloud server should be used
async function resolveServerBase() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 450);
    const check = await fetch(`${LOCAL_BASE_URL}/api/extension/scan`, {
      method: "OPTIONS",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (check.ok) {
      activeBaseUrl = LOCAL_BASE_URL;
      return activeBaseUrl;
    }
  } catch (e) {
    // Localhost offline (friend's laptop, remote browser)
  }
  activeBaseUrl = PROD_BASE_URL;
  return activeBaseUrl;
}

document.addEventListener("DOMContentLoaded", async () => {
  const contentEl = document.getElementById("content");
  const alarmSoundToggle = document.getElementById("alarmSoundToggle");

  // Load alarm sound preference
  if (alarmSoundToggle && chrome.storage?.local) {
    chrome.storage.local.get({ alarmSoundEnabled: true }, (prefs) => {
      alarmSoundToggle.checked = prefs.alarmSoundEnabled;
    });

    alarmSoundToggle.addEventListener("change", () => {
      chrome.storage.local.set({ alarmSoundEnabled: alarmSoundToggle.checked });
    });
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      contentEl.innerHTML = `<div class="loading-state">No active page URL detected.</div>`;
      return;
    }

    const currentUrl = tab.url;

    // Handle internal browser tabs
    if (!currentUrl.startsWith("http")) {
      contentEl.innerHTML = `
        <div class="card">
          <div class="domain-title">Browser Protected Tab</div>
          <div class="target-url">${currentUrl}</div>
          <div class="score-row">
            <div>
              <div style="font-size: 10px; color: #94A3B8;">RISK LEVEL</div>
              <div class="score-val" style="color: #10B981;">0<span style="font-size: 14px; color: #64748B;">/100</span></div>
            </div>
            <div class="verdict-tag" style="color: #10B981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);">
              INTERNAL SAFE
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Resolve server endpoint (cloud vs local)
    const base = await resolveServerBase();
    let res;
    try {
      res = await fetch(`${base}/api/extension/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl }),
      });
    } catch (netErr) {
      // If local dev failed, fallback to live cloud server
      activeBaseUrl = PROD_BASE_URL;
      res = await fetch(`${PROD_BASE_URL}/api/extension/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl }),
      });
    }

    if (!res.ok) {
      throw new Error(`Sentinel API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    renderResult(contentEl, data, currentUrl, activeBaseUrl);

    // Auto-trigger alarm siren if critical threat (90+)
    if (data.riskScore >= 90 || data.verdict === "MALICIOUS") {
      // 1. Play directly inside popup (guaranteed user gesture execution)
      chrome.storage.local.get({ alarmSoundEnabled: true }, (prefs) => {
        if (prefs.alarmSoundEnabled) {
          try {
            const popupAudio = new Audio(chrome.runtime.getURL("alarm.wav"));
            popupAudio.volume = 1.0;
            popupAudio.play().catch((e) => console.warn("[Sentinel Popup Audio]", e));
          } catch (e) {}
        }
      });

      // 2. Also signal background service worker
      chrome.runtime.sendMessage({ action: "TRIGGER_ALARM" }).catch(() => {});
    }
  } catch (err) {
    contentEl.innerHTML = `
      <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
        <div style="color: #EF4444; font-weight: 600; font-size: 12px; margin-bottom: 6px;">
          Sentinel AI Server Offline
        </div>
        <div style="font-size: 11px; color: #94A3B8; line-height: 1.4;">
          Could not connect to Cloud or Localhost backend. Please check internet connection.
        </div>
        <a href="${PROD_BASE_URL}/dashboard" target="_blank" class="btn" style="margin-top: 12px;">
          Open Sentinel Cloud Dashboard
        </a>
      </div>
    `;
  }
});

function renderResult(container, data, fullUrl, baseUrl) {
  const isMalicious = data.verdict === "MALICIOUS";
  const isSuspicious = data.verdict === "SUSPICIOUS";

  let statusColor = "#10B981";
  let statusBg = "rgba(16, 185, 129, 0.1)";
  let statusBorder = "rgba(16, 185, 129, 0.3)";
  let verdictText = "VERIFIED SAFE";

  if (isMalicious) {
    statusColor = "#EF4444";
    statusBg = "rgba(239, 68, 68, 0.1)";
    statusBorder = "rgba(239, 68, 68, 0.3)";
    verdictText = "CRITICAL THREAT";
  } else if (isSuspicious) {
    statusColor = "#F59E0B";
    statusBg = "rgba(245, 158, 11, 0.1)";
    statusBorder = "rgba(245, 158, 11, 0.3)";
    verdictText = "SUSPICIOUS TARGET";
  }

  let alertBanner = "";
  if (data.impersonation && data.impersonation.detected) {
    alertBanner = `
      <div class="alert-banner">
        <strong>⚠️ Brand Spoofing Detected:</strong> This domain is attempting to visually impersonate <strong>${data.impersonation.targetBrand}</strong> using deceptive homoglyphs or subdomains.
      </div>
    `;
  }

  let threatItems = "";
  if (data.threats && data.threats.length > 0) {
    threatItems = `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
        <div style="font-size: 10px; font-weight: 600; color: #94A3B8; margin-bottom: 4px;">DETECTED SIGNALS</div>
        <ul class="threat-list">
          ${data.threats.map((t) => `<li class="threat-item"><span style="color: ${statusColor};">▸</span> ${t}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  container.innerHTML = `
    ${alertBanner}

    <div class="card">
      <div class="domain-title">${data.domain}</div>
      <div class="target-url">${fullUrl.length > 60 ? fullUrl.substring(0, 60) + "..." : fullUrl}</div>

      <div class="score-row">
        <div>
          <div style="font-size: 10px; color: #94A3B8;">THREAT RISK SCORE</div>
          <div class="score-val" style="color: ${statusColor};">${data.riskScore}<span style="font-size: 14px; color: #64748B;">/100</span></div>
        </div>
        <div class="verdict-tag" style="color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusBorder};">
          ${verdictText}
        </div>
      </div>

      ${threatItems}
    </div>

    <a href="${baseUrl}/dashboard/tracer" target="_blank" class="btn">
      Trace Redirects & Hop Chain
    </a>

    <a href="${baseUrl}/dashboard/scanner/url" target="_blank" class="btn btn-secondary">
      Launch Deep ML Forensic Audit
    </a>
  `;
}
