// Sentinel AI • Offscreen Audio Engine
// Dedicated background audio synthesis for critical cyber threat alerts (90+ risk score)

function playEmergencySiren() {
  try {
    const audio = document.getElementById("alarmAudio") || new Audio(chrome.runtime.getURL("alarm.wav"));
    audio.currentTime = 0;
    audio.volume = 1.0;
    
    audio.play()
      .then(() => {
        console.log("[Sentinel] Emergency threat alarm audio playing successfully.");
      })
      .catch((err) => {
        console.warn("[Sentinel] HTML audio element failed, fallback to Web Audio:", err);
        fallbackWebAudio();
      });
  } catch (err) {
    fallbackWebAudio();
  }
}

function fallbackWebAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

// 1. If document was opened with ?play=1, play immediately upon load!
const params = new URLSearchParams(window.location.search);
if (params.get("play") === "1") {
  playEmergencySiren();
}

// 2. Listen for runtime messages if document is already active
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen" && message.action === "PLAY_THREAT_ALARM") {
    playEmergencySiren();
    sendResponse({ success: true });
  }
});
