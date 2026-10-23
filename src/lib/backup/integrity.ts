import { createHash } from "crypto";
import { SentinelBackupArchive, SentinelBackupPayload } from "./types";

/**
 * Deterministically serializes an object by sorting object keys recursively.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonicalJsonStringify((obj as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}

/**
 * Computes a deterministic SHA-256 checksum of the payload data.
 */
export function calculateChecksum(data: SentinelBackupPayload): string {
  const jsonString = canonicalJsonStringify(data);
  return createHash("sha256").update(jsonString, "utf8").digest("hex");
}

/**
 * Validates whether the given object conforms to SentinelBackupArchive structure.
 */
export function validateBackupArchive(
  raw: unknown
): { valid: boolean; error?: string; archive?: SentinelBackupArchive } {
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "Backup file is empty or not a valid JSON object." };
  }

  const candidate = raw as Partial<SentinelBackupArchive>;

  if (!candidate.metadata || typeof candidate.metadata !== "object") {
    return { valid: false, error: "Missing required 'metadata' section in backup file." };
  }

  if (candidate.metadata.version !== "1.0.0") {
    return {
      valid: false,
      error: `Unsupported backup version '${candidate.metadata.version}'. Expected '1.0.0'.`,
    };
  }

  if (!candidate.metadata.checksum || typeof candidate.metadata.checksum !== "string") {
    return { valid: false, error: "Missing cryptographic checksum in backup metadata." };
  }

  if (!candidate.data || typeof candidate.data !== "object") {
    return { valid: false, error: "Missing required 'data' section in backup file." };
  }

  const { data } = candidate;
  if (!data.user || !data.user.email) {
    return { valid: false, error: "Corrupted user record in backup data." };
  }

  if (!Array.isArray(data.scans)) {
    return { valid: false, error: "Malformed scans data. Expected an array." };
  }

  // Verify Checksum Integrity
  const expectedChecksum = candidate.metadata.checksum;
  const actualChecksum = calculateChecksum(data as SentinelBackupPayload);

  if (expectedChecksum !== actualChecksum) {
    return {
      valid: false,
      error: `Cryptographic integrity verification failed! Expected ${expectedChecksum.slice(0, 10)}..., but calculated ${actualChecksum.slice(0, 10)}... (Archive may have been altered or corrupted).`,
    };
  }

  return {
    valid: true,
    archive: candidate as SentinelBackupArchive,
  };
}
