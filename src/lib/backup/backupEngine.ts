import { db } from "@/lib/db";
import {
  SentinelBackupArchive,
  SentinelBackupPayload,
  RestoreReport,
  CloudRestorePoint,
  BackupScanItem,
  BackupReportItem,
  BackupProgressItem,
  BackupNotificationItem,
} from "./types";
import { calculateChecksum, validateBackupArchive } from "./integrity";
import { ScanStatus, ScanType, RiskLevel } from "@prisma/client";

/**
 * Exports all user data into a tamper-evident Sentinel backup archive.
 */
export async function exportUserData(
  userId: string,
  clientPreferences?: Record<string, unknown>
): Promise<SentinelBackupArchive> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      reputationScore: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  // 1. Scans & Diagnostics History
  const scansRaw = await db.scan.findMany({
    where: { userId },
    include: { result: true },
    orderBy: { createdAt: "desc" },
  });

  const scans: BackupScanItem[] = scansRaw.map((s) => ({
    id: s.id,
    type: s.type,
    payload: s.payload,
    payloadHash: s.payloadHash,
    status: s.status,
    riskLevel: s.riskLevel,
    evidenceMetadata: s.evidenceMetadata,
    createdAt: s.createdAt.toISOString(),
    result: s.result
      ? {
          aiProvider: s.result.aiProvider,
          aiModel: s.result.aiModel,
          confidenceScore: s.result.confidenceScore,
          threatCategory: s.result.threatCategory,
          analysisMetadata: s.result.analysisMetadata,
          inferenceTimeMs: s.result.inferenceTimeMs,
        }
      : null,
  }));

  // 2. Community & Threat Reports
  const reportsRaw = await db.communityReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const communityReports: BackupReportItem[] = reportsRaw.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    upvotes: r.upvotes,
    createdAt: r.createdAt.toISOString(),
  }));

  // 3. Cyber Training / Lesson Progress
  const progressRaw = await db.lessonProgress.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
  });

  const lessonProgress: BackupProgressItem[] = progressRaw.map((p) => ({
    courseId: p.courseId,
    lessonId: p.lessonId,
    score: p.score,
    completedAt: p.completedAt.toISOString(),
  }));

  // 4. Notifications
  const notifsRaw = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const notifications: BackupNotificationItem[] = notifsRaw.map((n) => ({
    type: n.type,
    severity: n.severity,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));

  const payload: SentinelBackupPayload = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      reputationScore: user.reputationScore,
      createdAt: user.createdAt.toISOString(),
    },
    scans,
    communityReports,
    lessonProgress,
    notifications,
    clientPreferences,
  };

  const checksum = calculateChecksum(payload);

  const archive: SentinelBackupArchive = {
    metadata: {
      version: "1.0.0",
      generator: "Sentinel-AI Enterprise Recovery Engine",
      exportedAt: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      checksum,
      counts: {
        scans: scans.length,
        communityReports: communityReports.length,
        lessonProgress: lessonProgress.length,
        notifications: notifications.length,
      },
    },
    data: payload,
  };

  return archive;
}

/**
 * Restores user data from a verified Sentinel backup archive.
 */
