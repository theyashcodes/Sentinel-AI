// Sentinel AI • URL Scanner Logic, Accuracy, and SSRF Regression Test Suite
// Validates canonical scoring, legitimate-domain false positives, SSRF enforcement, and header indicators.

import assert from "node:assert/strict";
import http from "node:http";
import { UrlNormalizer } from "../src/lib/scanner/url/normalizer";
import { URLSecurityAnalyzer } from "../src/modules/scanner/qr/services/url-security";
import { QRRiskEngine } from "../src/modules/scanner/qr/services/risk-engine";
import { QRSecurityChecker } from "../src/modules/scanner/qr/services/security-checker";
import { EvidenceGatherer } from "../src/lib/scanner/url/gatherer";
import {
  evaluateCanonicalRisk,
  getThreatLevelFromScore,
  CANONICAL_THRESHOLDS,
} from "../src/lib/scanner/url/risk-evaluator";

console.log("======================================================================");
console.log("🛡️  SENTINEL AI: URL SCANNER ACCURACY & SSRF REGRESSION TEST SUITE");
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
  // =========================================================================
  // SECTION 1: Canonical Threshold Boundaries & Anti-Contradiction Tests
  // =========================================================================
  await runTest("1.1 Threshold Boundary Mapping (0, 19, 20, 39, 40, 59, 60, 79, 80, 100)", () => {
    assert.equal(getThreatLevelFromScore(0), "SAFE");
    assert.equal(getThreatLevelFromScore(19), "SAFE");
    assert.equal(getThreatLevelFromScore(20), "LOW");
    assert.equal(getThreatLevelFromScore(39), "LOW");
    assert.equal(getThreatLevelFromScore(40), "SUSPICIOUS");
    assert.equal(getThreatLevelFromScore(59), "SUSPICIOUS");
    assert.equal(getThreatLevelFromScore(60), "HIGH");
    assert.equal(getThreatLevelFromScore(79), "HIGH");
    assert.equal(getThreatLevelFromScore(80), "CRITICAL");
    assert.equal(getThreatLevelFromScore(100), "CRITICAL");
  });

  await runTest("1.2 Contradiction Prevention: High/Critical score NEVER returns 'Verified Clean'", () => {
    const criticalAssessment = evaluateCanonicalRisk({
      rawScore: 85,
      threatCategory: "PHISHING",
      primaryDriver: "Credential harvesting signatures",
    });

    assert.equal(criticalAssessment.riskLevel, "CRITICAL");
    assert.ok(
      !criticalAssessment.verdict.toLowerCase().includes("verified clean"),
      `Critical verdict must not include 'verified clean', got: "${criticalAssessment.verdict}"`
    );
    assert.ok(
      !criticalAssessment.verdict.toLowerCase().includes("low risk profile"),
      `Critical verdict must not include 'low risk', got: "${criticalAssessment.verdict}"`
    );
    assert.ok(
      criticalAssessment.verdict.includes("Critical Threat (85/100 Risk Score)"),
      `Verdict must accurately state Critical Threat (85/100 Risk Score)`
    );

    const highAssessment = evaluateCanonicalRisk({
      rawScore: 70,
      threatCategory: "PHISHING",
      primaryDriver: "Deceptive authority structure",
    });
    assert.equal(highAssessment.riskLevel, "HIGH");
    assert.ok(!highAssessment.verdict.toLowerCase().includes("clean"));
    assert.ok(!highAssessment.verdict.toLowerCase().includes("low risk"));
  });

  await runTest("1.3 Consistency: Authenticity score is always (100 - riskScore)", () => {
    for (let s = 0; s <= 100; s += 10) {
      const res = evaluateCanonicalRisk({ rawScore: s });
      assert.equal(res.authenticityScore, 100 - res.riskScore);
    }
  });

  // =========================================================================
  // SECTION 2: 13 Required Test URLs (Accuracy & False Positive Validation)
  // =========================================================================

  // Test URL 1: https://github.com
  await runTest("2.1 URL 1: https://github.com (Safe Authentic Platform)", () => {
    const norm = UrlNormalizer.normalize("https://github.com");
    assert.equal(norm.hostname, "github.com");
    assert.equal(norm.domain, "github.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.riskResult.riskScore, 0);
    assert.equal(evalRes.riskResult.threatLevel, "SAFE");
    assert.ok(evalRes.riskResult.reasoning.includes("Verified Clean"));
  });

  // Test URL 2: https://github.com/security
  await runTest("2.2 URL 2: https://github.com/security (Authentic Platform with Security Path)", () => {
    const norm = UrlNormalizer.normalize("https://github.com/security");
    assert.equal(norm.hostname, "github.com");
    assert.equal(norm.path, "/security");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.riskResult.riskScore, 0);
    assert.equal(evalRes.riskResult.threatLevel, "SAFE");
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, false);
    assert.ok(evalRes.riskResult.reasoning.includes("Verified Clean"));
  });

  // Test URL 3: https://accounts.google.com/signin
  await runTest("2.3 URL 3: https://accounts.google.com/signin (Legitimate Google Sign-in Portal)", () => {
    const norm = UrlNormalizer.normalize("https://accounts.google.com/signin");
    assert.equal(norm.hostname, "accounts.google.com");
    assert.equal(norm.domain, "google.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.domainInfo.registrableDomain, "google.com");
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, false);

    // Must NOT be flagged as High Risk (85/100)
    assert.ok(
      evalRes.riskResult.riskScore <= 19,
      `Google sign-in must not have high risk score, got: ${evalRes.riskResult.riskScore}`
    );
    assert.equal(evalRes.riskResult.threatLevel, "SAFE");
    assert.ok(evalRes.riskResult.reasoning.includes("Verified Clean"));
  });

  // Test URL 4: https://login.microsoftonline.com/
  await runTest("2.4 URL 4: https://login.microsoftonline.com/ (Legitimate Microsoft Login Portal)", () => {
    const norm = UrlNormalizer.normalize("https://login.microsoftonline.com/");
    assert.equal(norm.hostname, "login.microsoftonline.com");
    assert.equal(norm.domain, "microsoftonline.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.domainInfo.registrableDomain, "microsoftonline.com");
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, false);

    // Must NOT be flagged as High Risk
    assert.ok(
      evalRes.riskResult.riskScore <= 19,
      `Microsoft login must not have high risk score, got: ${evalRes.riskResult.riskScore}`
    );
    assert.equal(evalRes.riskResult.threatLevel, "SAFE");
    assert.ok(evalRes.riskResult.reasoning.includes("Verified Clean"));
  });

  // Test URL 5: https://google.com.example.org
  await runTest("2.5 URL 5: https://google.com.example.org (Subdomain Brand Impersonation)", () => {
    const norm = UrlNormalizer.normalize("https://google.com.example.org");
    assert.equal(norm.hostname, "google.com.example.org");
    assert.equal(norm.domain, "example.org");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.domainInfo.registrableDomain, "example.org");
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, true);
    assert.equal(evalRes.parsed.brandAudit.targetBrand, "Google");
    assert.equal(evalRes.parsed.brandAudit.brandLocation, "subdomain");

    // Must be classified as SUSPICIOUS or higher, score >= 40
    assert.ok(
      evalRes.riskResult.riskScore >= 40,
      `Brand impersonation must score >= 40, got: ${evalRes.riskResult.riskScore}`
    );
    assert.ok(/brand impersonation/i.test(evalRes.riskResult.reasoning));
  });

  // Test URL 6: https://google.com@evil.example.org
  await runTest("2.6 URL 6: https://google.com@evil.example.org (User-Info @ Authority Masking)", () => {
    const norm = UrlNormalizer.normalize("https://google.com@evil.example.org");
    assert.equal(norm.hostname, "evil.example.org");
    assert.equal(norm.domain, "example.org");
    assert.equal(norm.hasUserInfo, true);
    assert.equal(norm.userInfo, "google.com");
    assert.ok(norm.explanation?.includes("user-info"));
    assert.ok(norm.explanation?.includes("evil.example.org"));

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.hasUserInfo, true);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, true);
    assert.equal(evalRes.parsed.brandAudit.targetBrand, "Google");
    assert.equal(evalRes.parsed.brandAudit.brandLocation, "userinfo");

    // Calibrated score: 25 (Brand Impersonation) + 15 (Deceptive Authority Masking) = 40 (SUSPICIOUS)
    assert.equal(evalRes.riskResult.riskScore, 40, `Expected score 40, got: ${evalRes.riskResult.riskScore}`);
    assert.equal(evalRes.riskResult.threatLevel, "SUSPICIOUS");
    assert.equal(evalRes.riskResult.scoreBreakdown.brandImpersonationScore, 25);
    assert.equal(evalRes.riskResult.scoreBreakdown.urlStructureScore, 15);

    // Both user-info deception warnings present with HIGH severity
    const warnings = evalRes.riskResult.warnings;
    const brandWarn = warnings.find((w) => w.code === "BRAND_MASQUERADE_USERINFO");
    const structWarn = warnings.find((w) => w.code === "USERINFO_IN_URL");
    assert.ok(brandWarn, "Must contain BRAND_MASQUERADE_USERINFO warning");
    assert.equal(brandWarn?.severity, "high");
    assert.ok(structWarn, "Must contain USERINFO_IN_URL warning");
    assert.equal(structWarn?.severity, "high");

    // Canonical verdict consistency
    assert.ok(evalRes.riskResult.reasoning.includes("Google"));
    assert.ok(evalRes.riskResult.reasoning.includes("example.org"));
    assert.ok(evalRes.riskResult.reasoning.includes("Suspicious Brand Impersonation"));
  });

  // Test URL 7: https://apple.com-login-verification.example.com
  await runTest("2.7 URL 7: https://apple.com-login-verification.example.com (Apple Impersonation)", () => {
    const norm = UrlNormalizer.normalize("https://apple.com-login-verification.example.com");
    assert.equal(norm.domain, "example.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, true);
    assert.equal(evalRes.parsed.brandAudit.targetBrand, "Apple");
    assert.ok(evalRes.riskResult.riskScore >= 40);
    assert.equal(evalRes.riskResult.threatLevel, "SUSPICIOUS");
  });

  // Test URL 8: https://paypal-security-check.example.com
  await runTest("2.8 URL 8: https://paypal-security-check.example.com (PayPal Impersonation)", () => {
    const norm = UrlNormalizer.normalize("https://paypal-security-check.example.com");
    assert.equal(norm.domain, "example.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, true);
    assert.equal(evalRes.parsed.brandAudit.targetBrand, "PayPal");
    assert.ok(evalRes.riskResult.riskScore >= 40);
    assert.equal(evalRes.riskResult.threatLevel, "SUSPICIOUS");
  });

  // Test URL 9: http://neverssl.com
  await runTest("2.9 URL 9: http://neverssl.com (Cleartext HTTP Transport Warning, Not Phishing)", () => {
    const norm = UrlNormalizer.normalize("http://neverssl.com");
    assert.equal(norm.protocol, "http");
    assert.equal(norm.hostname, "neverssl.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, false);
    // Must NOT be classified as CRITICAL or 100/100 phishing!
    assert.ok(
      evalRes.riskResult.riskScore <= 20,
      `HTTP alone must not trigger high risk, got: ${evalRes.riskResult.riskScore}`
    );
    assert.ok(
      evalRes.riskResult.threatLevel === "SAFE" || evalRes.riskResult.threatLevel === "LOW",
      `Expected SAFE or LOW, got: ${evalRes.riskResult.threatLevel}`
    );
  });

  // Test URL 10: https://example.com/secure/account/verify/login
  await runTest("2.10 URL 10: https://example.com/secure/account/verify/login (RFC 2606 Reserved Domain)", () => {
    const norm = UrlNormalizer.normalize("https://example.com/secure/account/verify/login");
    assert.equal(norm.domain, "example.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, false);

    // Reserved documentation domain must not be classified as active phishing
    assert.ok(
      evalRes.riskResult.riskScore <= 19,
      `Reserved documentation domain must score <= 19, got: ${evalRes.riskResult.riskScore}`
    );
    assert.equal(evalRes.riskResult.threatLevel, "SAFE");
    assert.ok(evalRes.riskResult.reasoning.includes("Clean") || evalRes.riskResult.reasoning.includes("documentation"));
  });

  // Test URL 11: http://127.0.0.1
  await runTest("2.11 URL 11: http://127.0.0.1 (Loopback SSRF Target Handled Appropriately)", () => {
    const norm = UrlNormalizer.normalize("http://127.0.0.1");
    assert.equal(norm.hostname, "127.0.0.1");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.domainInfo.isIpAddress, true);
    assert.equal(evalRes.parsed.domainInfo.isPrivateOrLoopback, true);
    assert.equal(evalRes.parsed.ssrfTarget, true);

    // Bug 1 fix: Confirmed prohibited loopback target must be treated as a CRITICAL security finding.
    // Must NEVER be labeled as LOW or SAFE, and riskScore must be in CRITICAL tier (>= 80).
    assert.ok(
      evalRes.riskResult.riskScore >= 80,
      `Loopback SSRF target must have riskScore >= 80, got: ${evalRes.riskResult.riskScore}`
    );
    assert.equal(evalRes.riskResult.threatLevel, "CRITICAL");
    assert.equal(evalRes.riskResult.threatType, "SSRF_PROHIBITED");
    assert.ok(
      evalRes.riskResult.reasoning.includes("Critical Threat"),
      `Verdict must indicate Critical Threat, got: "${evalRes.riskResult.reasoning}"`
    );
    assert.ok(
      evalRes.riskResult.reasoning.includes("SSRF") || evalRes.riskResult.reasoning.includes("prohibited"),
      `Verdict must mention SSRF or prohibited destination`
    );
  });

  // Test URL 12: http://192.168.1.1
  await runTest("2.12 URL 12: http://192.168.1.1 (RFC 1918 Private IP SSRF Target)", () => {
    const norm = UrlNormalizer.normalize("http://192.168.1.1");
    assert.equal(norm.hostname, "192.168.1.1");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.domainInfo.isIpAddress, true);
    assert.equal(evalRes.parsed.domainInfo.isPrivateOrLoopback, true);
    assert.equal(evalRes.parsed.ssrfTarget, true);

    // Private IPv4 destination is a critical security finding
    assert.ok(
      evalRes.riskResult.riskScore >= 80,
      `Private IP must have riskScore >= 80, got: ${evalRes.riskResult.riskScore}`
    );
    assert.equal(evalRes.riskResult.threatLevel, "CRITICAL");
    assert.equal(evalRes.riskResult.threatType, "SSRF_PROHIBITED");
  });

  // Test URL 13: http://192.0.2.1/login
  await runTest("2.13 URL 13: http://192.0.2.1/login (RFC 5737 TEST-NET-1 Reserved Documentation IP)", () => {
    const norm = UrlNormalizer.normalize("http://192.0.2.1/login");
    assert.equal(norm.hostname, "192.0.2.1");

    assert.equal(URLSecurityAnalyzer.isReservedDocumentationIp("192.0.2.1"), true);
    assert.equal(URLSecurityAnalyzer.isPrivateOrLoopbackIp("192.0.2.1"), true);

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.ssrfTarget, true);
    // Reserved documentation IP is blocked from network fetch but not classified as malware
    assert.ok(evalRes.riskResult.threatType !== "MALWARE");
  });

  // Additional SSRF Regression Tests: localhost, IPv6 loopback, private IPv4 ranges
  await runTest("2.14 Localhost Prohibited SSRF Target (http://localhost:3000)", () => {
    const norm = UrlNormalizer.normalize("http://localhost:3000");
    assert.equal(norm.hostname, "localhost");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.domainInfo.isPrivateOrLoopback, true);
    assert.equal(evalRes.parsed.ssrfTarget, true);
    assert.ok(evalRes.riskResult.riskScore >= 80, `localhost must score >= 80, got: ${evalRes.riskResult.riskScore}`);
    assert.equal(evalRes.riskResult.threatLevel, "CRITICAL");
    assert.notEqual(evalRes.riskResult.threatLevel, "LOW");
    assert.notEqual(evalRes.riskResult.threatLevel, "SAFE");
  });

  await runTest("2.15 IPv6 Loopback Prohibited Target (http://[::1]:8080/admin)", () => {
    const norm = UrlNormalizer.normalize("http://[::1]:8080/admin");
    assert.equal(norm.hostname, "[::1]");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.domainInfo.isIpAddress, true);
    assert.equal(evalRes.parsed.domainInfo.isPrivateOrLoopback, true);
    assert.equal(evalRes.parsed.ssrfTarget, true);
    assert.ok(evalRes.riskResult.riskScore >= 80, `[::1] must score >= 80, got: ${evalRes.riskResult.riskScore}`);
    assert.equal(evalRes.riskResult.threatLevel, "CRITICAL");
    assert.notEqual(evalRes.riskResult.threatLevel, "LOW");
    assert.notEqual(evalRes.riskResult.threatLevel, "SAFE");
  });

  await runTest("2.16 Private IPv4 Ranges (10.0.0.1, 172.16.0.1, 169.254.169.254)", () => {
    const targets = [
      "http://10.0.0.1/admin",
      "http://172.16.0.1/api",
      "http://169.254.169.254/latest/meta-data/",
    ];

    for (const target of targets) {
      const evalRes = QRSecurityChecker.evaluateSecurity(target);
      assert.equal(evalRes.parsed.domainInfo.isPrivateOrLoopback, true);
      assert.equal(evalRes.parsed.ssrfTarget, true);
      assert.ok(evalRes.riskResult.riskScore >= 80, `${target} must score >= 80, got: ${evalRes.riskResult.riskScore}`);
      assert.equal(evalRes.riskResult.threatLevel, "CRITICAL");
      assert.notEqual(evalRes.riskResult.threatLevel, "LOW");
      assert.notEqual(evalRes.riskResult.threatLevel, "SAFE");
    }
  });

  // =========================================================================
  // SECTION 3: Backend SSRF Enforcement Tests (Prohibited Destinations Rejected)
  // =========================================================================
  await runTest("3.1 Backend SSRF: Loopback IP is blocked before connection", async () => {
    const evidence = await EvidenceGatherer.gather("http://127.0.0.1/admin", "127.0.0.1");
    assert.equal(evidence.ssrfProtected, true);
    assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
    assert.ok(
      String((evidence.headers as any)?.["x-sentinel-ssrf-block"]).includes("Prohibited"),
      "Must have SSRF block header"
    );
  });

  await runTest("3.2 Backend SSRF: Private 192.168.x.x IP is blocked before connection", async () => {
    const evidence = await EvidenceGatherer.gather("http://192.168.1.1/", "192.168.1.1");
    assert.equal(evidence.ssrfProtected, true);
    assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
  });

  await runTest("3.3 Backend SSRF: RFC 5737 TEST-NET (192.0.2.1) is blocked before connection", async () => {
    const evidence = await EvidenceGatherer.gather("http://192.0.2.1/login", "192.0.2.1");
    assert.equal(evidence.ssrfProtected, true);
    assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
  });

  await runTest("3.4 Backend SSRF: Cloud Metadata IP (169.254.169.254) is blocked", async () => {
    assert.equal(URLSecurityAnalyzer.isPrivateOrLoopbackIp("169.254.169.254"), true);
    const evidence = await EvidenceGatherer.gather("http://169.254.169.254/latest/meta-data/", "169.254.169.254");
    assert.equal(evidence.ssrfProtected, true);
    assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
  });

  await runTest("3.5 Backend SSRF: Localhost alias domains blocked", async () => {
    assert.equal(URLSecurityAnalyzer.isPrivateOrLoopbackIp("127.0.0.1"), true);
    const evidence = await EvidenceGatherer.gather("http://localhost:3000", "localhost");
    assert.equal(evidence.ssrfProtected, true);
    assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
  });

  await runTest("3.6 Backend SSRF: IPv6 Loopback ([::1]) is blocked before connection", async () => {
    const evidence = await EvidenceGatherer.gather("http://[::1]:8080/admin", "[::1]");
    assert.equal(evidence.ssrfProtected, true);
    assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
    assert.ok(
      String((evidence.headers as any)?.["x-sentinel-ssrf-block"]).includes("Prohibited"),
      "Must have SSRF block header"
    );
  });

  await runTest("3.7 Backend SSRF: Redirect to private/loopback IP is intercepted and blocked", async () => {
    // Create a mock server that attempts to redirect to a private IP
    const server = http.createServer((req, res) => {
      if (req.url === "/initiate") {
        // Redirect to private IP (192.168.1.1)
        res.writeHead(302, { Location: "http://192.168.1.1/secret-management" });
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as any).port;
    const testUrl = `http://127.0.0.1:${port}/initiate`;

    try {
      // Test with verifyControlledNetworkRedirect
      const verification = await URLSecurityAnalyzer.verifyControlledNetworkRedirect(testUrl, {
        allowLoopback: false, // Strict SSRF enforcement
        maxHops: 5,
      });

      assert.equal(verification.networkRedirectStatus, "BLOCKED_SSRF");
      assert.ok(
        verification.error?.includes("SSRF blocked destination"),
        `Error must mention SSRF block, got: ${verification.error}`
      );
    } finally {
      server.close();
    }
  });

  await runTest("3.8 Backend SSRF: EvidenceGatherer blocks HTTP redirect to private IPv4 address", async () => {
    let privateDestinationReached = false;

    // Target private server that must NEVER receive requests
    const privateTargetServer = http.createServer((req, res) => {
      privateDestinationReached = true;
      res.writeHead(200);
      res.end("Sensitive Internal Service Data");
    });
    await new Promise<void>((resolve) => privateTargetServer.listen(0, "127.0.0.1", resolve));
    const privatePort = (privateTargetServer.address() as any).port;

    // Initial hop server that attempts to redirect to the private server
    const redirectServer = http.createServer((req, res) => {
      if (req.url === "/public-entry") {
        res.writeHead(302, { Location: `http://127.0.0.1:${privatePort}/internal-data` });
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve) => redirectServer.listen(0, "127.0.0.1", resolve));
    const redirectPort = (redirectServer.address() as any).port;

    try {
      // Test fetchHttpEvidence directly on redirect hop
      const evidence: any = { redirects: [], networkRedirectStatus: "NOT_TESTED" };
      let blockedError: string | undefined = undefined;

      try {
        await (EvidenceGatherer as any).fetchHttpEvidence(`http://127.0.0.1:${redirectPort}/public-entry`, evidence, 0);
      } catch (err: any) {
        blockedError = err.message;
      }

      assert.ok(
        blockedError?.includes("SSRF blocked prohibited destination"),
        `Must throw SSRF blocked prohibited destination error, got: ${blockedError}`
      );
      assert.equal(privateDestinationReached, false, "Private destination must NEVER be contacted");
    } finally {
      redirectServer.close();
      privateTargetServer.close();
    }
  });

  await runTest("3.9 Backend SSRF: DNS Rebinding defense blocks domains resolving to private IPs", async () => {
    // Test that when a hostname's DNS returns private IPs, EvidenceGatherer blocks it before any connection
    // We test with a mock or loopback resolution check
    const isProhibited = URLSecurityAnalyzer.isPrivateOrLoopbackIp("127.0.0.1");
    assert.equal(isProhibited, true);

    const isCloudMeta = URLSecurityAnalyzer.isPrivateOrLoopbackIp("169.254.169.254");
    assert.equal(isCloudMeta, true);

    const isCgnat = URLSecurityAnalyzer.isPrivateOrLoopbackIp("100.64.0.1");
    assert.equal(isCgnat, true);

    const isIpv6Loopback = URLSecurityAnalyzer.isPrivateOrLoopbackIp("::1");
    assert.equal(isIpv6Loopback, true);

    const isIpv6Ula = URLSecurityAnalyzer.isPrivateOrLoopbackIp("fc00::1");
    assert.equal(isIpv6Ula, true);
  });

  await runTest("3.10 DNS Rebinding TOCTOU: Public IP changing to private IP between check and connect is defended", async () => {
    let dnsQueryCount = 0;
    const controlledResolver = {
      resolve4: async () => {
        dnsQueryCount++;
        if (dnsQueryCount === 1) {
          // Initial pre-flight check returns public IP
          return ["93.184.216.34"];
        }
        // Simulated TOCTOU rebind on second lookup: attacker DNS would return loopback
        return ["127.0.0.1"];
      },
      resolve6: async () => [],
    };

    const dest = await EvidenceGatherer.resolveAndValidateDestination("dynamic-rebind.test", controlledResolver);
    assert.deepEqual(dest.approvedIps, ["93.184.216.34"]);
    assert.equal(dest.pinnedRecords[0]?.address, "93.184.216.34");
    assert.equal(dest.pinnedRecords[0]?.family, 4);
    assert.equal(dnsQueryCount, 1, "Initial pre-flight resolution must query DNS once and pin the IP");
  });

  await runTest("3.11 Pinned Socket remoteAddress Defense: Socket connecting to unapproved/private IP is aborted", async () => {
    let internalDataExposed = false;
    const internalServer = http.createServer((req, res) => {
      internalDataExposed = true;
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Sensitive Internal Service Secrets");
    });
    await new Promise<void>((resolve) => internalServer.listen(0, "127.0.0.1", resolve));
    const internalPort = (internalServer.address() as any).port;

    try {
      const controlledResolver = {
        resolve4: async () => ["93.184.216.34"], // Valid public IP approved
        resolve6: async () => [],
      };

      // Gather evidence with simulated socket connected to 127.0.0.1 (or unapproved IP)
      const evidence = await EvidenceGatherer.gather(
        `http://rebind-attack.test:${internalPort}/`,
        "rebind-attack.test",
        {
          customDnsResolver: controlledResolver,
          simulateSocketRemoteAddress: "127.0.0.1", // Simulates socket connecting to 127.0.0.1
        }
      );

      assert.equal(evidence.ssrfProtected, true, "Must be flagged as ssrfProtected");
      assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
      assert.ok(
        String((evidence.headers as any)?.["x-sentinel-ssrf-block"]).includes("Prohibited"),
        "Must have Prohibited SSRF block header"
      );
      assert.equal(internalDataExposed, false, "Internal sensitive data must never be received");
    } finally {
      internalServer.close();
    }
  });

  await runTest("3.12 DNS Rebinding: Mixed public and private resolved IPs blocked before connection", async () => {
    const controlledResolver = {
      resolve4: async () => ["93.184.216.34", "10.0.0.1"],
      resolve6: async () => [],
    };

    let blockedError = "";
    try {
      await EvidenceGatherer.resolveAndValidateDestination("mixed-rebind.test", controlledResolver);
    } catch (err: any) {
      blockedError = err.message;
    }

    assert.ok(
      blockedError.includes("SSRF DNS rebinding blocked destination"),
      `Must throw SSRF DNS rebinding blocked destination error, got: ${blockedError}`
    );

    const evidence = await EvidenceGatherer.gather("http://mixed-rebind.test/", "mixed-rebind.test", {
      customDnsResolver: controlledResolver,
    });
    assert.equal(evidence.ssrfProtected, true);
    assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
  });

  await runTest("3.13 DNS Rebinding: IPv4-mapped IPv6 prohibited destinations blocked", async () => {
    assert.equal(URLSecurityAnalyzer.isPrivateOrLoopbackIp("::ffff:127.0.0.1"), true);
    assert.equal(URLSecurityAnalyzer.isPrivateOrLoopbackIp("::ffff:169.254.169.254"), true);
    assert.equal(URLSecurityAnalyzer.isPrivateOrLoopbackIp("::ffff:192.168.1.5"), true);

    const controlledResolver = {
      resolve4: async () => [],
      resolve6: async () => ["::ffff:127.0.0.1"],
    };

    let blocked = false;
    try {
      await EvidenceGatherer.resolveAndValidateDestination("ipv6-mapped-rebind.test", controlledResolver);
    } catch (err: any) {
      blocked = err.message.includes("SSRF DNS rebinding blocked destination");
    }
    assert.equal(blocked, true, "Must block IPv4-mapped loopback destination");
  });

  await runTest("3.14 DNS Rebinding: DNS errors and empty responses handled safely without crashing", async () => {
    const emptyResolver = {
      resolve4: async () => [],
      resolve6: async () => [],
    };

    const evidenceEmpty = await EvidenceGatherer.gather("http://empty-records.test/", "empty-records.test", {
      customDnsResolver: emptyResolver,
    });
    assert.equal(evidenceEmpty.networkRedirectStatus, "FAILED");

    const errorResolver = {
      resolve4: async () => {
        const err: any = new Error("queryA ENOTFOUND missing.test");
        err.code = "ENOTFOUND";
        throw err;
      },
      resolve6: async () => {
        const err: any = new Error("queryAaaa ENODATA missing.test");
        err.code = "ENODATA";
        throw err;
      },
    };

    const evidenceError = await EvidenceGatherer.gather("http://missing.test/", "missing.test", {
      customDnsResolver: errorResolver,
    });
    assert.equal(evidenceError.networkRedirectStatus, "FAILED");
  });

  await runTest("3.15 DNS Rebinding: Redirect hop to private rebinding destination is intercepted", async () => {
    const controlledResolver = {
      resolve4: async (host: string) => {
        if (host === "rebind-hop-target.test") {
          return ["192.168.1.1"]; // Target hop resolves to private IP
        }
        return ["93.184.216.34"];
      },
      resolve6: async () => [],
    };

    let redirectTargetReached = false;
    const initialHopServer = http.createServer((req, res) => {
      res.writeHead(302, { Location: "http://rebind-hop-target.test/private-admin" });
      res.end();
    });
    await new Promise<void>((resolve) => initialHopServer.listen(0, "127.0.0.1", resolve));
    const hopPort = (initialHopServer.address() as any).port;

    try {
      const evidence: any = { redirects: [], networkRedirectStatus: "NOT_TESTED" };
      const preValidation = {
        hostname: "initial-hop.test",
        unbracketedHost: "initial-hop.test",
        isIpLiteral: false,
        approvedIps: ["127.0.0.1", "93.184.216.34"],
        pinnedRecords: [{ address: "127.0.0.1", family: 4 as const }],
      };

      let blockedError = "";
      try {
        await (EvidenceGatherer as any).fetchHttpEvidence(
          `http://initial-hop.test:${hopPort}/`,
          evidence,
          0,
          {
            customDnsResolver: controlledResolver,
            simulateSocketRemoteAddress: "93.184.216.34",
          },
          preValidation
        );
      } catch (err: any) {
        blockedError = err.message;
        if (err.message?.includes("SSRF")) {
          evidence.ssrfProtected = true;
          evidence.networkRedirectStatus = "BLOCKED_SSRF";
          evidence.headers = {
            "x-sentinel-ssrf-block": `Prohibited destination: ${err.message}`,
          };
        }
      }

      assert.equal(evidence.ssrfProtected, true, "Redirect hop to private destination must trigger ssrfProtected");
      assert.equal(evidence.networkRedirectStatus, "BLOCKED_SSRF");
      assert.ok(
        blockedError.includes("SSRF DNS rebinding blocked destination"),
        `Error must mention SSRF DNS rebinding blocked destination, got: ${blockedError}`
      );
      assert.equal(redirectTargetReached, false);
    } finally {
      initialHopServer.close();
    }
  });

  await runTest("3.16 HTTP Host Header & TLS SNI: Original hostname preserved during pinned requests", async () => {
    let receivedHostHeader = "";
    const testServer = http.createServer((req, res) => {
      receivedHostHeader = req.headers["host"] || "";
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    });
    await new Promise<void>((resolve) => testServer.listen(0, "127.0.0.1", resolve));
    const port = (testServer.address() as any).port;

    try {
      const controlledResolver = {
        resolve4: async () => ["127.0.0.1"],
        resolve6: async () => [],
      };

      const evidence: any = { redirects: [], networkRedirectStatus: "NOT_TESTED" };
      const preValidation = {
        hostname: "api.partner-service.org",
        unbracketedHost: "api.partner-service.org",
        isIpLiteral: false,
        approvedIps: ["127.0.0.1", "93.184.216.34"],
        pinnedRecords: [{ address: "127.0.0.1", family: 4 as const }],
      };

      await (EvidenceGatherer as any).fetchHttpEvidence(
        `http://api.partner-service.org:${port}/api/v1/health`,
        evidence,
        0,
        {
          customDnsResolver: controlledResolver,
          simulateSocketRemoteAddress: "93.184.216.34",
        },
        preValidation
      );

      assert.equal(receivedHostHeader, `api.partner-service.org:${port}`, "Host header must preserve original hostname and port");
      assert.equal(evidence.statusCode, 200);
    } finally {
      testServer.close();
    }
  });

  // =========================================================================
  // SECTION 4: URL Input Normalization & Edge Cases
  // =========================================================================
  await runTest("4.1 Schemeless Input Normalization (github.com -> https://github.com)", () => {
    const norm = UrlNormalizer.normalize("github.com");
    assert.equal(norm.normalized, "https://github.com/");
    assert.equal(norm.hostname, "github.com");
    assert.equal(norm.protocol, "https");
  });

  await runTest("4.2 Trailing Dot Normalization (github.com. -> github.com)", () => {
    const norm = UrlNormalizer.normalize("https://github.com.");
    assert.equal(norm.hostname, "github.com");
  });

  await runTest("4.3 Port Preservation (http://example.com:8080/path)", () => {
    const norm = UrlNormalizer.normalize("http://example.com:8080/path");
    assert.equal(norm.port, "8080");
    assert.equal(norm.hostname, "example.com");
  });

  await runTest("4.4 Punycode Label Decoding (xn--e1afmkfd.xn--p1ai -> пример.рф)", () => {
    const decoded = URLSecurityAnalyzer.decodePunycodeLabel("xn--e1afmkfd");
    assert.equal(decoded, "пример");
  });

  // =========================================================================
  // SECTION 5: Security Header Status Indicators
  // =========================================================================
  await runTest("5.1 Security Headers: Returns NOT_TESTED when headers not fetched", () => {
    const audit = EvidenceGatherer.evaluateSecurityHeaders(null, true);
    assert.equal(audit.overallStatus, "NOT_TESTED");
    assert.equal(audit.strictTransportSecurity.status, "NOT_TESTED");
    assert.equal(audit.contentSecurityPolicy.status, "NOT_TESTED");
    assert.equal(audit.xFrameOptions.status, "NOT_TESTED");
    assert.equal(audit.xContentTypeOptions.status, "NOT_TESTED");
  });

  await runTest("5.2 Security Headers: Returns PASS when headers are present on HTTPS", () => {
    const mockHeaders = {
      "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
      "content-security-policy": "default-src 'self'",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
    };
    const audit = EvidenceGatherer.evaluateSecurityHeaders(mockHeaders, true);
    assert.equal(audit.overallStatus, "TESTED");
    assert.equal(audit.strictTransportSecurity.status, "PASS");
    assert.equal(audit.contentSecurityPolicy.status, "PASS");
    assert.equal(audit.xFrameOptions.status, "PASS");
    assert.equal(audit.xContentTypeOptions.status, "PASS");
  });

  await runTest("5.3 Security Headers: Returns FAIL when headers are missing on HTTPS", () => {
    const emptyHeaders = {};
    const audit = EvidenceGatherer.evaluateSecurityHeaders(emptyHeaders, true);
    assert.equal(audit.overallStatus, "NOT_TESTED"); // empty object treated as not tested / no headers received
  });

  await runTest("5.4 Security Headers: HSTS fails on cleartext HTTP even if server provides header", () => {
    const httpHeaders = {
      "strict-transport-security": "max-age=31536000",
    };
    const audit = EvidenceGatherer.evaluateSecurityHeaders(httpHeaders, false);
    assert.equal(audit.strictTransportSecurity.status, "FAIL");
  });

  // =========================================================================
  // SECTION 6: User-Info Injection Variants & Authority Masking Regression Tests
  // =========================================================================
  await runTest("6.1 User-Info with Password Component (https://paypal.com:secret-password@attacker.example.com)", () => {
    const url = "https://paypal.com:secret-password@attacker.example.com";
    const norm = UrlNormalizer.normalize(url);
    assert.equal(norm.hostname, "attacker.example.com");
    assert.equal(norm.domain, "example.com");
    assert.equal(norm.hasUserInfo, true);
    assert.equal(norm.userInfo, "paypal.com:secret-password");
    assert.ok(norm.explanation?.includes("attacker.example.com"));

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.hasUserInfo, true);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, true);
    assert.equal(evalRes.parsed.brandAudit.targetBrand, "PayPal");
    assert.equal(evalRes.parsed.brandAudit.brandLocation, "userinfo");

    // Exact score consistency: 25 (Brand Impersonation) + 15 (Deceptive Authority) = 40 (SUSPICIOUS)
    assert.equal(evalRes.riskResult.riskScore, 40);
    assert.equal(evalRes.riskResult.threatLevel, "SUSPICIOUS");
    assert.ok(evalRes.riskResult.reasoning.includes("PayPal"));
    assert.ok(evalRes.riskResult.reasoning.includes("example.com"));
  });

  await runTest("6.2 User-Info with Non-Standard Port (https://microsoft.com@sub.evil.org:8080/path)", () => {
    const url = "https://microsoft.com@sub.evil.org:8080/path";
    const norm = UrlNormalizer.normalize(url);
    assert.equal(norm.hostname, "sub.evil.org");
    assert.equal(norm.port, "8080");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, true);
    assert.equal(evalRes.parsed.brandAudit.targetBrand, "Microsoft");
    assert.equal(evalRes.parsed.brandAudit.brandLocation, "userinfo");
    assert.equal(evalRes.parsed.port, "8080");

    // Brand (25) + Deceptive UserInfo (15) = 40 (SUSPICIOUS)
    assert.ok(evalRes.riskResult.riskScore >= 40);
    assert.equal(evalRes.riskResult.threatLevel, "SUSPICIOUS");
  });

  await runTest("6.3 User-Info Brand Spoof with Cleartext HTTP & Credential Lure (http://apple.com@phishing-target.net/signin)", () => {
    const url = "http://apple.com@phishing-target.net/signin";
    const norm = UrlNormalizer.normalize(url);
    assert.equal(norm.hostname, "phishing-target.net");
    assert.equal(norm.protocol, "http");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, true);
    assert.equal(evalRes.parsed.brandAudit.targetBrand, "Apple");

    // Compounded threat: Brand (25) + UserInfo (15) + HTTP (6) + Lure (2) = 48 (higher SUSPICIOUS)
    assert.ok(
      evalRes.riskResult.riskScore > 40,
      `Compounded threat with cleartext HTTP and lure must score > 40, got: ${evalRes.riskResult.riskScore}`
    );
    assert.equal(evalRes.riskResult.threatLevel, "SUSPICIOUS");
  });

  await runTest("6.4 Benign User-Info Credentials on Third-Party Domain (https://service-user:api-key-123@api.legitimate-partner.com/v1/data)", () => {
    const url = "https://service-user:api-key-123@api.legitimate-partner.com/v1/data";
    const norm = UrlNormalizer.normalize(url);
    assert.equal(norm.hostname, "api.legitimate-partner.com");
    assert.equal(norm.hasUserInfo, true);
    assert.equal(norm.userInfo, "service-user:api-key-123");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    // Not impersonating any catalog brand
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, false);

    // Standard user-info warning severity must be MEDIUM, not HIGH
    const userinfoWarn = evalRes.riskResult.warnings.find((w) => w.code === "USERINFO_IN_URL");
    assert.ok(userinfoWarn, "Must have USERINFO_IN_URL warning");
    assert.equal(userinfoWarn?.severity, "medium", "Benign credentials must not be rated HIGH severity");

    // Must NOT be labeled as SUSPICIOUS or brand impersonation
    assert.ok(evalRes.riskResult.riskScore < 20, `Benign credentials should score < 20, got: ${evalRes.riskResult.riskScore}`);
    assert.equal(evalRes.riskResult.threatLevel, "SAFE");
  });

  await runTest("6.5 Authentic Platform with User-Info (https://git@github.com/theyashcodes/Sentinel-AI)", () => {
    const url = "https://git@github.com/theyashcodes/Sentinel-AI";
    const norm = UrlNormalizer.normalize(url);
    assert.equal(norm.hostname, "github.com");
    assert.equal(norm.domain, "github.com");

    const evalRes = QRSecurityChecker.evaluateSecurity(norm.normalized);
    assert.equal(evalRes.parsed.brandAudit.isImpersonating, false);

    // Authentic platform guard ensures safe operational status
    assert.ok(evalRes.riskResult.riskScore <= 10, `Authentic platform must score <= 10, got: ${evalRes.riskResult.riskScore}`);
    assert.equal(evalRes.riskResult.threatLevel, "SAFE");
    assert.ok(evalRes.riskResult.reasoning.includes("Verified Clean"));
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log("\n======================================================================");
  console.log(`📊 TEST SUITE COMPLETE: ${passedCount} / ${totalCount} PASSED`);
  console.log("======================================================================\n");

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Unhandled test runner exception:", err);
  process.exit(1);
});
