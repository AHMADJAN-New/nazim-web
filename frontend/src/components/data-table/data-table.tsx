import { Table as TableBase, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Table } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface DataTableProps<TData> {
  table: Table<TData>;
  actionBar?: ReactNode;
  children?: ReactNode;
  className?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({ table, actionBar, children, className, onRowClick }: DataTableProps<TData>) {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
      <div className="border rounded-lg">
        {actionBar}
        <ScrollArea className="w-full">
          <TableBase className="min-w-[640px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : header.column.columnDef.header instanceof Function
                        ? header.column.columnDef.header({ column: header.column })
                        : header.column.columnDef.header}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick?.(row.original)}
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{cell.column.columnDef.cell?.({ row })}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                    No data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </TableBase>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
