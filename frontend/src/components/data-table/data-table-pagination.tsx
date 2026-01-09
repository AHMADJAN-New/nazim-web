import type { Table } from '@tanstack/react-table';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { PAGE_SIZE_OPTIONS } from '@/types/pagination';
import type { PaginationMeta } from '@/types/pagination';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  paginationMeta?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  showTotalCount?: boolean;
}

/**
 * Comprehensive pagination component for data tables
 * Supports server-side pagination with full UI including page numbers, prev/next, page size selector, and total count
 */
export function DataTablePagination<TData>({
  table,
  paginationMeta,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showTotalCount = true,
}: DataTablePaginationProps<TData>) {
  const { t, isRTL } = useLanguage();

  // Get pagination state from table or meta
  const currentPage = paginationMeta?.current_page ?? (table.getState().pagination.pageIndex + 1);
  const pageSize = paginationMeta?.per_page ?? table.getState().pagination.pageSize;
  const totalPages = paginationMeta?.last_page ?? table.getPageCount();
  
  // For client-side pagination, get total from table's data length
  // For server-side pagination, use paginationMeta.total
  let total: number;
  if (paginationMeta !== null && paginationMeta !== undefined) {
    // Server-side pagination: use meta total
    total = paginationMeta.total ?? 0;
  } else {
    // Client-side pagination: use table's row count (total data length)
    // getRowCount() returns the total number of rows in the data, not just current page
    total = typeof table.getRowCount === 'function' ? table.getRowCount() : table.getRowModel().rows.length;
    // If getRowCount is not available or returns 0, try to get from table options
    if (total === 0 && table.options.data) {
      total = Array.isArray(table.options.data) ? table.options.data.length : 0;
    }
  }
  
  const from = paginationMeta?.from ?? null;
  const to = paginationMeta?.to ?? null;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    table.setPageIndex(newPage - 1); // TanStack Table uses 0-based index
    onPageChange?.(newPage);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize, 10);
    table.setPageSize(size);
    // Reset to first page when page size changes
    table.setPageIndex(0);
    onPageChange?.(1);
    onPageSizeChange?.(size);
  };

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7; // Show up to 7 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible range
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the start
      if (currentPage <= 3) {
        start = 2;
        end = 4;
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis');
      }

      // Add visible page range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1 && !showTotalCount) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-4 px-2 py-4', isRTL && 'rtl')}>
      {/* Total count and page size selector */}
      <div className="flex items-center justify-between">
        {showTotalCount && (
          <div className="text-sm text-muted-foreground">
            {from !== null && to !== null ? (
              <>
                {t('library.showing') || 'Showing'} {from} {t('events.to') || 'to'} {to} {t('events.of') || 'of'}{' '}
                {total} {t('pagination.entries') || 'entries'}
              </>
            ) : total > 0 ? (
              <>
                {t('events.total') || 'Total'}: {total} {t('pagination.entries') || 'entries'}
              </>
            ) : (
              <>{t('pagination.noEntries') || 'No entries'}</>
            )}
          </div>
        )}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('pagination.rowsPerPage') || 'Rows per page'}:
            </span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) {
                    handlePageChange(currentPage - 1);
                  }
                }}
                className={cn(
                  currentPage <= 1 && 'pointer-events-none opacity-50',
                  'cursor-pointer'
                )}
                aria-disabled={currentPage <= 1}
                href="#"
              />
            </PaginationItem>

            {pageNumbers.map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page);
                    }}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                    href="#"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) {
                    handlePageChange(currentPage + 1);
                  }
                }}
                className={cn(
                  currentPage >= totalPages && 'pointer-events-none opacity-50',
                  'cursor-pointer'
                )}
                aria-disabled={currentPage >= totalPages}
                href="#"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
