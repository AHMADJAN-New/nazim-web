import { Columns3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReportColumn } from '@/lib/reporting/serverReportTypes';
import {
  getAllReportColumnKeys,
  getDefaultReportColumnKeys,
  normalizeSelectedReportColumnKeys,
  toggleSelectedReportColumnKey,
} from '@/lib/reporting/reportColumnSelection';
import { cn } from '@/lib/utils';

export interface ReportColumnSelectorLabels {
  trigger: string;
  core: string;
  selectAll: string;
  clearAll: string;
  empty: string;
}

interface ReportColumnSelectorProps {
  columns: ReportColumn[];
  selectedKeys: string[];
  coreKeys: string[];
  onChange: (keys: string[]) => void;
  labels: ReportColumnSelectorLabels;
  className?: string;
}

export function ReportColumnSelector({
  columns,
  selectedKeys,
  coreKeys,
  onChange,
  labels,
  className,
}: ReportColumnSelectorProps) {
  const normalizedSelectedKeys = normalizeSelectedReportColumnKeys(columns, selectedKeys);
  const selectedSet = new Set(normalizedSelectedKeys);
  const selectedCount = normalizedSelectedKeys.length;
  const totalCount = columns.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-2 whitespace-nowrap', className)}
        >
          <Columns3 className="h-4 w-4" />
          <span>{labels.trigger}</span>
          <span className="text-xs text-muted-foreground">
            {selectedCount}/{totalCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold">{labels.trigger}</div>
          <div className="text-xs text-muted-foreground">
            {selectedCount}/{totalCount}
          </div>
        </div>

        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => onChange(getDefaultReportColumnKeys(columns, coreKeys))}
          >
            {labels.core}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => onChange(getAllReportColumnKeys(columns))}
          >
            {labels.selectAll}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => onChange([])}
          >
            {labels.clearAll}
          </Button>
        </div>

        <ScrollArea className="h-72 px-3 py-2">
          <div className="space-y-2">
            {columns.map((column) => {
              const checkboxId = `report-column-${column.key}`;
              const isChecked = selectedSet.has(column.key);

              return (
                <label
                  key={column.key}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      onChange(
                        toggleSelectedReportColumnKey(columns, normalizedSelectedKeys, column.key, checked === true)
                      )
                    }
                  />
                  <span className="text-sm leading-5">{column.label}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>

        {selectedCount === 0 ? (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {labels.empty}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
