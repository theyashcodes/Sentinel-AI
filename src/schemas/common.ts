import { z } from 'zod';

/**
 * Common Zod Schemas
 *
 * Reusable validation schemas used across modules.
 */

/** ID schema (CUID2 or UUID) */
export const idSchema = z.string().min(1, 'ID is required');

/** Email schema */
export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

/** Pagination schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/** Search schema */
export const searchSchema = z.object({
  search: z.string().trim().optional(),
});

/** Date range schema */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/** Sort schema factory */
export function createSortSchema<T extends string>(validFields: readonly T[]) {
  return z.object({
    sortBy: z.enum(validFields as unknown as [T, ...T[]]).optional(),
    sortDirection: z.enum(['asc', 'desc']).default('desc'),
  });
}