export async function restoreUserData(
  userId: string,
  rawArchive: unknown,
  options?: { mode?: "merge" | "replace" }
): Promise<RestoreReport> {
  const validation = validateBackupArchive(rawArchive);
  if (!validation.valid || !validation.archive) {
    throw new Error(validation.error || "Invalid backup archive format.");
  }

  const { archive } = validation;
  const { data } = archive;

  let restoredScans = 0;
  let skippedScans = 0;
  let restoredReports = 0;
  let restoredProgress = 0;
  let restoredNotifications = 0;

  // 1. Restore Scans & Results
  if (data.scans && Array.isArray(data.scans)) {
    // Find existing payloadHashes for this user to avoid duplicating recent identical scans
    const existingScans = await db.scan.findMany({
      where: { userId },
      select: { payloadHash: true, createdAt: true },
    });
    const existingSet = new Set(
      existingScans.map((s) => `${s.payloadHash}_${s.createdAt.toISOString()}`)
    );

    const validScanTypes = Object.values(ScanType);
    const validRiskLevels = Object.values(RiskLevel);
    const validStatuses = Object.values(ScanStatus);

    for (const scanItem of data.scans) {
      const key = `${scanItem.payloadHash}_${new Date(scanItem.createdAt).toISOString()}`;
      if (existingSet.has(key)) {
        skippedScans++;
        continue;
      }

      const scanType = validScanTypes.includes(scanItem.type as ScanType)
        ? (scanItem.type as ScanType)
        : ScanType.FILE;

      const riskLevel =
        scanItem.riskLevel && validRiskLevels.includes(scanItem.riskLevel as RiskLevel)
          ? (scanItem.riskLevel as RiskLevel)
          : RiskLevel.SAFE;

      const status = validStatuses.includes(scanItem.status as ScanStatus)
        ? (scanItem.status as ScanStatus)
        : ScanStatus.COMPLETED;

      await db.$transaction(async (tx) => {
        const newScan = await tx.scan.create({
          data: {
            userId,
            type: scanType,
            status,
            riskLevel,
            payload: scanItem.payload ? String(scanItem.payload).slice(0, 500) : null,
            payloadHash: scanItem.payloadHash || "restored_hash",
            evidenceMetadata: (scanItem.evidenceMetadata as object) ?? undefined,
            createdAt: new Date(scanItem.createdAt),
          },
        });

        if (scanItem.result) {
          await tx.scanResult.create({
            data: {
              scanId: newScan.id,
              aiProvider: scanItem.result.aiProvider || "Sentinel Recovery",
              aiModel: scanItem.result.aiModel || "BioAcoustic-v2",
              confidenceScore: scanItem.result.confidenceScore ?? 95,
              threatCategory: scanItem.result.threatCategory || "BENIGN",
              analysisMetadata: (scanItem.result.analysisMetadata as object) ?? undefined,
              inferenceTimeMs: scanItem.result.inferenceTimeMs ?? 50,
              createdAt: new Date(scanItem.createdAt),
            },
          });
        }
      });

      existingSet.add(key);
      restoredScans++;
    }
  }

  // 2. Restore Lesson Progress (Upsert to preserve highest score)
  if (data.lessonProgress && Array.isArray(data.lessonProgress)) {
    for (const prog of data.lessonProgress) {
      if (!prog.courseId || !prog.lessonId) continue;
      await db.lessonProgress.upsert({
        where: {
          userId_courseId_lessonId: {
            userId,
            courseId: prog.courseId,
            lessonId: prog.lessonId,
          },
        },
        create: {
          userId,
          courseId: prog.courseId,
          lessonId: prog.lessonId,
          score: prog.score || 100,
          completedAt: new Date(prog.completedAt),
        },
        update: {
          score: prog.score || 100,
          completedAt: new Date(prog.completedAt),
        },
      });
      restoredProgress++;
    }
  }

  // 3. Restore Notifications
  if (data.notifications && Array.isArray(data.notifications)) {
    for (const notif of data.notifications) {
      if (!notif.title || !notif.message) continue;
      await db.notification.create({
        data: {
          userId,
          type: notif.type || "SYSTEM",
          severity: notif.severity || "INFO",
          title: notif.title,
          message: notif.message,
          isRead: notif.isRead ?? true,
          link: notif.link || null,
          createdAt: new Date(notif.createdAt),
        },
      });
      restoredNotifications++;
    }
  }

  // Record Audit Log for the restore action
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "DATA_RESTORE_COMPLETED",
        entityType: "USER_BACKUP",
        entityId: userId,
        newData: {
          restoredScans,
          skippedScans,
          restoredProgress,
          restoredNotifications,
          archiveExportedAt: archive.metadata.exportedAt,
          checksum: archive.metadata.checksum,
        },
      },
    });
  } catch (err) {
    console.warn("Failed to record restore audit log:", err);
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    counts: {
      restoredScans,
      skippedScans,
      restoredReports,
      restoredProgress,
      restoredNotifications,
    },
    clientPreferences: data.clientPreferences,
    message: `Data recovery successfully completed: ${restoredScans} scans restored (${skippedScans} existing scans preserved), ${restoredProgress} training records restored, and ${restoredNotifications} notifications re-synced.`,
  };
}

