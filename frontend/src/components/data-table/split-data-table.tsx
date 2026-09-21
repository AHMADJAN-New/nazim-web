import { flexRender, type Table as TanStackTable } from '@tanstack/react-table';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type SplitDataTableColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

interface SplitDataTableProps<TData> {
  table: TanStackTable<TData>;
  identityColumnIds: string[];
  summaryColumnIds: string[];
  actionBar?: ReactNode;
  emptyMessage?: string;
  className?: string;
}

const WIDE_TABLE_QUERY = '(min-width: 1280px)';

function useWideTableLayout() {
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(WIDE_TABLE_QUERY).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(WIDE_TABLE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsWide(event.matches);

    setIsWide(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isWide;
}

export function SplitDataTable<TData>({
  table,
  identityColumnIds,
  summaryColumnIds,
  actionBar,
  emptyMessage = 'No data found.',
  className,
}: SplitDataTableProps<TData>) {
  const isWide = useWideTableLayout();
  const identityIds = useMemo(() => new Set(identityColumnIds), [identityColumnIds]);
  const summaryIds = useMemo(() => new Set(summaryColumnIds), [summaryColumnIds]);

  const allColumnIds = table.getVisibleLeafColumns().map((column) => column.id);
  const subjectColumnIds = allColumnIds.filter(
    (columnId) => !identityIds.has(columnId) && !summaryIds.has(columnId)
  );

  const renderTable = (columnIds: string[]) => {
    const columnIdSet = new Set(columnIds);
    const rows = table.getRowModel().rows;

    return (
      <Table
        className="table-auto"
        style={{ width: 'max-content' }}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => {
            const headers = headerGroup.headers.filter((header) => columnIdSet.has(header.column.id));
            return (
              <TableRow key={headerGroup.id} className="h-16 hover:bg-transparent">
                {headers.map((header) => {
                  const meta = header.column.columnDef.meta as SplitDataTableColumnMeta | undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn('h-16 px-1.5 whitespace-nowrap', meta?.headerClassName)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            );
          })}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id} className="h-16">
                {row.getVisibleCells()
                  .filter((cell) => columnIdSet.has(cell.column.id))
                  .map((cell) => {
                    const meta = cell.column.columnDef.meta as SplitDataTableColumnMeta | undefined;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn('h-16 px-1.5 py-2 whitespace-nowrap', meta?.cellClassName)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
              </TableRow>
            ))
          ) : (
            <TableRow className="h-24">
              <TableCell colSpan={Math.max(columnIds.length, 1)} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border', className)}>
      {actionBar}
      {isWide ? (
        <div className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] bg-background">
          <div className="border-e bg-background">
            {renderTable(identityColumnIds)}
          </div>
          <div className="min-w-0 overflow-x-auto overscroll-x-contain bg-muted/5">
            {renderTable(subjectColumnIds)}
          </div>
          <div className="border-s bg-background">
            {renderTable(summaryColumnIds)}
          </div>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          {renderTable(allColumnIds)}
        </div>
      )}
    </div>
  );
}
