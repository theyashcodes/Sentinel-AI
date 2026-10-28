import { recordFeedback, getFeedbackForScan } from "../src/lib/feedback/feedbackStore";
import assert from "assert";

async function runFeedbackTests() {
  console.log("🧪 Testing Sentinel AI Immutable Feedback & Active Learning Store...\n");

  const testScanId = `test-scan-${Date.now()}`;
  
  // 1. Initial status should be unlocked
  const initialFeedback = await getFeedbackForScan(testScanId);
  assert.strictEqual(initialFeedback, null, "Initial feedback should be null");
  console.log("✅ Step 1: Initial scan is unlocked");

  // 2. Submit initial 5-star feedback
  const firstSubmission = await recordFeedback({
    scanId: testScanId,
    tool: "media-forensics",
    rating: 5,
    groundTruthVerdict: "REAL_SAFE",
    tags: ["Real Camera Photo", "Legit Metadata"],
    notes: "Perfect camera photo detection with genuine lens noise profile.",
    target: "sample_photo.jpg",
    originalVerdict: "HUMAN_AUTHENTIC",
    originalRiskScore: 12,
  });

  assert.strictEqual(firstSubmission.success, true, "First submission should succeed");
  assert.strictEqual(firstSubmission.alreadyLocked, false, "First submission was not already locked");
  assert.strictEqual(firstSubmission.feedback.isLocked, true, "Stored feedback has isLocked: true");
  assert.strictEqual(firstSubmission.feedback.rating, 5, "Stored rating should be 5");
  assert.strictEqual(firstSubmission.feedback.groundTruthVerdict, "REAL_SAFE");
  console.log("✅ Step 2: First feedback submission recorded successfully with isLocked: true");

  // 3. Status should now be locked
  const feedbackAfter = await getFeedbackForScan(testScanId);
  assert.notStrictEqual(feedbackAfter, null, "Status should be found after submission");
  assert.strictEqual(feedbackAfter?.isLocked, true, "Feedback must be locked");
  assert.strictEqual(feedbackAfter?.rating, 5, "Status feedback rating should be 5");
  console.log("✅ Step 3: Feedback status correctly shows isLocked: true and rating: 5");

  // 4. CRITICAL CONSTRAINT: Second submission for the SAME scanId MUST FAIL & BE REJECTED
  const secondSubmission = await recordFeedback({
    scanId: testScanId,
    tool: "media-forensics",
    rating: 1, // Malicious attempt to change rating to 1 star
    groundTruthVerdict: "AI_THREAT",
    tags: ["Deepfake / AI Generated"],
    notes: "Trying to overwrite locked feedback...",
    target: "sample_photo.jpg",
  });

  assert.strictEqual(secondSubmission.success, false, "Second submission MUST return success: false");
  assert.strictEqual(secondSubmission.alreadyLocked, true, "Second submission MUST return alreadyLocked: true");
  assert.strictEqual(secondSubmission.feedback.rating, 5, "Feedback rating must NOT be changed to 1");
  console.log("✅ Step 4: Strict Immutability verified! Second submission was rejected with alreadyLocked: true");

  // 5. Verify the original feedback was NOT altered in storage
  const feedbackAfterAttempt = await getFeedbackForScan(testScanId);
  assert.strictEqual(feedbackAfterAttempt?.rating, 5, "Rating must remain 5 and untouched");
  assert.strictEqual(feedbackAfterAttempt?.groundTruthVerdict, "REAL_SAFE");
  console.log("✅ Step 5: Original feedback remains completely immutable (still 5 stars, REAL_SAFE)");

  // 6. Test 1-Star Rating with Active Learning flagged
  const badScanId = `test-mistake-scan-${Date.now()}`;
  const badSubmission = await recordFeedback({
    scanId: badScanId,
    tool: "url-scanner",
    rating: 1,
    groundTruthVerdict: "REAL_SAFE", // Model thought it was threat, but user marks it actually safe
    tags: ["Legitimate Corporate Domain", "False Alarm on SSL"],
    notes: "Internal staging domain flagged as phishing incorrectly.",
    target: "https://staging.internal-corp.net",
    originalVerdict: "PHISHING_THREAT",
    originalRiskScore: 92,
  });

  assert.strictEqual(badSubmission.success, true);
  assert.strictEqual(badSubmission.feedback.rating, 1);
  console.log("✅ Step 6: 1-Star rating successfully archived into training dataset for adaptive calibration");

  console.log("\n🎉 ALL IMMUTABLE FEEDBACK TESTS PASSED WITH 100% SUCCESS!\n");
}

runFeedbackTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
