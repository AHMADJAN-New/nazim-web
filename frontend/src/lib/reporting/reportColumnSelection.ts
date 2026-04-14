import type { ReportColumn } from '@/lib/reporting/serverReportTypes';

export const getAllReportColumnKeys = (columns: ReportColumn[]): string[] =>
  columns.map((column) => column.key);

export const normalizeSelectedReportColumnKeys = (
  columns: ReportColumn[],
  selectedKeys: string[]
): string[] => {
  const validKeys = new Set(getAllReportColumnKeys(columns));
  const selectedSet = new Set(selectedKeys.filter((key) => validKeys.has(key)));

  return columns
    .map((column) => column.key)
    .filter((key) => selectedSet.has(key));
};

export const getDefaultReportColumnKeys = (
  columns: ReportColumn[],
  preferredKeys: string[]
): string[] => {
  const normalized = normalizeSelectedReportColumnKeys(columns, preferredKeys);
  return normalized.length > 0 ? normalized : getAllReportColumnKeys(columns);
};

export const filterSelectedReportColumns = (
  columns: ReportColumn[],
  selectedKeys: string[]
): ReportColumn[] => {
  const selectedSet = new Set(normalizeSelectedReportColumnKeys(columns, selectedKeys));
  return columns.filter((column) => selectedSet.has(column.key));
};

export const toggleSelectedReportColumnKey = (
  columns: ReportColumn[],
  selectedKeys: string[],
  key: string,
  shouldSelect: boolean
): string[] => {
  const nextSelection = new Set(normalizeSelectedReportColumnKeys(columns, selectedKeys));

  if (shouldSelect) {
    nextSelection.add(key);
  } else {
    nextSelection.delete(key);
  }

  return normalizeSelectedReportColumnKeys(columns, Array.from(nextSelection));
};
