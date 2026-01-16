import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData> {
  column: Column<TData, unknown>;
  title: string;
}

export function DataTableColumnHeader<TData>({ column, title }: DataTableColumnHeaderProps<TData>) {
  const { isRTL } = useLanguage();

  if (!column.getCanSort()) {
    return <div className="w-full text-center font-semibold">{title}</div>;
  }

  const sorted = column.getIsSorted();
  const Icon = sorted === 'desc' ? ArrowDown : sorted === 'asc' ? ArrowUp : ChevronsUpDown;

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        // Fill the header cell and center content so header aligns with centered column cells.
        'h-8 w-full justify-center px-3 text-sm font-semibold gap-2'
      )}
    >
      <span>{title}</span>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
