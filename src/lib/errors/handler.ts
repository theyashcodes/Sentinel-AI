import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./classes";
import { ErrorCode, ErrorCodeType } from "./codes";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/monitoring";

export interface ApiErrorPayload {
  success: false;
  error: {
    code: ErrorCodeType | string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

/**
 * Extract or generate a correlation request ID for end-to-end tracing.
 */
function getRequestId(req?: Request | NextRequest): string {
  if (req) {
    const headerId = req.headers.get("x-request-id") || req.headers.get("x-correlation-id");
    if (headerId) return headerId;
  }
  return `req_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

/**
 * Format Zod validation errors into a clean, client-consumable list
 */
function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    rule: issue.code,
  }));
}

/**
 * Check if the error is a Prisma client error without adding heavy dependency imports
 */
function isPrismaError(error: unknown): error is { code: string; message: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string" &&
    ((error as Record<string, unknown>).code as string).startsWith("P")
  );
}

/**
 * Core API Error Handler
 * Translates any caught exception into a uniform JSON response with appropriate status code.
 */
export function handleApiError(
  error: unknown,
  req?: Request | NextRequest
): NextResponse<ApiErrorPayload> {
  const requestId = getRequestId(req);
  const timestamp = new Date().toISOString();

  // 1. Operational Domain Error (AppError)
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(
        {
          requestId,
          err: error,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
        },
        `[API] Operational Server Error: ${error.message}`
      );
      captureException(error, { requestId, code: error.code, details: error.details });
    } else {
      logger.warn(
        {
          requestId,
          code: error.code,
          statusCode: error.statusCode,
          message: error.message,
        },
        `[API] Client Request Warning: ${error.message}`
      );
    }

    const responseHeaders: Record<string, string> = { "x-request-id": requestId };
    if (
      error.statusCode === 429 &&
      typeof error.details === "object" &&
      error.details &&
      "retryAfterSeconds" in (error.details as Record<string, unknown>)
    ) {
      responseHeaders["Retry-After"] = String((error.details as Record<string, unknown>).retryAfterSeconds);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
          timestamp: error.timestamp || timestamp,
        },
      },
      { status: error.statusCode, headers: responseHeaders }
    );
  }

  // 2. Zod Schema Validation Error
  if (error instanceof ZodError) {
    const formattedIssues = formatZodIssues(error);
    logger.warn({ requestId, issues: formattedIssues }, `[API] Validation Error`);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Request validation failed. Please check input parameters.",
          details: formattedIssues,
          requestId,
          timestamp,
        },
      },
      { status: 422, headers: { "x-request-id": requestId } }
    );
  }

  // 3. Prisma Database Errors
  if (isPrismaError(error)) {
    if (error.code === "P2002") {
      logger.warn({ requestId, meta: error.meta }, `[API] Database Conflict (Duplicate Entry)`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.DATABASE_DUPLICATE_KEY,
            message: "A resource with these details already exists.",
            details: error.meta,
            requestId,
            timestamp,
          },
        },
        { status: 409, headers: { "x-request-id": requestId } }
      );
    }

    if (error.code === "P2025") {
      logger.warn({ requestId, meta: error.meta }, `[API] Database Record Not Found`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCode.DATABASE_RECORD_NOT_FOUND,
            message: "The requested record was not found.",
            details: error.meta,
            requestId,
            timestamp,
          },
        },
        { status: 404, headers: { "x-request-id": requestId } }
      );
    }

    logger.error({ requestId, err: error }, `[API] Database Error (${error.code})`);
    captureException(error, { requestId, prismaCode: error.code });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.DATABASE_CONNECTION_ERROR,
          message: "A database error occurred while processing your request.",
          requestId,
          timestamp,
        },
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  // 4. Invalid JSON Parsing Error (SyntaxError)
  if (error instanceof SyntaxError && "body" in error) {
    logger.warn({ requestId, message: error.message }, `[API] Malformed JSON Body`);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.BAD_REQUEST,
          message: "Malformed JSON payload in request body.",
          requestId,
          timestamp,
        },
      },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  // 5. Unhandled / Unexpected Fatal Exception
  const standardError = error instanceof Error ? error : new Error(String(error));
  logger.error(
    {
      requestId,
      err: standardError,
      stack: standardError.stack,
    },
    `[API] Unhandled Fatal Exception: ${standardError.message}`
  );

  captureException(standardError, { requestId });

  const isProduction = process.env.NODE_ENV === "production";
  return NextResponse.json(
    {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: isProduction
          ? "An unexpected internal server error occurred. Our team has been notified."
          : standardError.message,
        details: isProduction ? undefined : { stack: standardError.stack },
        requestId,
        timestamp,
      },
    },
    { status: 500, headers: { "x-request-id": requestId } }
  );
}

/**
 * Route Handler Wrapper (Higher-Order Function)
 * Wraps Next.js route handlers with automatic error catching and standardization.
 *
 * @example
 * export const POST = withErrorHandler(async (req) => {
 *   const body = await req.json();
 *   // ... business logic
 *   return NextResponse.json({ success: true, data: result });
 * });
 */
export function withErrorHandler<T = unknown>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest, context: T): Promise<NextResponse | Response> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error, req);
    }
  };
}
