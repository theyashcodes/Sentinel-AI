// Sentinel AI • Background Service Worker (Manifest V3)
const API_URL = "http://localhost:3000/api/extension/scan";
const scanCache = new Map();
let lastAlarmTimestamp = 0;
let creatingOffscreenDoc = null;

// Helper to set badge
function updateBadge(tabId, verdict, score) {
  if (verdict === "MALICIOUS") {
    chrome.action.setBadgeText({ tabId, text: "!" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#DC2626" });
  } else if (verdict === "SUSPICIOUS") {
    chrome.action.setBadgeText({ tabId, text: `${score}` });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#D97706" });
  } else if (verdict === "SAFE") {
    chrome.action.setBadgeText({ tabId, text: "✓" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#16A34A" });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
}

// Ensure offscreen document exists for background audio playback
async function playThreatAlarmSound() {
  const now = Date.now();
  // 2.5-second cooldown to prevent overlapping audio loops
  if (now - lastAlarmTimestamp < 2500) {
    return;
  }
  lastAlarmTimestamp = now;

  try {
    const prefs = await chrome.storage.local.get({ alarmSoundEnabled: true });
    if (!prefs.alarmSoundEnabled) return;

    const hasDoc = await chrome.offscreen.hasDocument();
    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: `offscreen.html?play=1&t=${Date.now()}`,
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Synthesize critical threat siren alarm for dangerous phishing sites",
      });
    } else {
      chrome.runtime.sendMessage({
        target: "offscreen",
        action: "PLAY_THREAT_ALARM",
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[Sentinel Audio Player]", err);
  }
}

// Perform scan on tab URL
async function scanTab(tabId, url) {
  if (!url || !url.startsWith("http")) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  // Check cache (valid for 5 minutes)
  const cached = scanCache.get(url);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    updateBadge(tabId, cached.data.verdict, cached.data.riskScore);
    if (cached.data.riskScore >= 90 || cached.data.verdict === "MALICIOUS") {
      playThreatAlarmSound();
    }
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) return;

    const data = await res.json();
    scanCache.set(url, { data, timestamp: Date.now() });

    updateBadge(tabId, data.verdict, data.riskScore);

    // If critical threat (90+ risk score or brand spoofing)
    if (data.verdict === "MALICIOUS" || data.riskScore >= 90 || (data.impersonation && data.impersonation.detected)) {
      const brandMsg = data.impersonation?.targetBrand
        ? `Brand spoofing target: ${data.impersonation.targetBrand}.`
        : "";

      chrome.notifications.create(`threat-${Date.now()}`, {
        type: "basic",
        iconUrl: "icons/icon-128.png",
        title: "⚠️ Sentinel AI • Phishing Threat Blocked",
        message: `Critical threat on ${data.domain}! Risk: ${data.riskScore}/100. ${brandMsg}`,
        priority: 2,
      });

      // Play background emergency alarm siren immediately
      if (data.riskScore >= 90 || data.verdict === "MALICIOUS") {
        playThreatAlarmSound();

        // Also attempt to inject visual warning HUD into page if accessible
        chrome.scripting.executeScript({
          target: { tabId },
          func: injectVisualThreatHUD,
          args: [data.riskScore, data.domain, data.impersonation?.targetBrand || null],
        }).catch(() => {
          // Ignore if page is internal error or unreachable
        });
      }
    }
  } catch (err) {
    console.error("[Sentinel Extension Background Error]", err);
  }
}

// Function injected into accessible webpage tab to display warning HUD banner
function injectVisualThreatHUD(riskScore, domain, targetBrand) {
  if (document.getElementById("sentinel-threat-hud")) return;

  const hud = document.createElement("div");
  hud.id = "sentinel-threat-hud";
  hud.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 2147483647 !important;
    background: #0f172a !important;
    border-bottom: 3px solid #ef4444 !important;
    color: #ffffff !important;
    padding: 12px 20px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 13px !important;
    box-shadow: 0 10px 35px rgba(0,0,0,0.85) !important;
  `;

  const brandText = targetBrand ? ` • Brand Spoof of <strong>${targetBrand}</strong>` : "";

  hud.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;min-width:0;">
      <div style="width:36px;height:36px;border-radius:8px;background:rgba(239,68,68,0.2);border:1px solid #ef4444;display:flex;align-items:center;justify-content:center;color:#ef4444;font-size:18px;flex-shrink:0;">
        ⚠️
      </div>
      <div style="line-height:1.4;">
        <div style="font-weight:700;color:#ef4444;letter-spacing:0.04em;text-transform:uppercase;font-size:11px;">
          Sentinel AI Defense • Critical Cyber Threat Detected (${riskScore}/100)
        </div>
        <div style="color:#f1f5f9;font-size:12px;">
          Hostile Phishing Target: <strong>${domain}</strong>${brandText}. Do NOT enter credentials or financial details!
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
      <button id="sentinel-leave-btn" style="background:#ef4444;color:#ffffff;border:none;padding:6px 14px;border-radius:4px;font-weight:600;font-size:12px;cursor:pointer;">
        Leave This Site
      </button>
      <button id="sentinel-dismiss-btn" style="background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.2);padding:6px 12px;border-radius:4px;font-size:12px;cursor:pointer;">
        Dismiss
      </button>
    </div>
  `;

  document.body.prepend(hud);

  document.getElementById("sentinel-leave-btn")?.addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });

  document.getElementById("sentinel-dismiss-btn")?.addEventListener("click", () => {
    hud.remove();
  });
}

// Listen for messages from popup or elsewhere
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "TRIGGER_ALARM") {
    playThreatAlarmSound();
    sendResponse({ success: true });
    return true;
  }
});

// Scan tabs as soon as navigation begins or completes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const targetUrl = changeInfo.url || tab.url;
  if (targetUrl && targetUrl.startsWith("http")) {
    scanTab(tabId, targetUrl);
  }
});

// Scan active tab when user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url && tab.url.startsWith("http")) {
      scanTab(tab.id, tab.url);
    }
  } catch {
    // tab closed or unavailable
  }
});
