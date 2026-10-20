// Sentinel AI • Offscreen Audio Engine
// Dedicated background audio synthesis for critical cyber threat alerts (90+ risk score)

function playEmergencySiren() {
  try {
    const audio = new Audio("alarm.wav");
    audio.volume = 1.0;

    audio.play()
      .then(() => {
        console.log("[Sentinel] Emergency threat alarm playing in offscreen document.");
      })
      .catch((err) => {
        console.warn("[Sentinel] HTML audio element failed, fallback to Web Audio:", err);
        fallbackWebAudio();
      });

    // Close offscreen document when audio finishes so next alert creates fresh document
    audio.onended = () => {
      try { window.close(); } catch (e) {}
    };

    setTimeout(() => {
      try { window.close(); } catch (e) {}
    }, 2200);
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
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

// 1. Immediately play on document load
playEmergencySiren();

// 2. Also listen for runtime messages if document is already active
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen" && message.action === "PLAY_THREAT_ALARM") {
    playEmergencySiren();
    sendResponse({ success: true });
  }
});
