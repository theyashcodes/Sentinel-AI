/**
 * Common Shared Types
 *
 * Types used across multiple modules.
 */

/** Pagination parameters for list queries */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Sort parameters */
export interface SortParams<T extends string = string> {
  sortBy?: T;
  sortDirection?: SortDirection;
}

/** Filter parameters (generic) */
export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
}

/** Combined query parameters */
export interface QueryParams<TSortField extends string = string>
  extends PaginationParams, SortParams<TSortField>, FilterParams {}

/** Base entity with common fields */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Nullable type helper */
export type Nullable<T> = T | null;

/** Make specific keys optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific keys required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
