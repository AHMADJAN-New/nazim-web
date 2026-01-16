// src/lib/reporting/excelExport.ts
import { loadXlsx } from '@/lib/xlsx-loader';

import type { ReportDefinition } from './types';

import type { School } from '@/hooks/useSchools';

type AnyRow = Record<string, any>;

export async function exportReportToExcel<T extends AnyRow>(
  definition: ReportDefinition<T>,
  rows: T[],
  school: School,
  filtersSummary?: string,
) {
  // Lazy load xlsx library
  const XLSX = await loadXlsx();

  const { columns, title, fileName, showRowNumber = true, rowNumberLabel = '#' } = definition;

  // Build header row
  const dataHeaderRow = columns.map(col => col.label);
  const headerRow = showRowNumber ? [rowNumberLabel, ...dataHeaderRow] : dataHeaderRow;

  // Build data rows
  const dataRows = rows.map((row, index) => {
    const dataCells = columns.map(col => (row[col.key] != null ? row[col.key] : ''));
    return showRowNumber ? [index + 1, ...dataCells] : dataCells;
  });

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
  const dataWidths = columns.map(col => ({
    wch: col.width ?? 20,
  }));
  ws['!cols'] = showRowNumber ? [{ wch: 8 }, ...dataWidths] : dataWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title || 'Report');

  XLSX.writeFile(wb, `${fileName || definition.id}.xlsx`);
}
