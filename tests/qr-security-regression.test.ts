// Sentinel AI • Automated QR Security Regression Test Suite
// Validates Phase 1 - 5: Root cause fix, 6-dimension scoring, threat classification, and SSRF gating

import assert from "node:assert/strict";
import { URLSecurityAnalyzer } from "../src/modules/scanner/qr/services/url-security";
import { QRRiskEngine, RISK_THRESHOLDS } from "../src/modules/scanner/qr/services/risk-engine";
import { QRSecurityChecker } from "../src/modules/scanner/qr/services/security-checker";

console.log("======================================================================");
console.log("🛡️  SENTINEL AI: QR CODE SECURITY SCANNER REGRESSION TEST SUITE");
console.log("======================================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err?.message || err}\n`);
  }
}

// ─────────────────────────────────────────────────────────────
// Test 1: Canonical Safe Control URL
// ─────────────────────────────────────────────────────────────
runTest("1. Canonical Safe Control URL (https://www.google.com)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://www.google.com/search?q=cybersecurity");
  const { riskResult, parsed } = result;

  assert.equal(parsed.domainInfo.registrableDomain, "google.com");
  assert.equal(parsed.brandAudit.isImpersonating, false);
  assert.equal(parsed.homoglyphAudit.hasHomoglyphSpoof, false);
  assert.equal(parsed.ssrfTarget, false);

  // Safe control should score <= 19 and classify as SAFE
  assert.ok(
    riskResult.riskScore <= 19,
    `Safe URL risk score must be <= 19, got: ${riskResult.riskScore}`
  );
  assert.equal(riskResult.threatLevel, "SAFE");
  assert.equal(riskResult.scoreBreakdown.brandImpersonationScore, 0);
  assert.equal(riskResult.scoreBreakdown.unicodeConfusableScore, 0);
});

// ─────────────────────────────────────────────────────────────
// Test 2: Reserved Domain URL with Suspicious-Looking Words (No deception)
// ─────────────────────────────────────────────────────────────
runTest("2. Reserved Domain with Neutral Lure Words (https://example.com/login/docs)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://example.com/login/documentation-portal");
  const { riskResult, parsed } = result;

  assert.equal(parsed.domainInfo.registrableDomain, "example.com");
  assert.equal(parsed.brandAudit.isImpersonating, false);

  // Should NOT trigger false positive brand spoofing or high risk
  assert.ok(
    riskResult.riskScore < 40,
    `Reserved domain with login path must not be classified high threat, got: ${riskResult.riskScore}`
  );
  assert.ok(
    riskResult.threatLevel === "SAFE" || riskResult.threatLevel === "LOW",
    `Expected SAFE or LOW, got: ${riskResult.threatLevel}`
  );
  assert.equal(riskResult.scoreBreakdown.brandImpersonationScore, 0);
});

// ─────────────────────────────────────────────────────────────
// Test 3: Brand-Masquerading Subdomain URL
// ─────────────────────────────────────────────────────────────
runTest("3. Brand-Masquerading URL (https://paypal.com.account-update.net/security)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://paypal.com.account-update.net/security/verify");
  const { riskResult, parsed } = result;

  assert.equal(parsed.domainInfo.registrableDomain, "account-update.net");
  assert.equal(parsed.brandAudit.isImpersonating, true);
  assert.equal(parsed.brandAudit.targetBrand, "PayPal");
  assert.equal(parsed.brandAudit.brandLocation, "subdomain");

  // Brand spoofing in subdomain should trigger 25 points
  assert.equal(riskResult.scoreBreakdown.brandImpersonationScore, 25);
  assert.ok(
    riskResult.riskScore >= 25,
    `Brand masquerading risk score must be at least 25, got: ${riskResult.riskScore}`
  );
  assert.notEqual(riskResult.riskScore, 33, "Score must NOT be hardcoded 33");
  assert.ok(
    riskResult.threatLevel === "LOW" || riskResult.threatLevel === "SUSPICIOUS" || riskResult.threatLevel === "HIGH",
    `Expected elevated risk level, got: ${riskResult.threatLevel}`
  );
});

