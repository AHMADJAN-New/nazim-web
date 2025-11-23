import { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';
import { Separator } from '@/components/ui/separator';

interface DataTableAdvancedToolbarProps<TData> {
  table: Table<TData>;
  children?: ReactNode;
}

export function DataTableAdvancedToolbar<TData>({ table, children }: DataTableAdvancedToolbarProps<TData>) {
  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">{children}</div>
      <Separator />
      <div className="text-sm text-muted-foreground">
        Showing {table.getRowModel().rows.length} of {table.getPreFilteredRowModel().rows.length} records
      </div>
    </div>
  );
}
