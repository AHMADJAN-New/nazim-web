// src/lib/reporting/index.ts
import type { ReportDefinition } from './types';
import type { School } from '@/hooks/useSchools';
import type { ReportTemplate } from '@/hooks/useReportTemplates';

import { resolveReportBranding } from './branding';
import { exportReportToPdf } from './pdfExport';
import { exportReportToExcel } from './excelExport';

type AnyRow = Record<string, any>;

export type ReportFormat = 'pdf' | 'excel';

export interface ExportReportOptions<T extends AnyRow> {
  format: ReportFormat;
  definition: ReportDefinition<T>;
  rows: T[];
  school: School;
  template?: ReportTemplate | null;
  filtersSummary?: string; // e.g. "Year: 1404 | Building: Main Campus"
}

/**
 * Export report using client-side generation (pdfmake/xlsx)
 * For server-side generation with better branding support, use useServerReport hook
 */
export async function exportReport<T extends AnyRow>({
  format,
  definition,
  rows,
  school,
  template,
  filtersSummary,
}: ExportReportOptions<T>) {
  if (!rows || rows.length === 0) {
    console.warn('No data to export for report:', definition.id);
    return;
  }

  const branding = await resolveReportBranding(school, template);

  if (format === 'pdf') {
    await exportReportToPdf({
      definition,
      rows,
      branding,
      school,
      filtersSummary,
    });
  } else {
    exportReportToExcel(definition, rows, school, filtersSummary);
  }
}

// Export types
export * from './types';

// Export server-side report types
export * from './serverReportTypes';


