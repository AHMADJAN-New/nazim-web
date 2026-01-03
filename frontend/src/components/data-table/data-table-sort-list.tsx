import type { Table } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DataTableSortListProps<TData> {
  table: Table<TData>;
}

export function DataTableSortList<TData>({ table }: DataTableSortListProps<TData>) {
  const sorting = table.getState().sorting;

  if (!sorting.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {sorting.map((sort) => (
        <Badge key={sort.id} variant="outline" className="flex items-center gap-1">
          <span className="capitalize">{sort.id}</span>
          {sort.desc ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.setSorting(sorting.filter((item) => item.id !== sort.id))}
          >
            <X className="h-4 w-4" />
          </Button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={() => table.resetSorting()}>
        Clear sorting
      </Button>
    </div>
  );
}
