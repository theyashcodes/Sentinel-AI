// Sentinel AI • Automated QR Security Regression Test Suite
// Validates Phase 1 - 5: Root cause fix, 6-dimension scoring, threat classification, and SSRF gating

import assert from "node:assert/strict";
import http from "node:http";
import { URLSecurityAnalyzer } from "../src/modules/scanner/qr/services/url-security";
import { QRRiskEngine, RISK_THRESHOLDS } from "../src/modules/scanner/qr/services/risk-engine";
import { QRSecurityChecker } from "../src/modules/scanner/qr/services/security-checker";

console.log("======================================================================");
console.log("🛡️  SENTINEL AI: QR CODE SECURITY SCANNER REGRESSION TEST SUITE");
console.log("======================================================================\n");

let passedCount = 0;
let totalCount = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    await fn();
    passedCount++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err?.message || err}\n`);
  }
}

async function runAllTests() {
// ─────────────────────────────────────────────────────────────
// Test 1: Canonical Safe Control URL
// ─────────────────────────────────────────────────────────────
await runTest("1. Canonical Safe Control URL (https://www.google.com)", () => {
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
await runTest("2. Reserved Domain with Neutral Lure Words (https://example.com/login/docs)", () => {
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
await runTest("3. Brand-Masquerading URL (https://paypal.com.account-update.net/security)", () => {
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
await runTest("4. Nested Redirection URL (https://bit.ly/3xyz?url=https%3A%2F%2Fexternal-target.com)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://bit.ly/3xyz?url=https%3A%2F%2Fexternal-target.com%2Flanding");
  const { riskResult, parsed } = result;

  assert.equal(parsed.isShortener, true);
  assert.equal(parsed.redirectAudit.hasNestedRedirect, true);
  assert.equal(parsed.redirectAudit.candidateUrl, "https://external-target.com/landing");

  // Shortener (10) + nested redirect (8) = 18 points
  assert.ok(
    riskResult.scoreBreakdown.redirectRiskScore >= 14,
    `Redirect risk score must be >= 14, got: ${riskResult.scoreBreakdown.redirectRiskScore}`
  );
  assert.notEqual(riskResult.riskScore, 33, "Score must NOT be hardcoded 33");
});

// ─────────────────────────────────────────────────────────────
// Test 5: Punycode / IDN Mixed-Script Homoglyph URL
// ─────────────────────────────────────────────────────────────
await runTest("5. Mixed-Script Homoglyph Domain (http://pаypal.com with Cyrillic 'а')", () => {
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
await runTest("6. SSRF / AWS Cloud Metadata Prohibited Address (http://169.254.169.254/latest/meta-data/)", () => {
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
await runTest("7. Distinct Suspicious Inputs Must NOT Receive Identical Flat Scores (33)", () => {
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

// ─────────────────────────────────────────────────────────────
// Test 8: Benign Encoded Redirect Parameter (Synthetic Target & Same-Origin)
// ─────────────────────────────────────────────────────────────
await runTest("8. Benign Encoded Redirect Parameter (https://example.com/login?redirect=https%3A%2F%2Fexample.com%2Fdashboard)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://example.com/login?redirect=https%3A%2F%2Fexample.com%2Fdashboard");
  const { riskResult, securityChecks } = result;

  // Requirement 1: Separate signals
  assert.equal(securityChecks.redirect_parameter_present, true, "redirect_parameter_present must be true");
  assert.equal(securityChecks.redirect_destination_untrusted, false, "redirect_destination_untrusted must be false for same-origin");
  assert.equal(securityChecks.redirect_chain_observed, false, "redirect_chain_observed must be false for single hop");
  assert.equal(securityChecks.redirect_chain_verified, false, "redirect_chain_verified must be false without HTTP verification");
  assert.equal(securityChecks.networkRedirectStatus, "NOT_TESTED", "networkRedirectStatus must be NOT_TESTED");

  // Requirement 2: Do not award high redirect-risk points merely because parameter exists
  assert.equal(
    riskResult.scoreBreakdown.redirectRiskScore,
    0,
    `Redirect integrity score must be 0 for benign redirect, got: ${riskResult.scoreBreakdown.redirectRiskScore}`
  );

  // Requirement 3: Safe comparison for same-registrable-domain synthetic targets
  const sameRegistrableResult = QRSecurityChecker.evaluateSecurity("https://auth.company.example/auth?next=https%3A%2F%2Fapp.company.example");
  assert.equal(sameRegistrableResult.securityChecks.redirect_destination_untrusted, false, "Same registrable domain must not be marked untrusted");
  assert.equal(sameRegistrableResult.riskResult.scoreBreakdown.redirectRiskScore, 0, "Same registrable domain redirect score must be 0");

  // Requirement 6: Confidence is calibrated and labeled as heuristic estimate
  assert.equal(riskResult.confidenceType, "HEURISTIC_ESTIMATE");
  assert.ok(
    riskResult.confidence <= 75,
    `Confidence must be realistic heuristic estimate (<= 75%), got: ${riskResult.confidence}%`
  );
  assert.equal(riskResult.threatLevel, "SAFE");
  assert.ok(riskResult.authenticityScore >= 90, `Authenticity score must be >= 90, got: ${riskResult.authenticityScore}`);
});

// ─────────────────────────────────────────────────────────────
// Test 9: Untrusted Cross-Origin Redirect Destination
// ─────────────────────────────────────────────────────────────
await runTest("9. Untrusted Cross-Origin Redirect Destination (https://example.com/oauth?redirect=https%3A%2F%2Fmalicious-harvest.xyz%2Flogin)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://example.com/oauth?redirect=https%3A%2F%2Fmalicious-harvest.xyz%2Flogin");
  const { riskResult, securityChecks } = result;

  // Requirement 1: Separate signals
  assert.equal(securityChecks.redirect_parameter_present, true, "redirect_parameter_present must be true");
  assert.equal(securityChecks.redirect_destination_untrusted, true, "redirect_destination_untrusted must be true for external untrusted host");
  assert.equal(securityChecks.networkRedirectStatus, "NOT_TESTED", "networkRedirectStatus must remain NOT_TESTED in static analysis");

  // Threat score should reflect untrusted destination
  assert.ok(
    riskResult.scoreBreakdown.redirectRiskScore > 0,
    `Untrusted redirect must receive risk points, got: ${riskResult.scoreBreakdown.redirectRiskScore}`
  );
  assert.equal(riskResult.threatType, "MALICIOUS_REDIRECT");
});

// ─────────────────────────────────────────────────────────────
// Test 10: Verified Local Mock 301/302 HTTP Redirect Chain
// ─────────────────────────────────────────────────────────────
await runTest("10. Verified Local Mock 301/302 HTTP Chain (Controlled Active Hop Telemetry)", async () => {
  const server = http.createServer((req, res) => {
    if (req.url === "/hop1") {
      res.writeHead(302, { Location: "/hop2" });
      res.end();
    } else if (req.url === "/hop2") {
      res.writeHead(301, { Location: "/landing" });
      res.end();
    } else if (req.url === "/landing") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Final Landing Page OK");
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as any).port;
  const startUrl = `http://127.0.0.1:${port}/hop1`;

  try {
    const verification = await URLSecurityAnalyzer.verifyControlledNetworkRedirect(startUrl, {
      allowLoopback: true,
      maxHops: 5,
    });

    assert.equal(verification.redirect_chain_verified, true, "redirect_chain_verified must be true");
    assert.equal(verification.networkRedirectStatus, "VERIFIED_HTTP_CHAIN", "networkRedirectStatus must be VERIFIED_HTTP_CHAIN");
    assert.equal(verification.totalHops, 2, `Expected 2 verified hops, got ${verification.totalHops}`);
    assert.equal(verification.networkHops[0]?.statusCode, 302, "First hop must be 302");
    assert.equal(verification.networkHops[1]?.statusCode, 301, "Second hop must be 301");
    assert.ok(verification.finalUrl.endsWith("/landing"), `Final URL should end with /landing, got: ${verification.finalUrl}`);
  } finally {
    server.close();
  }
});

