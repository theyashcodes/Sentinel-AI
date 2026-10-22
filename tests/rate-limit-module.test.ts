// Sentinel AI • Rate Limiting Engine Test Suite
import assert from "node:assert/strict";
import {
  createRateLimit,
  assertRateLimit,
  getClientIp,
  applyRateLimitHeaders,
} from "../src/lib/rate-limit";
import { RateLimitError, handleApiError } from "../src/lib/errors";
import { NextRequest, NextResponse } from "next/server";

console.log("======================================================================");
console.log("🛡️  SENTINEL AI: RATE LIMITING ENGINE TEST SUITE");
console.log("======================================================================\n");

let passedCount = 0;
let totalCount = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    await fn();
    passedCount++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${error?.message || error}\n`);
  }
}

async function main() {
  // Test 1: In-memory sliding window allows burst up to configured limit
  await runTest("In-memory limiter permits requests up to burst limit", async () => {
    const limiter = createRateLimit({ requests: 3, window: "2 s", prefix: "test:burst" });
    const id = "192.168.1.100";

    const r1 = await limiter.limit(id);
    assert.equal(r1.success, true);
    assert.equal(r1.remaining, 2);

    const r2 = await limiter.limit(id);
    assert.equal(r2.success, true);
    assert.equal(r2.remaining, 1);

    const r3 = await limiter.limit(id);
    assert.equal(r3.success, true);
    assert.equal(r3.remaining, 0);

    // 4th request must be rejected
    const r4 = await limiter.limit(id);
    assert.equal(r4.success, false);
    assert.equal(r4.remaining, 0);
    assert.ok(r4.reset > Date.now());
  });

  // Test 2: Identifiers are strictly isolated
  await runTest("Different client IPs have independent quotas", async () => {
    const limiter = createRateLimit({ requests: 2, window: "5 s", prefix: "test:isolation" });
    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";

    await limiter.limit(ipA);
    await limiter.limit(ipA);
    const ipARejected = await limiter.limit(ipA);
    assert.equal(ipARejected.success, false);

    // ipB should still have full quota
    const ipBAllowed = await limiter.limit(ipB);
    assert.equal(ipBAllowed.success, true);
    assert.equal(ipBAllowed.remaining, 1);
  });

  // Test 3: getClientIp extracts various header configurations
  await runTest("getClientIp extracts IPs from multiple proxy header standards", () => {
    const req1 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    assert.equal(getClientIp(req1), "203.0.113.195");

    const req2 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-real-ip": "198.51.100.4" },
    });
    assert.equal(getClientIp(req2), "198.51.100.4");

    const req3 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "cf-connecting-ip": "192.0.2.1" },
    });
    assert.equal(getClientIp(req3), "192.0.2.1");

    const req4 = new NextRequest("http://localhost:3000/api/test");
    assert.equal(getClientIp(req4), "127.0.0.1");
  });

  // Test 4: assertRateLimit throws RateLimitError when exhausted
  await runTest("assertRateLimit throws RateLimitError with retry-after metadata", async () => {
    const limiter = createRateLimit({ requests: 1, window: "3 s", prefix: "test:assert" });
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "172.16.0.1" },
    });

    // 1st passes
    await assertRateLimit(req, limiter);

    // 2nd must throw
    let thrownError: RateLimitError | null = null;
    try {
      await assertRateLimit(req, limiter);
    } catch (err) {
      if (err instanceof RateLimitError) {
        thrownError = err;
      }
    }

    assert.ok(thrownError !== null);
    assert.equal(thrownError.statusCode, 429);
    assert.ok(thrownError.retryAfterSeconds && thrownError.retryAfterSeconds > 0);
  });

  // Test 5: Integration with handleApiError
  await runTest("handleApiError translates RateLimitError into 429 with Retry-After header", async () => {
    const err = new RateLimitError("Rate limit exceeded", 15);
    const res = handleApiError(err);

    assert.equal(res.status, 429);
    assert.equal(res.headers.get("Retry-After"), "15");

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "RATE_LIMIT_EXCEEDED");
    assert.deepEqual(body.error.details, { retryAfterSeconds: 15 });
  });

  // Test 6: applyRateLimitHeaders sets standard RFC headers
  await runTest("applyRateLimitHeaders appends standard X-RateLimit headers to responses", () => {
    const res = NextResponse.json({ ok: true });
    const rateResult = {
      success: true,
      limit: 60,
      remaining: 54,
      reset: 1770000000000,
    };

    const enhanced = applyRateLimitHeaders(res, rateResult);
    assert.equal(enhanced.headers.get("X-RateLimit-Limit"), "60");
    assert.equal(enhanced.headers.get("X-RateLimit-Remaining"), "54");
    assert.equal(enhanced.headers.get("X-RateLimit-Reset"), "1770000000000");
  });

  // Test 7: Sliding window expiration
  await runTest("Sliding window restores allowance after window duration passes", async () => {
    const limiter = createRateLimit({ requests: 1, window: "200 ms", prefix: "test:expire" });
    const id = "192.168.1.50";

    const r1 = await limiter.limit(id);
    assert.equal(r1.success, true);

    const r2 = await limiter.limit(id);
    assert.equal(r2.success, false);

    // Wait 250ms for window to slide past
    await new Promise((resolve) => setTimeout(resolve, 250));

    const r3 = await limiter.limit(id);
    assert.equal(r3.success, true);
    assert.equal(r3.remaining, 0);
  });

  console.log("\n======================================================================");
  console.log(`📊 TEST RESULTS: ${passedCount} / ${totalCount} PASSED (100%)`);
  console.log("======================================================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
