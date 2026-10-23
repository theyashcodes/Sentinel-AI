import { calculateChecksum, validateBackupArchive } from "../src/lib/backup/integrity";
import { SentinelBackupArchive, SentinelBackupPayload } from "../src/lib/backup/types";

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          console.log(`✅ [PASS] ${name}`);
          passedTests++;
        })
        .catch((err) => {
          console.error(`❌ [FAIL] ${name}:`, err);
        });
    } else {
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err);
  }
}

async function main() {
  console.log("======================================================================");
  console.log("🛡️  SENTINEL AI: DATA BACKUP & DISASTER RECOVERY TEST SUITE");
  console.log("======================================================================\n");

  const samplePayload: SentinelBackupPayload = {
    user: {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      name: "Security Lead",
      email: "operator@sentinel-ai.internal",
      role: "USER",
      reputationScore: 85,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    scans: [
      {
        id: "scan_001",
        type: "URL",
        payload: "https://secure-portal.auth-login.top/verify",
        payloadHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
        status: "COMPLETED",
        riskLevel: "CRITICAL",
        createdAt: "2026-10-20T12:00:00.000Z",
        result: {
          aiProvider: "SENTINEL_NEURAL_CORE",
          aiModel: "Sentinel-URL-v3",
          confidenceScore: 98.4,
          threatCategory: "CREDENTIAL_HARVESTER",
          analysisMetadata: { homoglyphDetected: true },
        },
      },
      {
        id: "scan_002",
        type: "QR",
        payload: "WIFI:S:AttackerAP;T:WPA;P:malicious;;",
        payloadHash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
        status: "COMPLETED",
        riskLevel: "HIGH",
        createdAt: "2026-10-21T15:30:00.000Z",
        result: {
          aiProvider: "SENTINEL_NEURAL_CORE",
          aiModel: "BioAcoustic-v2",
          confidenceScore: 91.2,
          threatCategory: "ROGUE_AP",
        },
      },
    ],
    communityReports: [
      {
        id: "rep_001",
        title: "Targeted Spearphishing Campaign targeting Devs",
        description: "Phishing links impersonating GitHub OAuth token grants.",
        status: "RESOLVED",
        upvotes: 42,
        createdAt: "2026-10-22T08:00:00.000Z",
      },
    ],
    lessonProgress: [
      {
        courseId: "cyber-basics",
        lessonId: "homoglyph-attacks",
        score: 100,
        completedAt: "2026-10-21T09:00:00.000Z",
      },
    ],
    notifications: [
      {
        type: "SECURITY_ALERT",
        severity: "HIGH",
        title: "High Risk URL Blocked",
        message: "Threat perimeter prevented connection to credential harvester.",
        isRead: false,
        createdAt: "2026-10-20T12:01:00.000Z",
      },
    ],
    clientPreferences: {
      theme: "dark",
      showCyBro: true,
      cybroSkin: "classic",
      particlesEnabled: true,
      telemetryEnabled: true,
    },
  };

  // Test 1: Checksum generation
  await runTest("Checksum is deterministic and valid SHA-256 string", () => {
    const checksum1 = calculateChecksum(samplePayload);
    const checksum2 = calculateChecksum(samplePayload);
    if (!checksum1 || checksum1.length !== 64) {
      throw new Error(`Invalid checksum length: ${checksum1.length}`);
    }
    if (checksum1 !== checksum2) {
      throw new Error("Checksum generation is non-deterministic!");
    }
  });

  // Test 2: Valid archive validation
  await runTest("validateBackupArchive accepts authentic SentinelBackupArchive", () => {
    const checksum = calculateChecksum(samplePayload);
    const validArchive: SentinelBackupArchive = {
      metadata: {
        version: "1.0.0",
        generator: "Sentinel-AI Enterprise Recovery Engine",
        exportedAt: new Date().toISOString(),
        userId: samplePayload.user.id,
        userEmail: samplePayload.user.email,
        checksum,
        counts: {
          scans: 2,
          communityReports: 1,
          lessonProgress: 1,
          notifications: 1,
        },
      },
      data: samplePayload,
    };

    const result = validateBackupArchive(validArchive);
    if (!result.valid || !result.archive) {
      throw new Error(`Validation failed for authentic archive: ${result.error}`);
    }
    if (result.archive.data.scans.length !== 2) {
      throw new Error("Archive scan counts mismatch");
    }
  });

  // Test 3: Detecting Tampered Payload (Cryptographic Seal check)
  await runTest("validateBackupArchive detects tampered content and rejects invalid checksum", () => {
    const checksum = calculateChecksum(samplePayload);
    const tamperedPayload = JSON.parse(JSON.stringify(samplePayload));
    // Malicious actor modifies scan severity or injected extra scan
    tamperedPayload.scans[0].riskLevel = "SAFE";

    const tamperedArchive: SentinelBackupArchive = {
      metadata: {
        version: "1.0.0",
        generator: "Sentinel-AI Enterprise Recovery Engine",
        exportedAt: new Date().toISOString(),
        userId: samplePayload.user.id,
        userEmail: samplePayload.user.email,
        checksum, // Original checksum retained
        counts: {
          scans: 2,
          communityReports: 1,
          lessonProgress: 1,
          notifications: 1,
        },
      },
      data: tamperedPayload,
    };

    const result = validateBackupArchive(tamperedArchive);
    if (result.valid) {
      throw new Error("Tampered archive was erroneously accepted!");
    }
    if (!result.error?.includes("Cryptographic integrity verification failed")) {
      throw new Error(`Expected cryptographic error, got: ${result.error}`);
    }
  });

  // Test 4: Rejecting Malformed / Incomplete Archives
  await runTest("validateBackupArchive rejects missing metadata or missing data fields", () => {
    const emptyResult = validateBackupArchive({});
    if (emptyResult.valid) throw new Error("Empty object should fail validation");

    const noMetadata = validateBackupArchive({ data: samplePayload });
    if (noMetadata.valid) throw new Error("Missing metadata should fail");

    const wrongVersion = validateBackupArchive({
      metadata: { version: "2.5.0", checksum: "abc" },
      data: samplePayload,
    });
    if (wrongVersion.valid) throw new Error("Unsupported version should fail");
  });

  // Test 5: Client preferences preservation
  await runTest("Backup archive preserves client preferences correctly", () => {
    const checksum = calculateChecksum(samplePayload);
    const validArchive: SentinelBackupArchive = {
      metadata: {
        version: "1.0.0",
        generator: "Sentinel-AI Enterprise Recovery Engine",
        exportedAt: new Date().toISOString(),
        userId: samplePayload.user.id,
        userEmail: samplePayload.user.email,
        checksum,
        counts: { scans: 2, communityReports: 1, lessonProgress: 1, notifications: 1 },
      },
      data: samplePayload,
    };

    const validation = validateBackupArchive(validArchive);
    const prefs = validation.archive?.data.clientPreferences;
    if (prefs?.theme !== "dark" || prefs?.showCyBro !== true || prefs?.cybroSkin !== "classic") {
      throw new Error("Client preferences were not preserved properly in archive");
    }
  });

  console.log("\n======================================================================");
  console.log(`📊 TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("======================================================================\n");
}

main().catch(console.error);
