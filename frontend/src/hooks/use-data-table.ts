import * as React from 'react';
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

export type UseDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  pageCount?: number;
  initialState?: {
    sorting?: SortingState;
    pagination?: { pageIndex?: number; pageSize?: number };
    columnVisibility?: VisibilityState;
    columnFilters?: ColumnFiltersState;
  };
  getRowId?: (row: TData) => string;
};

export function useDataTable<TData>({ data, columns, pageCount, initialState, getRowId }: UseDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialState?.sorting ?? []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialState?.columnFilters ?? []);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialState?.columnVisibility ?? {});
  const [globalFilter, setGlobalFilter] = React.useState<string>('');

  // Memoize data to ensure stable reference
  const memoizedData = React.useMemo(() => data, [data]);

  const table = useReactTable({
    data: memoizedData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination: initialState?.pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount,
    manualPagination: Boolean(pageCount),
    getRowId,
    globalFilterFn: 'includesString',
  });

  return { table, setGlobalFilter };
}

export type UseDataTableReturn<TData> = ReturnType<typeof useDataTable<TData>>;