// ─────────────────────────────────────────────────────────────
// Test 11: URL with No Redirect Parameter
// ─────────────────────────────────────────────────────────────
await runTest("11. Clean URL with No Redirect Parameter (https://example.com/pricing/overview)", () => {
  const result = QRSecurityChecker.evaluateSecurity("https://example.com/pricing/overview");
  const { riskResult, securityChecks } = result;

  assert.equal(securityChecks.redirect_parameter_present, false, "redirect_parameter_present must be false");
  assert.equal(securityChecks.redirect_destination_untrusted, false, "redirect_destination_untrusted must be false");
  assert.equal(securityChecks.redirect_chain_observed, false, "redirect_chain_observed must be false");
  assert.equal(securityChecks.redirect_chain_verified, false, "redirect_chain_verified must be false");
  assert.equal(securityChecks.networkRedirectStatus, "NOT_TESTED", "networkRedirectStatus must be NOT_TESTED");
  assert.equal(riskResult.scoreBreakdown.redirectRiskScore, 0, "redirectRiskScore must be 0");
});

// ─────────────────────────────────────────────────────────────
// Test 12: Test 05 Canonical Evaluation (Brand Impersonation + External Redirect)
// URL: https://paypal.com.login.example/verify?next=https%3A%2F%2Funtrusted.example%2Fsession
// ─────────────────────────────────────────────────────────────
await runTest("12. Test 05 Canonical Evaluation (https://paypal.com.login.example/verify?next=...)", () => {
  const testUrl = "https://paypal.com.login.example/verify?next=https%3A%2F%2Funtrusted.example%2Fsession";
  const result = QRSecurityChecker.evaluateSecurity(testUrl);
  const { parsed, riskResult, securityChecks } = result;

  // Domain & Public Suffix List Verification
  assert.equal(parsed.domainInfo.rawHostname, "paypal.com.login.example", "Hostname must be parsed accurately");
  assert.equal(parsed.domainInfo.registrableDomain, "login.example", "PSL registrable domain must be login.example, NEVER paypal.com");
  assert.notEqual(parsed.domainInfo.registrableDomain, "paypal.com", "Must NEVER treat paypal.com.login.example as paypal.com");
  assert.equal(parsed.domainInfo.subdomain, "paypal.com", "Subdomain must contain paypal.com mimicry");

  // Dimension 1: Brand Masquerading (25/25)
  assert.equal(securityChecks.hasBrandMismatch, true, "hasBrandMismatch must be true");
  assert.equal(parsed.brandAudit.isImpersonating, true, "isImpersonating must be true");
  assert.equal(parsed.brandAudit.impersonationStrength, "STRONG", "impersonationStrength must be STRONG for full legitimate domain in subdomain");
  assert.equal(parsed.brandAudit.impersonationPattern, "FULL_DOMAIN_IN_SUBDOMAIN", "impersonationPattern must be FULL_DOMAIN_IN_SUBDOMAIN");
  assert.equal(riskResult.scoreBreakdown.brandImpersonationScore, 25, "Brand masquerading must award full 25 points");

  // Dimension 3: Redirect Integrity (8/20) - External untrusted destination
  assert.equal(securityChecks.redirect_parameter_present, true, "redirect_parameter_present must be true");
  assert.equal(securityChecks.redirect_destination_untrusted, true, "redirect_destination_untrusted must be true for cross-origin destination");
  assert.equal(securityChecks.redirect_chain_observed, false, "redirect_chain_observed must be false in static analysis");
  assert.equal(securityChecks.redirect_chain_verified, false, "redirect_chain_verified must be false without HTTP verification");
  assert.equal(securityChecks.networkRedirectStatus, "NOT_TESTED", "Static analysis must preserve networkRedirectStatus as NOT_TESTED");
  assert.equal(riskResult.scoreBreakdown.redirectRiskScore, 8, "Redirect risk score must be 8 for untrusted external target");

  // Dimension 4: URL Structure (6/15) - Deceptive TLD nesting in subdomain
  assert.equal(riskResult.scoreBreakdown.urlStructureScore, 6, "URL structure must flag deceptive TLD nesting in subdomain");

  // Dimension 6: Contextual Lures (2/5) - /verify path lure
  assert.equal(riskResult.scoreBreakdown.contextualLureScore, 2, "Contextual lure score must be 2 for /verify");

  // Total Score & Classification
  assert.equal(riskResult.riskScore, 41, "Risk score must be 41 (25 + 8 + 6 + 2)");
  assert.equal(riskResult.authenticityScore, 59, "Authenticity score must be exactly 100 - riskScore (59)");
  assert.equal(riskResult.threatLevel, "SUSPICIOUS", "Classification must be SUSPICIOUS, never LOW RISK");
  assert.equal(riskResult.threatType, "BRAND_IMPERSONATION", "Primary threat type must be BRAND_IMPERSONATION");
  assert.equal(riskResult.confidenceType, "HEURISTIC_ESTIMATE");
});

