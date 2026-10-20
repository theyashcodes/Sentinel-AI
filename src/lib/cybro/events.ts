export interface ScanEventDetail {
  tool: "tracer" | "forensics" | "email" | "scanner" | "qr" | "voice";
  toolName?: string;
  target: string;
  isThreat: boolean;
  threatLevel?: "clean" | "suspicious" | "malicious";
  summary: string;
  findings?: string[];
  rawResult?: any;
}

/**
 * Dispatch an event whenever any Sentinel AI tool completes a real-time scan.
 * CyBro listens to this to update facial mood and generate optimal safe actions via Groq.
 */
export function notifyCyBroScanComplete(detail: ScanEventDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ScanEventDetail>("sentinel_scan_completed", { detail })
    );
  }
}
