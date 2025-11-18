// src/lib/reporting/pdfExport.ts

// pdfmake imports - use side-effect fonts import so vfs is initialized correctly

// @ts-expect-error – pdfmake build has no proper ESM types
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-expect-error – side-effect import that registers vfs on the pdfMake instance
import 'pdfmake/build/vfs_fonts';

import type { ReportDefinition, ResolvedReportBranding, PageSize } from './types';
import type { School } from '@/hooks/useSchools';

type AnyRow = Record<string, any>;

export interface BuildPdfOptions<T extends AnyRow> {
  definition: ReportDefinition<T>;
  rows: T[];
  branding: ResolvedReportBranding;
  school: School;
  filtersSummary?: string;
}

function normalizePageSize(size?: PageSize): any {
  if (!size) return 'A4';
  if (typeof size === 'string') return size;
  return [size.width, size.height];
}

export function buildPdfDocDefinition<T extends AnyRow>({
  definition,
  rows,
  branding,
  school,
  filtersSummary,
}: BuildPdfOptions<T>) {
  const {
    columns,
    title,
    orientation = 'portrait',
    pageSize,
    tableStyle,
  } = definition;

  const effectiveTableStyle = {
    headerFillColor: tableStyle?.headerFillColor ?? branding.primaryColor,
    headerTextColor: tableStyle?.headerTextColor ?? '#ffffff',
    alternateRowColor: tableStyle?.alternateRowColor ?? '#f9fafb',
    useAlternateRowColors:
      tableStyle?.useAlternateRowColors ?? branding.tableAlternatingColors,
  };

  const tableHeader = columns.map(col => ({
    text: col.label,
    bold: true,
    fillColor: effectiveTableStyle.headerFillColor,
    color: effectiveTableStyle.headerTextColor,
    fontSize: branding.fontSize,
    alignment: col.align ?? 'left',
  }));

  const body = rows.map(row =>
    columns.map(col => ({
      text: row[col.key] != null ? String(row[col.key]) : '',
      fontSize: branding.fontSize,
      alignment: col.align ?? 'left',
    })),
  );

  const widths = columns.map(col => col.pdfWidth ?? '*');

  const content: any[] = [];

  content.push({
    table: {
      headerRows: 1,
      widths,
      body: [tableHeader, ...body],
    },
    layout: effectiveTableStyle.useAlternateRowColors
      ? {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return null; // header already styled
            return rowIndex % 2 === 0
              ? effectiveTableStyle.alternateRowColor
              : null;
          },
        }
      : 'lightHorizontalLines',
  });

  const docDefinition: any = {
    info: {
      title,
    },
    pageSize: normalizePageSize(pageSize),
    pageOrientation: orientation,
    content,
    defaultStyle: {
      fontSize: branding.fontSize,
      // vfs_fonts bundle includes Roboto by default
      font: 'Roboto',
    },
    styles: {
      headerTitle: {
        fontSize: branding.fontSize + 3,
        bold: true,
        alignment: 'center',
      },
      headerSubtitle: {
        fontSize: branding.fontSize + 1,
        alignment: 'center',
      },
      headerFilters: {
        fontSize: branding.fontSize - 1,
        italics: true,
        alignment: 'center',
      },
    },
    header: (currentPage: number, pageCount: number) => {
      // Decide logo placement:
      // - If school + ministry: school left, ministry right
      // - Else if school + secondary: primary left, secondary right
      // - Else if any single logo: right only
      const leftLogo =
        branding.logoDataUrl && branding.ministryLogoDataUrl
          ? branding.logoDataUrl
          : branding.logoDataUrl && branding.secondaryLogoDataUrl
          ? branding.logoDataUrl
          : null;

      const rightLogo =
        branding.logoDataUrl && branding.ministryLogoDataUrl
          ? branding.ministryLogoDataUrl
          : branding.logoDataUrl && branding.secondaryLogoDataUrl
          ? branding.secondaryLogoDataUrl
          : branding.logoDataUrl ||
            branding.secondaryLogoDataUrl ||
            branding.ministryLogoDataUrl ||
            null;

      const centerStack: any[] = [];

      if (school.school_name) {
        centerStack.push({
          text: school.school_name,
          style: 'headerTitle',
          color: branding.primaryColor,
          margin: [0, 0, 0, 2],
        });
      }

      centerStack.push({
        text: title,
        style: 'headerSubtitle',
        margin: [0, 0, 0, 2],
      });

      if (filtersSummary) {
        centerStack.push({
          text: filtersSummary,
          style: 'headerFilters',
          margin: [0, 2, 0, 0],
        });
      }

      if (branding.headerHtml) {
        centerStack.push({
          text: branding.headerHtml.replace(/<[^>]+>/g, ''),
          fontSize: branding.fontSize - 1,
          margin: [0, 2, 0, 0],
        });
      }

      const columnsDef: any[] = [
        leftLogo
          ? {
              image: leftLogo,
              width: 50,
              alignment: 'left',
              margin: [0, 5, 10, 0],
            }
          : { width: 50, text: '' },
        {
          stack: centerStack,
          alignment: 'center',
        },
        rightLogo
          ? {
              image: rightLogo,
              width: 50,
              alignment: 'right',
              margin: [10, 5, 0, 0],
            }
          : { width: 50, text: '' },
      ];

      return {
        margin: [40, 10, 40, 10],
        columns: columnsDef,
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      const contactParts: string[] = [];
      if (school.school_website) contactParts.push(school.school_website);
      if (school.school_email) contactParts.push(school.school_email);
      if (school.school_phone) contactParts.push(school.school_phone);

      const contactLine = contactParts.join(' | ');

      const now = new Date();
      const dateStr = branding.showGenerationDate ? now.toLocaleString() : '';

      const pageInfo =
        branding.showPageNumbers && pageCount > 0
          ? `Page ${currentPage} of ${pageCount}`
          : '';

      const rightLines: string[] = [];
      if (dateStr) rightLines.push(dateStr);
      if (pageInfo) rightLines.push(pageInfo);

      return {
        margin: [40, 0, 40, 20],
        columns: [
          {
            stack: [
              {
                text: contactLine,
                fontSize: branding.fontSize - 1,
              },
              {
                text: 'Generated by Nazim School Management System',
                fontSize: branding.fontSize - 2,
                color: branding.secondaryColor,
                margin: [0, 2, 0, 0],
              },
              branding.footerHtml
                ? {
                    text: branding.footerHtml.replace(/<[^>]+>/g, ''),
                    fontSize: branding.fontSize - 2,
                    margin: [0, 2, 0, 0],
                  }
                : {},
            ].filter(Boolean),
            alignment: 'left',
          },
          {
            alignment: 'right',
            stack: rightLines.map(line => ({
              text: line,
              fontSize: branding.fontSize - 1,
            })),
          },
        ],
      };
    },
  };

  return docDefinition;
}

export async function exportReportToPdf<T extends AnyRow>(
  options: BuildPdfOptions<T>,
) {
  const docDefinition = buildPdfDocDefinition(options);
  (pdfMake as any)
    .createPdf(docDefinition)
    .download(`${options.definition.fileName || options.definition.id}.pdf`);
}
