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

    // If critical threat, trigger desktop notification
    if (data.verdict === "MALICIOUS" || (data.impersonation && data.impersonation.detected)) {
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
    }
  } catch (err) {
    console.error("[Sentinel Extension Background Error]", err);
  }
}

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
