import { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { PaginationMeta } from '@/types/pagination';

export type UseDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  pageCount?: number;
  paginationMeta?: PaginationMeta | null;
  initialState?: {
    sorting?: SortingState;
    pagination?: { pageIndex?: number; pageSize?: number };
    columnVisibility?: VisibilityState;
    columnFilters?: ColumnFiltersState;
  };
  getRowId?: (row: TData) => string;
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
};

export function useDataTable<TData>({ 
  data, 
  columns, 
  pageCount, 
  paginationMeta,
  initialState, 
  getRowId,
  onPaginationChange,
}: UseDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialState?.sorting ?? []);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialState?.columnFilters ?? []);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialState?.columnVisibility ?? {});
  const [globalFilter, setGlobalFilter] = useState<string>('');

  // Determine pagination state
  const isServerSidePagination = Boolean(pageCount || paginationMeta);
  const calculatedPageCount = paginationMeta ? paginationMeta.last_page : pageCount;

  // Sync pagination state from meta if provided
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>(() => {
    if (paginationMeta) {
      return {
        pageIndex: paginationMeta.current_page - 1, // TanStack Table uses 0-based index
        pageSize: paginationMeta.per_page,
      };
    }
    return initialState?.pagination ?? { pageIndex: 0, pageSize: 25 };
  });

  // Update pagination when meta changes
  useEffect(() => {
    if (paginationMeta) {
      setPagination({
        pageIndex: paginationMeta.current_page - 1,
        pageSize: paginationMeta.per_page,
      });
    }
  }, [paginationMeta]);

  // Memoize data to ensure stable reference
  const memoizedData = useMemo(() => data, [data]);

  const table = useReactTable({
    data: memoizedData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      setPagination(newPagination);
      onPaginationChange?.(newPagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Only use client-side pagination if not using server-side
    ...(isServerSidePagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    pageCount: calculatedPageCount,
    manualPagination: isServerSidePagination,
    getRowId,
    globalFilterFn: 'includesString',
  });

  return { table, setGlobalFilter };
}

export type UseDataTableReturn<TData> = ReturnType<typeof useDataTable<TData>>;
