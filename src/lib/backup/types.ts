/**
 * Sentinel AI Data Resilience & Disaster Recovery Schema
 */

export interface SentinelBackupMetadata {
  version: "1.0.0";
  generator: "Sentinel-AI Enterprise Recovery Engine";
  exportedAt: string;
  userId: string;
  userEmail: string;
  checksum: string;
  counts: {
    scans: number;
    communityReports: number;
    lessonProgress: number;
    notifications: number;
  };
}

export interface BackupScanItem {
  id?: string;
  type: string; // "URL" | "QR" | "MESSAGE" | "SCREENSHOT" | "FILE"
  payload: string | null;
  payloadHash: string;
  status: string;
  riskLevel: string | null;
  evidenceMetadata?: unknown;
  createdAt: string;
  result?: {
    aiProvider?: string | null;
    aiModel?: string | null;
    confidenceScore?: number | null;
    threatCategory?: string | null;
    analysisMetadata?: unknown;
    inferenceTimeMs?: number | null;
  } | null;
}

export interface BackupReportItem {
  id?: string;
  title: string;
  description: string;
  status: string;
  upvotes: number;
  createdAt: string;
}

export interface BackupProgressItem {
  courseId: string;
  lessonId: string;
  score: number;
  completedAt: string;
}

export interface BackupNotificationItem {
  type: string;
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface SentinelBackupPayload {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    reputationScore: number;
    createdAt: string;
  };
  scans: BackupScanItem[];
  communityReports: BackupReportItem[];
  lessonProgress: BackupProgressItem[];
  notifications: BackupNotificationItem[];
  clientPreferences?: {
    theme?: string;
    showCyBro?: boolean;
    cybroSkin?: string;
    particlesEnabled?: boolean;
    telemetryEnabled?: boolean;
    autoQuarantine?: boolean;
    sensitivity?: string;
    soundAlerts?: boolean;
    [key: string]: unknown;
  };
}

export interface SentinelBackupArchive {
  metadata: SentinelBackupMetadata;
  data: SentinelBackupPayload;
}

export interface RestoreReport {
  success: boolean;
  timestamp: string;
  counts: {
    restoredScans: number;
    skippedScans: number;
    restoredReports: number;
    restoredProgress: number;
    restoredNotifications: number;
  };
  clientPreferences?: SentinelBackupPayload["clientPreferences"];
  message: string;
}

export interface CloudRestorePoint {
  id: string;
  label: string;
  createdAt: string;
  counts: {
    scans: number;
    reports: number;
    progress: number;
  };
  checksum: string;
  sizeBytes: number;
}