// ─────────────────────────────────────────────────────────────
// Test 4: Nested Redirect with Destination Parameters
// ─────────────────────────────────────────────────────────────
runTest("4. Nested Redirection URL (https://bit.ly/3xyz?url=https%3A%2F%2Fexternal-target.com)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://bit.ly/3xyz?url=https%3A%2F%2Fexternal-target.com%2Flanding");
  const { riskResult, parsed } = result;

  assert.equal(parsed.isShortener, true);
  assert.equal(parsed.redirectAudit.hasNestedRedirect, true);
  assert.equal(parsed.redirectAudit.candidateUrl, "https://external-target.com/landing");

  // Shortener (10) + nested redirect (14) = 24 points
  assert.ok(
    riskResult.scoreBreakdown.redirectRiskScore >= 14,
    `Redirect risk score must be >= 14, got: ${riskResult.scoreBreakdown.redirectRiskScore}`
  );
  assert.notEqual(riskResult.riskScore, 33, "Score must NOT be hardcoded 33");
});

// ─────────────────────────────────────────────────────────────
// Test 5: Punycode / IDN Mixed-Script Homoglyph URL
// ─────────────────────────────────────────────────────────────
runTest("5. Mixed-Script Homoglyph Domain (http://pаypal.com with Cyrillic 'а')", () => {
  // Cyrillic Small Letter A is \u0430
  const spoofUrl = "http://p\u0430ypal.com/signin";
  const result = QRSecurityChecker.evaluateSecurity(spoofUrl);
  const { riskResult, parsed } = result;

  assert.equal(parsed.homoglyphAudit.hasHomoglyphSpoof, true);
  assert.equal(parsed.homoglyphAudit.hasMixedScripts, true);

  // Mixed scripts + homoglyphs should award 20 points
  assert.equal(riskResult.scoreBreakdown.unicodeConfusableScore, 20);
  assert.notEqual(riskResult.riskScore, 33, "Score must NOT be hardcoded 33");
});

// ─────────────────────────────────────────────────────────────
// Test 6: SSRF & Prohibited Private / Cloud Metadata IP
// ─────────────────────────────────────────────────────────────
runTest("6. SSRF / AWS Cloud Metadata Prohibited Address (http://169.254.169.254/latest/meta-data/)", () => {
  const result = QRSecurityChecker.evaluateSecurity("http://169.254.169.254/latest/meta-data/");
  const { riskResult, parsed } = result;

  assert.equal(parsed.ssrfTarget, true);
  assert.equal(parsed.domainInfo.isPrivateOrLoopback, true);

  // SSRF defense should award maximum structure penalty (15) and trigger SSRF block
  assert.equal(riskResult.scoreBreakdown.urlStructureScore, 15);
  assert.ok(
    result.securityChecks.warnings.some((w) => w.code === "SSRF_PROHIBITED_TARGET"),
    "Must contain SSRF_PROHIBITED_TARGET warning"
  );
});

// ─────────────────────────────────────────────────────────────
// Test 7: Score Variance Verification Across Suspicious Inputs
// ─────────────────────────────────────────────────────────────
runTest("7. Distinct Suspicious Inputs Must NOT Receive Identical Flat Scores (33)", () => {
  const r1 = QRSecurityChecker.evaluateSecurity("https://paypal.com.verify-login.xyz/update");
  const r2 = QRSecurityChecker.evaluateSecurity("https://bit.ly/secure-redirect?url=https%3A%2F%2Fother-site.com");
  const r3 = QRSecurityChecker.evaluateSecurity("http://p\u0430ypal.com/auth");

  console.log(`      Sample 1 (Brand Spoof + Abuse TLD): RiskScore = ${r1.riskResult.riskScore}`);
  console.log(`      Sample 2 (Shortener + Redirect):    RiskScore = ${r2.riskResult.riskScore}`);
  console.log(`      Sample 3 (Homoglyph + HTTP):         RiskScore = ${r3.riskResult.riskScore}`);

  // All must NOT be equal to 33
  assert.notEqual(r1.riskResult.riskScore, 33, "Sample 1 must not be 33");
  assert.notEqual(r2.riskResult.riskScore, 33, "Sample 2 must not be 33");
  assert.notEqual(r3.riskResult.riskScore, 33, "Sample 3 must not be 33");

  // Scores should reflect distinct threat compositions
  const scores = new Set([r1.riskResult.riskScore, r2.riskResult.riskScore, r3.riskResult.riskScore]);
  assert.ok(scores.size >= 2, "Distinct suspicious inputs must demonstrate explainable score differentiation");
});

console.log("\n======================================================================");
console.log(`🏁  SUMMARY: ${passedCount} of ${totalCount} tests passed.`);
console.log("======================================================================\n");

if (passedCount !== totalCount) {
  process.exit(1);
}
