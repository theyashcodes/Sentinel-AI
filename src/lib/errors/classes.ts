import { ErrorCode, ErrorCodeType, ErrorCodeHttpStatus } from "./codes";

export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * Base Application Error
 * All custom operational domain errors in Sentinel AI derive from this class.
 */
export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(params: {
    message: string;
    code?: ErrorCodeType;
    statusCode?: number;
    isOperational?: boolean;
    details?: unknown;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code ?? ErrorCode.INTERNAL_SERVER_ERROR;
    this.statusCode = params.statusCode ?? ErrorCodeHttpStatus[this.code] ?? 500;
    this.isOperational = params.isOperational ?? true;
    this.details = params.details;
    this.timestamp = new Date().toISOString();

    if (params.cause) {
      this.cause = params.cause;
    }

    // Capture standard stack trace omitting constructor
    Error.captureStackTrace?.(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation Error (422 / 400)
 * Thrown when request schemas, inputs, or parameters fail validation (e.g. Zod).
 */
export class ValidationError extends AppError {
  constructor(message = "Validation failed for request parameters", details?: unknown) {
    super({
      message,
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 422,
      isOperational: true,
      details,
    });
  }
}

/**
 * Authentication Error (401)
 * Thrown when an unauthenticated or expired user tries to access protected features.
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required. Please sign in.", details?: unknown) {
    super({
      message,
      code: ErrorCode.AUTH_REQUIRED,
      statusCode: 401,
      isOperational: true,
      details,
    });
  }
}

/**
 * Authorization Error (403)
 * Thrown when the caller does not have sufficient role or clearance.
 */
export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action.", details?: unknown) {
    super({
      message,
      code: ErrorCode.FORBIDDEN,
      statusCode: 403,
      isOperational: true,
      details,
    });
  }
}

/**
 * Not Found Error (404)
 * Thrown when a scan, user, forensic asset, or entity does not exist.
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource", details?: unknown) {
    super({
      message: `${resource} was not found.`,
      code: ErrorCode.NOT_FOUND,
      statusCode: 404,
      isOperational: true,
      details,
    });
  }
}

/**
 * Conflict Error (409)
 * Thrown on duplicate resource collisions or state violations.
 */
export class ConflictError extends AppError {
  constructor(message = "A conflict occurred with an existing resource.", details?: unknown) {
    super({
      message,
      code: ErrorCode.CONFLICT,
      statusCode: 409,
      isOperational: true,
      details,
    });
  }
}

/**
 * Rate Limit Error (429)
 * Thrown when an IP or user exceeds allowable request velocity.
 */
export class RateLimitError extends AppError {
  public readonly retryAfterSeconds?: number;

  constructor(message = "Too many requests. Please slow down.", retryAfterSeconds?: number) {
    super({
      message,
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      statusCode: 429,
      isOperational: true,
      details: retryAfterSeconds ? { retryAfterSeconds } : undefined,
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Threat Engine & Scanner Error (500 / 502 / 504)
 * Thrown when an internal threat detection pipeline, ML model, or heuristic engine fails.
 */
export class ThreatEngineError extends AppError {
  constructor(message = "Threat intelligence analysis failed", options?: {
    code?: ErrorCodeType;
    statusCode?: number;
    details?: unknown;
    cause?: unknown;
  }) {
    super({
      message,
      code: options?.code ?? ErrorCode.THREAT_ENGINE_FAILURE,
      statusCode: options?.statusCode ?? 502,
      isOperational: true,
      details: options?.details,
      cause: options?.cause,
    });
  }
}

/**
 * External Service Error (502 / 503 / 504)
 * Thrown when an upstream provider (e.g., SMTP, WHOIS, DNS resolver) fails.
 */
export class ExternalServiceError extends AppError {
  public readonly serviceName: string;

  constructor(serviceName: string, message?: string, details?: unknown) {
    super({
      message: message ?? `Upstream service '${serviceName}' returned an unexpected error.`,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      statusCode: 503,
      isOperational: true,
      details: { service: serviceName, ...(typeof details === "object" && details ? details : { raw: details }) },
    });
    this.serviceName = serviceName;
  }
}

/**
 * Database Error (500)
 * Thrown when a database query or constraint check unexpectedly fails.
 */
export class DatabaseError extends AppError {
  constructor(message = "Database operation encountered a failure.", details?: unknown) {
    super({
      message,
      code: ErrorCode.DATABASE_CONNECTION_ERROR,
      statusCode: 500,
      isOperational: true,
      details,
    });
  }
}

/**
 * Internal Server Error (500)
 * Unhandled or unexpected application bugs.
 */
export class InternalServerError extends AppError {
  constructor(message = "An unexpected internal server error occurred.", details?: unknown) {
    super({
      message,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      statusCode: 500,
      isOperational: false,
      details,
    });
  }
}
