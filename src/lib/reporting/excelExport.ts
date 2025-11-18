// src/lib/reporting/excelExport.ts
import * as XLSX from 'xlsx';
import type { ReportDefinition } from './types';
import type { School } from '@/hooks/useSchools';

type AnyRow = Record<string, any>;

export function exportReportToExcel<T extends AnyRow>(
  definition: ReportDefinition<T>,
  rows: T[],
  school: School,
  filtersSummary?: string,
) {
  const { columns, title, fileName } = definition;

  const headerRow = columns.map(col => col.label);
  const dataRows = rows.map(row =>
    columns.map(col => (row[col.key] != null ? row[col.key] : '')),
  );

  const sheetRows: any[][] = [];

  // Row 1: School name
  sheetRows.push([school.school_name || '', '', '', '']);

  // Row 2: Report title
  sheetRows.push([title, '', '', '']);

  // Row 3: Filters summary (if any)
  if (filtersSummary) {
    sheetRows.push([filtersSummary, '', '', '']);
  }

  // Blank row
  sheetRows.push([]);

  // Table header + data
  sheetRows.push(headerRow);
  sheetRows.push(...dataRows);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);

  // Column widths
  ws['!cols'] = columns.map(col => ({
    wch: col.width ?? 20,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title || 'Report');

  XLSX.writeFile(wb, `${fileName || definition.id}.xlsx`);
}