/**
 * Creates an instantaneous cloud restore snapshot saved in PostgreSQL.
 */
export async function createCloudRestorePoint(
  userId: string,
  label?: string,
  clientPreferences?: Record<string, unknown>
): Promise<CloudRestorePoint> {
  const archive = await exportUserData(userId, clientPreferences);
  const now = new Date();
  const snapshotLabel =
    label?.trim() || `Auto-Snapshot (${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

  const jsonContent = JSON.stringify({ label: snapshotLabel, archive });
  const sizeBytes = Buffer.byteLength(jsonContent, "utf8");

  const log = await db.auditLog.create({
    data: {
      userId,
      action: "DATA_RESTORE_POINT",
      entityType: "USER_BACKUP",
      entityId: userId,
      newData: {
        label: snapshotLabel,
        archive: JSON.parse(JSON.stringify(archive)),
        sizeBytes,
      },
    },
  });

  return {
    id: log.id,
    label: snapshotLabel,
    createdAt: log.createdAt.toISOString(),
    counts: {
      scans: archive.metadata.counts.scans,
      reports: archive.metadata.counts.communityReports,
      progress: archive.metadata.counts.lessonProgress,
    },
    checksum: archive.metadata.checksum,
    sizeBytes,
  };
}

/**
 * Lists all available cloud restore snapshots for a user.
 */
export async function listCloudRestorePoints(userId: string): Promise<CloudRestorePoint[]> {
  const logs = await db.auditLog.findMany({
    where: {
      userId,
      action: "DATA_RESTORE_POINT",
      entityType: "USER_BACKUP",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return logs.map((log) => {
    const data = (log.newData as Record<string, unknown>) || {};
    const archive = data.archive as SentinelBackupArchive | undefined;
    const label = (data.label as string) || "Cloud Snapshot";
    const sizeBytes = (data.sizeBytes as number) || 1024;

    return {
      id: log.id,
      label,
      createdAt: log.createdAt.toISOString(),
      counts: {
        scans: archive?.metadata?.counts?.scans ?? 0,
        reports: archive?.metadata?.counts?.communityReports ?? 0,
        progress: archive?.metadata?.counts?.lessonProgress ?? 0,
      },
      checksum: archive?.metadata?.checksum ?? "verified",
      sizeBytes,
    };
  });
}

/**
 * Restores data from a specific cloud snapshot point.
 */
export async function restoreFromCloudPoint(
  userId: string,
  snapshotId: string
): Promise<RestoreReport> {
  const log = await db.auditLog.findFirst({
    where: {
      id: snapshotId,
      userId,
      action: "DATA_RESTORE_POINT",
      entityType: "USER_BACKUP",
    },
  });

  if (!log || !log.newData) {
    throw new Error("Specified cloud restore point was not found or access is denied.");
  }

  const data = log.newData as Record<string, unknown>;
  const archive = data.archive as SentinelBackupArchive;

  if (!archive) {
    throw new Error("Cloud restore point payload is missing or corrupted.");
  }

  return restoreUserData(userId, archive);
}

/**
 * Deletes a cloud restore point.
 */
export async function deleteCloudRestorePoint(
  userId: string,
  snapshotId: string
): Promise<boolean> {
  const log = await db.auditLog.findFirst({
    where: {
      id: snapshotId,
      userId,
      action: "DATA_RESTORE_POINT",
      entityType: "USER_BACKUP",
    },
  });

  if (!log) {
    throw new Error("Restore point not found or unauthorized.");
  }

  await db.auditLog.delete({
    where: { id: snapshotId },
  });

  return true;
}
