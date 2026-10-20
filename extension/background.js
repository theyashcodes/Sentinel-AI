// Sentinel AI • Background Service Worker (Manifest V3)
const API_URL = "http://localhost:3000/api/extension/scan";
const scanCache = new Map();

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

// Perform scan on tab URL
async function scanTab(tabId, url) {
  if (!url || !url.startsWith("http")) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  // Check cache (valid for 10 minutes)
  const cached = scanCache.get(url);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    updateBadge(tabId, cached.data.verdict, cached.data.riskScore);
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

    // If critical threat, trigger desktop notification and high-risk alarm
    if (data.verdict === "MALICIOUS" || data.riskScore >= 90 || (data.impersonation && data.impersonation.detected)) {
      const brandMsg = data.impersonation?.targetBrand
        ? `Brand spoofing target: ${data.impersonation.targetBrand}.`
        : "";

      chrome.notifications.create(`threat-${Date.now()}`, {
        type: "basic",
        iconUrl: "icons/icon-128.png",
        title: "⚠️ Sentinel AI • Phishing Threat Blocked",
        message: `High risk threat detected on ${data.domain}! Risk: ${data.riskScore}/100. ${brandMsg}`,
        priority: 2,
      });

      // Play Alert Siren Sound and Inject Warning HUD on 90+ threat score
      if (data.riskScore >= 90 || data.verdict === "MALICIOUS") {
        chrome.storage.local.get({ alarmSoundEnabled: true }, (prefs) => {
          if (prefs.alarmSoundEnabled) {
            chrome.scripting.executeScript({
              target: { tabId },
              func: triggerThreatAudioAndHUD,
              args: [data.riskScore, data.domain, data.impersonation?.targetBrand || null],
            }).catch((e) => console.warn("[Sentinel] Could not inject alarm into tab:", e));
          }
        });
      }
    }
  } catch (err) {
    console.error("[Sentinel Extension Background Error]", err);
  }
}

// Function injected into webpage tab to play cyber threat siren and display HUD banner
function triggerThreatAudioAndHUD(riskScore, domain, targetBrand) {
  // 1. Play Urgent Cyber Security Siren using Web Audio API
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();

      const playAlertBeep = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        osc.frequency.linearRampToValueAtTime(freq * 0.7, ctx.currentTime + start + duration);

        gain.gain.setValueAtTime(0.22, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // 4-pulse rapid emergency alarm siren
      playAlertBeep(960, 0.0, 0.16);
      playAlertBeep(720, 0.18, 0.16);
      playAlertBeep(960, 0.36, 0.16);
      playAlertBeep(720, 0.54, 0.22);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 1200);
    }
  } catch (err) {
    console.warn("[Sentinel AI] Audio playback prevented:", err);
  }

  // 2. Inject Visual Warning Banner HUD into the page
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

// Listen for test alarm messages from extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "TEST_ALARM_SOUND") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: triggerThreatAudioAndHUD,
          args: [95, "suspicious-phish-portal.xyz", "PayPal Impersonation"],
        }).catch((e) => console.warn("[Sentinel] Test alarm script error:", e));
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
    return true;
  }
});

// Listen for tab navigation updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    scanTab(tabId, tab.url);
  }
});

// Listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      scanTab(tab.id, tab.url);
    }
  } catch {
    // tab closed or unavailable
  }
});