// ─────────────────────────────────────────────────────────────
// Test 13: Benign Brand Mentions in Paths (Non-Phishing Editorial/API Paths)
// ─────────────────────────────────────────────────────────────
await runTest("13. Benign Brand Mentions in Paths (Editorial / API Documentation)", () => {
  const editorialResult = QRSecurityChecker.evaluateSecurity("https://techblog.example/news/paypal");
  assert.equal(editorialResult.parsed.brandAudit.isImpersonating, false, "Editorial mention must not be flagged as impersonation");
  assert.equal(editorialResult.riskResult.scoreBreakdown.brandImpersonationScore, 0, "Editorial mention brand score must be 0");
  assert.equal(editorialResult.riskResult.threatLevel, "SAFE", "Editorial mention must be classified as SAFE");

  const docsResult = QRSecurityChecker.evaluateSecurity("https://docs.example/api/v1/paypal/checkout");
  assert.equal(docsResult.parsed.brandAudit.isImpersonating, false, "API path mention must not be flagged as impersonation");
  assert.equal(docsResult.riskResult.scoreBreakdown.brandImpersonationScore, 0, "API path brand score must be 0");
  assert.equal(docsResult.riskResult.threatLevel, "SAFE", "API path must be classified as SAFE");
});

// ─────────────────────────────────────────────────────────────
// Test 14: Strong Brand Impersonation Threat Classification Floor
// ─────────────────────────────────────────────────────────────
await runTest("14. Strong Brand Impersonation Threat Classification Floor", () => {
  // Bare domain spoof with no redirect parameters or credential path lures
  const bareSpoof = QRSecurityChecker.evaluateSecurity("https://paypal.com.login.example/");
  
  assert.equal(bareSpoof.parsed.brandAudit.impersonationStrength, "STRONG");
  // Raw score is 25 (Brand) + 6 (Deceptive TLD) = 31.
  // Principled policy raises riskScore floor to RISK_THRESHOLDS.SUSPICIOUS.min (40)
  assert.ok(
    bareSpoof.riskResult.riskScore >= RISK_THRESHOLDS.SUSPICIOUS.min,
    `Strong brand impersonation must have risk score >= ${RISK_THRESHOLDS.SUSPICIOUS.min}, got ${bareSpoof.riskResult.riskScore}`
  );
  assert.equal(bareSpoof.riskResult.threatLevel, "SUSPICIOUS", "Strong brand impersonation must never be LOW or SAFE");
  assert.equal(
    bareSpoof.riskResult.authenticityScore,
    100 - bareSpoof.riskResult.riskScore,
    "Authenticity score must strictly equal 100 - riskScore"
  );
});

// ─────────────────────────────────────────────────────────────
// Test 15: Benign Encoded Redirects vs Untrusted External Redirects
// ─────────────────────────────────────────────────────────────
await runTest("15. Benign Encoded Redirects vs Untrusted External Redirects", () => {
  const benignSameOrigin = QRSecurityChecker.evaluateSecurity("https://example.com/login?redirect=https%3A%2F%2Fexample.com%2Fdashboard");
  assert.equal(benignSameOrigin.securityChecks.redirect_destination_untrusted, false);
  assert.equal(benignSameOrigin.riskResult.scoreBreakdown.redirectRiskScore, 0);

  const crossOriginUntrusted = QRSecurityChecker.evaluateSecurity("https://example.com/oauth?redirect=https%3A%2F%2Funtrusted.example%2Fcallback");
  assert.equal(crossOriginUntrusted.securityChecks.redirect_destination_untrusted, true);
  assert.equal(crossOriginUntrusted.riskResult.scoreBreakdown.redirectRiskScore, 8);
});

  console.log("\n======================================================================");
  console.log(`🏁  SUMMARY: ${passedCount} of ${totalCount} tests passed.`);
  console.log("======================================================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
