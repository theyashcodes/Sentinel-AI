/**
 * API Response Types
 *
 * Every API response follows a consistent envelope:
 * - Success: { success: true, data: T, meta?: PaginationMeta }
 * - Error:   { success: false, error: { code: string, message: string, details?: unknown } }
 */

/** Successful API response */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Error API response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Union type for all API responses */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Helper to create a success response.
 */
export function createSuccessResponse<T>(data: T, meta?: PaginationMeta): ApiSuccessResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

/**
 * Helper to create an error response.
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
}
