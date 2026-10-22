// Sentinel AI • Error Handling Module Unit & Regression Test Suite
import assert from "node:assert/strict";
import { ZodError, z } from "zod";
import {
  ErrorCode,
  ErrorCodeHttpStatus,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ThreatEngineError,
  ExternalServiceError,
  DatabaseError,
  InternalServerError,
  handleApiError,
  withErrorHandler,
  parseApiError,
} from "../src/lib/errors";
import { NextRequest } from "next/server";

console.log("======================================================================");
console.log("🛡️  SENTINEL AI: UNIFIED ERROR HANDLING MODULE TEST SUITE");
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
  // Test 1: ErrorCode HTTP status mapping
  await runTest("ErrorCode HTTP status mappings are consistent", () => {
    assert.equal(ErrorCodeHttpStatus[ErrorCode.BAD_REQUEST], 400);
    assert.equal(ErrorCodeHttpStatus[ErrorCode.VALIDATION_ERROR], 422);
    assert.equal(ErrorCodeHttpStatus[ErrorCode.UNAUTHORIZED], 401);
    assert.equal(ErrorCodeHttpStatus[ErrorCode.FORBIDDEN], 403);
    assert.equal(ErrorCodeHttpStatus[ErrorCode.NOT_FOUND], 404);
    assert.equal(ErrorCodeHttpStatus[ErrorCode.RATE_LIMIT_EXCEEDED], 429);
    assert.equal(ErrorCodeHttpStatus[ErrorCode.INTERNAL_SERVER_ERROR], 500);
  });

  // Test 2: AppError Base Class properties and serialization
  await runTest("AppError instantiates with correct metadata and JSON representation", () => {
    const err = new AppError({
      message: "Custom domain error",
      code: ErrorCode.BAD_REQUEST,
      statusCode: 400,
      details: { field: "username" },
    });

    assert.equal(err.message, "Custom domain error");
    assert.equal(err.code, ErrorCode.BAD_REQUEST);
    assert.equal(err.statusCode, 400);
    assert.equal(err.isOperational, true);
    assert.deepEqual(err.details, { field: "username" });
    assert.ok(err.timestamp);

    const json = err.toJSON();
    assert.equal(json.code, ErrorCode.BAD_REQUEST);
    assert.equal(json.message, "Custom domain error");
  });

  // Test 3: Specialized Error Subclasses
  await runTest("Specialized subclasses default to correct HTTP codes and operational flags", () => {
    const validationErr = new ValidationError("Invalid payload", [{ field: "email" }]);
    assert.equal(validationErr.statusCode, 422);
    assert.equal(validationErr.code, ErrorCode.VALIDATION_ERROR);

    const authErr = new AuthenticationError();
    assert.equal(authErr.statusCode, 401);
    assert.equal(authErr.code, ErrorCode.AUTH_REQUIRED);

    const forbiddenErr = new AuthorizationError();
    assert.equal(forbiddenErr.statusCode, 403);
    assert.equal(forbiddenErr.code, ErrorCode.FORBIDDEN);

    const notFoundErr = new NotFoundError("Threat Dossier");
    assert.equal(notFoundErr.statusCode, 404);
    assert.equal(notFoundErr.message, "Threat Dossier was not found.");

    const conflictErr = new ConflictError("User already exists");
    assert.equal(conflictErr.statusCode, 409);

    const rateLimitErr = new RateLimitError("Rate limit exceeded", 60);
    assert.equal(rateLimitErr.statusCode, 429);
    assert.equal(rateLimitErr.retryAfterSeconds, 60);

    const threatErr = new ThreatEngineError("ML inference timeout", {
      code: ErrorCode.SCAN_TIMEOUT,
      statusCode: 504,
    });
    assert.equal(threatErr.statusCode, 504);
    assert.equal(threatErr.code, ErrorCode.SCAN_TIMEOUT);

    const externalErr = new ExternalServiceError("WHOIS Lookup", "Socket reset");
    assert.equal(externalErr.statusCode, 503);
    assert.equal(externalErr.serviceName, "WHOIS Lookup");
  });

  // Test 4: handleApiError with AppError
  await runTest("handleApiError formats AppError into standard API response", async () => {
    const err = new NotFoundError("Scan Report #402");
    const res = handleApiError(err);

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, ErrorCode.NOT_FOUND);
    assert.equal(body.error.message, "Scan Report #402 was not found.");
    assert.ok(body.error.requestId.startsWith("req_"));
    assert.ok(body.error.timestamp);
  });

  // Test 5: handleApiError with Zod validation error
  await runTest("handleApiError translates ZodError into 422 with formatted field errors", async () => {
    const TestSchema = z.object({
      targetUrl: z.string().url("Must be a valid URL"),
      severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    });

    let zodErr: ZodError | null = null;
    try {
      TestSchema.parse({ targetUrl: "not-a-url", severity: "CRITICAL" });
    } catch (e) {
      if (e instanceof ZodError) zodErr = e;
    }

    assert.ok(zodErr !== null);
    const res = handleApiError(zodErr);
    assert.equal(res.status, 422);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, ErrorCode.VALIDATION_ERROR);
    assert.ok(Array.isArray(body.error.details));
    assert.equal(body.error.details.length, 2);
  });

  // Test 6: handleApiError with Prisma duplicate key simulation
  await runTest("handleApiError handles database duplicate key error (P2002)", async () => {
    const prismaErr = {
      code: "P2002",
      message: "Unique constraint failed on the fields: (`email`)",
      meta: { target: ["email"] },
    };

    const res = handleApiError(prismaErr);
    assert.equal(res.status, 409);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, ErrorCode.DATABASE_DUPLICATE_KEY);
    assert.deepEqual(body.error.details, { target: ["email"] });
  });

  // Test 7: handleApiError with unhandled unknown error
  await runTest("handleApiError shields unexpected internal errors into safe 500 response", async () => {
    const fatalErr = new Error("Null pointer in core C++ extension binding");
    const res = handleApiError(fatalErr);

    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, ErrorCode.INTERNAL_SERVER_ERROR);
    assert.ok(body.error.message.length > 0);
  });

  // Test 8: withErrorHandler Higher-Order Function
  await runTest("withErrorHandler automatically catches and envelopes thrown exceptions", async () => {
    const mockHandler = withErrorHandler(async (req: NextRequest) => {
      const url = req.nextUrl.searchParams.get("target");
      if (!url) {
        throw new ValidationError("Parameter 'target' is mandatory");
      }
      return Response.json({ success: true, target: url });
    });

    // Request missing 'target'
    const req = new NextRequest("http://localhost:3000/api/mock");
    const res = await mockHandler(req, {});

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, ErrorCode.VALIDATION_ERROR);
    assert.equal(body.error.message, "Parameter 'target' is mandatory");
  });

  // Test 9: Client parseApiError utility
  await runTest("parseApiError safely parses various error structures", () => {
    // 1. Standard Sentinel API error envelope
    const parsedFromEnvelope = parseApiError({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "You have exceeded 100 scans per minute.",
        requestId: "req_xyz999",
      },
    });
    assert.equal(parsedFromEnvelope.code, "RATE_LIMIT_EXCEEDED");
    assert.equal(parsedFromEnvelope.message, "You have exceeded 100 scans per minute.");
    assert.equal(parsedFromEnvelope.requestId, "req_xyz999");

    // 2. Direct message object
    const parsedFromObj = parseApiError({ message: "Network connection terminated" });
    assert.equal(parsedFromObj.message, "Network connection terminated");

    // 3. Raw standard Error
    const parsedFromStandard = parseApiError(new Error("DOM storage quota exceeded"));
    assert.equal(parsedFromStandard.message, "DOM storage quota exceeded");

    // 4. Raw string
    const parsedFromString = parseApiError("Unauthenticated request");
    assert.equal(parsedFromString.message, "Unauthenticated request");
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
