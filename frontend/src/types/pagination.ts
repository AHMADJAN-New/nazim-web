// Pagination Types - Shared types for server-side pagination

/**
 * Pagination metadata returned from Laravel API
 * Matches Laravel's pagination response structure
 */
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path?: string;
  first_page_url?: string;
  last_page_url?: string;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

/**
 * Paginated API response wrapper
 * Matches Laravel's paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

/**
 * Pagination query parameters for API requests
 */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

/**
 * Frontend pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number | null;
  to: number | null;
}

/**
 * Default pagination options
 */
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];
