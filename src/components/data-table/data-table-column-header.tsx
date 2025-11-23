import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Column } from '@tanstack/react-table';

interface DataTableColumnHeaderProps<TData> {
  column: Column<TData, unknown>;
  title: string;
}

export function DataTableColumnHeader<TData>({ column, title }: DataTableColumnHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return <div className="font-semibold">{title}</div>;
  }

  const sorted = column.getIsSorted();
  const Icon = sorted === 'desc' ? ArrowDown : sorted === 'asc' ? ArrowUp : ChevronsUpDown;

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="-ml-3 h-8 px-3 text-sm font-semibold"
    >
      <span>{title}</span>
      <Icon className="ml-2 h-4 w-4" />
    </Button>
  );
}
