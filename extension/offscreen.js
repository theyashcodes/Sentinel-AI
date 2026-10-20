// Sentinel AI • Offscreen Audio Engine
// Dedicated background audio synthesis for critical cyber threat alerts (90+ risk score)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen" && message.action === "PLAY_THREAT_ALARM") {
    playEmergencySiren();
    sendResponse({ success: true });
  }
});

function playEmergencySiren() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const playPulse = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.frequency.linearRampToValueAtTime(freq * 0.72, ctx.currentTime + start + duration);

      // High, audible volume for urgent warning
      gain.gain.setValueAtTime(0.38, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // 4-pulse rapid cyber security siren
    playPulse(1020, 0.0, 0.18);
    playPulse(760, 0.20, 0.18);
    playPulse(1020, 0.40, 0.18);
    playPulse(760, 0.60, 0.25);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch (err) {
    console.error("[Sentinel Offscreen Audio Error]", err);
  }
}
