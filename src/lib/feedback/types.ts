export type FeedbackTool =
  | "media-forensics"
  | "voice-forensics"
  | "url-scanner"
  | "qr-scanner"
  | "general";

export type GroundTruthVerdict =
  | "GENUINE_SAFE"
  | "MALICIOUS_SYNTHETIC"
  | "UNSURE";

export interface ScanFeedbackPayload {
  scanId: string;
  tool: FeedbackTool;
  target: string;
  rating: number; // 1 to 5
  groundTruth: GroundTruthVerdict;
  tags: string[];
  comment?: string;
  originalVerdict?: string;
  originalRiskScore?: number;
  extractedFeatures?: Record<string, unknown>;
}

export interface StoredFeedback extends ScanFeedbackPayload {
  id: string;
  userId?: string;
  createdAt: string;
  isLocked: true;
}
