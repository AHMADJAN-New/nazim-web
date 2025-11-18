// src/lib/reporting/types.ts
import type { ReportTemplate } from '@/hooks/useReportTemplates';
import type { School } from '@/hooks/useSchools';

export type PageOrientation = 'portrait' | 'landscape';

export type StandardPageSize = 'A4' | 'A3' | 'LETTER';

export type PageSize =
  | StandardPageSize
  | {
      // PDF points (1pt ≈ 1/72 inch)
      width: number;
      height: number;
    };

export type CellAlignment = 'left' | 'center' | 'right';

export interface ReportColumn<T> {
  key: keyof T;
  label: string;
  width?: number; // Excel width (characters)
  pdfWidth?: '*' | 'auto' | number; // pdfmake column width
  align?: CellAlignment;
}

export interface TableStyle {
  headerFillColor?: string;
  headerTextColor?: string;
  alternateRowColor?: string | null;
  useAlternateRowColors?: boolean;
}

export interface ReportDefinition<T> {
  id: string;             // e.g. 'buildings'
  title: string;          // e.g. 'Buildings Report'
  fileName?: string;      // base filename for exports
  pageSize?: PageSize;    // 'A4', 'A3', or custom
  orientation?: PageOrientation;
  columns: ReportColumn<T>[];
  tableStyle?: TableStyle;
}

export interface ResolvedReportBranding {
  headerHtml: string | null;
  footerHtml: string | null;

  // Logos as data URLs for pdfmake
  logoDataUrl: string | null;             // primary
  secondaryLogoDataUrl?: string | null;   // secondary
  ministryLogoDataUrl?: string | null;    // ministry

  fontFamily: string;
  fontSize: number;

  showPageNumbers: boolean;
  showGenerationDate: boolean;
  tableAlternatingColors: boolean;

  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

// Convenience type to avoid repeating imports everywhere
export type ReportingSchool = School;
export type ReportingTemplate = ReportTemplate;
