import { PageHeader } from "@/components/dashboard/PageHeader";
import { VoiceForensicsView } from "@/components/forensics/VoiceForensicsView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Voice Clone & Deepfake Detector | Sentinel AI",
  description: "Detect synthetic neural voice clones, ElevenLabs TTS, RVC voice conversion models, biological pitch micro-jitter anomalies, and neural vocoder spectral cutoffs.",
};

export default function VoiceForensicsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHeader
        title="AI Voice Clone & Deepfake Detector"
        description="Verify audio recordings, WhatsApp voice notes, and phone call clips against neural vocoders, synthetic pitch flatness, and high-frequency brickwall artifacts."
      />

      <VoiceForensicsView />
    </div>
  );
}
