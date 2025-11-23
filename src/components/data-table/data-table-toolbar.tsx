import { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  children?: ReactNode;
  placeholder?: string;
}

export function DataTableToolbar<TData>({ table, children, placeholder }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().globalFilter?.toString().length;

  return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <Input
            placeholder={placeholder || 'Search...'}
            value={(table.getState().globalFilter as string) ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="w-full sm:w-64"
          />
          {isFiltered ? (
            <Button variant="ghost" onClick={() => table.resetGlobalFilter()} size="sm">
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2 items-center flex-wrap">{children}</div>
      </div>
    </div>
  );
}
