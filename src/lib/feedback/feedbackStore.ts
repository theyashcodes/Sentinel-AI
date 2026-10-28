import fs from "fs";
import path from "path";
import { ScanFeedbackPayload, StoredFeedback } from "./types";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// In-memory cache of submitted feedback keyed by scanId
const feedbackCache = new Map<string, StoredFeedback>();
let isInitialized = false;

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback_dataset.jsonl");
const ML_DATA_DIR = path.join(process.cwd(), "ml", "data");
const ML_FEEDBACK_FILE = path.join(ML_DATA_DIR, "feedback_dataset.jsonl");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Initialize cache by loading existing feedback from disk (if exists)
 */
function initFeedbackStore() {
  if (isInitialized) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ML_DATA_DIR)) {
      fs.mkdirSync(ML_DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(FEEDBACK_FILE)) {
      const content = fs.readFileSync(FEEDBACK_FILE, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item: StoredFeedback = JSON.parse(line);
          if (item.scanId) {
            feedbackCache.set(item.scanId, item);
          }
        } catch {
          // Ignore malformed line
        }
      }
    }
  } catch (err) {
    console.warn("[FeedbackStore] Init warning:", err);
  } finally {
    isInitialized = true;
  }
}

/**
 * Get feedback for a scan. Returns null if not yet rated.
 */
export async function getFeedbackForScan(scanId: string): Promise<StoredFeedback | null> {
  initFeedbackStore();
  if (feedbackCache.has(scanId)) {
    return feedbackCache.get(scanId) || null;
  }

  // Check database if scanId is a valid UUID
  if (UUID_REGEX.test(scanId)) {
    try {
      const scan = await db.scan.findUnique({
        where: { id: scanId },
        select: { evidenceMetadata: true },
      });

      const meta = scan?.evidenceMetadata as Record<string, unknown> | null;
      if (meta && meta.userFeedback) {
        const fb = meta.userFeedback as StoredFeedback;
        feedbackCache.set(scanId, fb);
        return fb;
      }
    } catch {
      // Ignore db read error
    }
  }

  return null;
}

/**
 * Submit feedback for a scan.
 * STRICT IMMUTABILITY RULE: Once recorded, feedback for a scan can NEVER be modified!
 */
export async function recordFeedback(
  payload: ScanFeedbackPayload,
  userId?: string
): Promise<{ success: boolean; feedback: StoredFeedback; alreadyLocked: boolean }> {
  initFeedbackStore();

  const existing = await getFeedbackForScan(payload.scanId);
  if (existing) {
    // Feedback is permanently locked. Re-submission is rejected.
    return {
      success: false,
      feedback: existing,
      alreadyLocked: true,
    };
  }

  const storedFeedback: StoredFeedback = {
    ...payload,
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: userId || undefined,
    createdAt: new Date().toISOString(),
    isLocked: true,
  };

  // 1. Save to in-memory cache
  feedbackCache.set(payload.scanId, storedFeedback);

  // 2. Append to JSONL files (Continuous Learning dataset for ML retraining)
  try {
    const line = JSON.stringify(storedFeedback) + "\n";
    fs.appendFileSync(FEEDBACK_FILE, line, "utf-8");

    if (fs.existsSync(ML_DATA_DIR)) {
      fs.appendFileSync(ML_FEEDBACK_FILE, line, "utf-8");
    }
  } catch (err) {
    console.error("[FeedbackStore] Failed to write feedback JSONL:", err);
  }

  // 3. Update database Scan record if valid UUID
  if (UUID_REGEX.test(payload.scanId)) {
    try {
      const scan = await db.scan.findUnique({
        where: { id: payload.scanId },
        select: { evidenceMetadata: true },
      });

      if (scan) {
        const currentMeta = (scan.evidenceMetadata as Record<string, unknown>) || {};
        await db.scan.update({
          where: { id: payload.scanId },
          data: {
            evidenceMetadata: JSON.parse(
              JSON.stringify({
                ...currentMeta,
                userFeedback: storedFeedback,
              })
            ) as Prisma.InputJsonValue,
          },
        });
      }
    } catch {
      // DB scan record might not exist for ad-hoc / client-side guest scans, which is fine
    }
  }

  return {
    success: true,
    feedback: storedFeedback,
    alreadyLocked: false,
  };
}
