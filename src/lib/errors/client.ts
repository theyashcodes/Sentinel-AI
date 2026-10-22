"use client";

import { useState, useCallback } from "react";

export interface ParsedApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  timestamp?: string;
  status?: number;
}

/**
 * Safely parse any API response or error into a structured error object.
 */
export function parseApiError(error: unknown, fallbackMessage = "An unexpected error occurred."): ParsedApiError {
  // If already parsed or matches envelope
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;

    // Handle { success: false, error: { code, message, ... } }
    if (obj.error && typeof obj.error === "object" && obj.error !== null) {
      const inner = obj.error as Record<string, unknown>;
      return {
        code: typeof inner.code === "string" ? inner.code : "API_ERROR",
        message: typeof inner.message === "string" ? inner.message : fallbackMessage,
        details: inner.details,
        requestId: typeof inner.requestId === "string" ? inner.requestId : undefined,
        timestamp: typeof inner.timestamp === "string" ? inner.timestamp : undefined,
      };
    }

    // Handle direct message
    if (typeof obj.message === "string") {
      return {
        code: typeof obj.code === "string" ? obj.code : "ERROR",
        message: obj.message,
        details: obj.details,
      };
    }
  }

  // Handle standard Error instance
  if (error instanceof Error) {
    return {
      code: "CLIENT_ERROR",
      message: error.message || fallbackMessage,
    };
  }

  // Handle string error
  if (typeof error === "string") {
    return {
      code: "STRING_ERROR",
      message: error,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: fallbackMessage,
  };
}

/**
 * React hook for managing and displaying error state in views and dashboards
 */
export function useErrorHandler() {
  const [error, setError] = useState<ParsedApiError | null>(null);

  const handleError = useCallback((err: unknown, fallbackMessage?: string) => {
    const parsed = parseApiError(err, fallbackMessage);
    setError(parsed);
    console.error("[Sentinel Error Handler]", parsed);
    return parsed;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null,
  };
}
