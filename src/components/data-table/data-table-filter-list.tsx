import type { Table } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DataTableFilterListProps<TData> {
  table: Table<TData>;
}

export function DataTableFilterList<TData>({ table }: DataTableFilterListProps<TData>) {
  const filters = table.getState().columnFilters;

  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Badge key={filter.id} variant="secondary" className="flex items-center gap-1">
          <span className="capitalize">{filter.id}</span>: {String(filter.value)}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
        Clear filters
      </Button>
    </div>
  );
}
