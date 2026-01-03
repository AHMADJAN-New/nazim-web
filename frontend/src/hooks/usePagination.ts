import { useState, useCallback, useMemo } from 'react';

import type { PaginationMeta, PaginationState, PageSizeOption } from '@/types/pagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/types/pagination';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: PageSizeOption;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  reset: () => void;
  paginationState: PaginationState | null;
  updateFromMeta: (meta: PaginationMeta | null) => void;
}

/**
 * Hook for managing pagination state
 * 
 * @example
 * ```tsx
 * const { page, pageSize, setPage, setPageSize, paginationState } = usePagination();
 * 
 * const { data, pagination } = useQuery({
 *   queryKey: ['resource', page, pageSize],
 *   queryFn: () => apiClient.resource.list({ page, per_page: pageSize })
 * });
 * 
 * // Update pagination state from API response
 * useEffect(() => {
 *   if (pagination?.meta) {
 *     updateFromMeta(pagination.meta);
 *   }
 * }, [pagination]);
 * ```
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = DEFAULT_PAGE_SIZE,
    onPageChange,
    onPageSizeChange,
  } = options;

  const [page, setPageState] = useState<number>(initialPage);
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const setPage = useCallback(
    (newPage: number) => {
      if (newPage < 1) return;
      setPageState(newPage);
      onPageChange?.(newPage);
    },
    [onPageChange]
  );

  const setPageSize = useCallback(
    (newPageSize: number) => {
      if (!PAGE_SIZE_OPTIONS.includes(newPageSize as PageSizeOption)) {
        console.warn(`Invalid page size: ${newPageSize}. Must be one of: ${PAGE_SIZE_OPTIONS.join(', ')}`);
        return;
      }
      setPageSizeState(newPageSize);
      // Reset to first page when page size changes
      setPageState(1);
      onPageSizeChange?.(newPageSize);
    },
    [onPageChange, onPageSizeChange]
  );

  const reset = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
    setMeta(null);
  }, [initialPage, initialPageSize]);

  const updateFromMeta = useCallback((newMeta: PaginationMeta | null) => {
    setMeta(newMeta);
    // Sync page state with meta if it exists
    // Use functional update to avoid dependency on page
    if (newMeta) {
      setPageState((currentPage) => {
        if (newMeta.current_page !== currentPage) {
          return newMeta.current_page;
        }
        return currentPage;
      });
    }
  }, []);

  const paginationState = useMemo<PaginationState | null>(() => {
    if (!meta) return null;

    return {
      page: meta.current_page,
      pageSize: meta.per_page,
      total: meta.total,
      totalPages: meta.last_page,
      from: meta.from,
      to: meta.to,
    };
  }, [meta]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    reset,
    paginationState,
    updateFromMeta,
  };
}
