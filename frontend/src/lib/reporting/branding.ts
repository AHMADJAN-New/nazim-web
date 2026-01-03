// src/lib/reporting/branding.ts
import type { ResolvedReportBranding } from './types';

import type { ReportTemplate } from '@/hooks/useReportTemplates';
import type { School } from '@/hooks/useSchools';

function uint8ToDataUrl(
  uint8?: Uint8Array | null,
  mimeType = 'image/png',
): Promise<string | null> {
  if (!uint8 || uint8.length === 0) return Promise.resolve(null);

  // Extract the underlying ArrayBuffer to ensure compatibility with Blob
  // This handles the case where Uint8Array has a generic ArrayBufferLike type
  const buffer = uint8.buffer.slice(
    uint8.byteOffset,
    uint8.byteOffset + uint8.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([buffer], { type: mimeType });
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string | null;
      resolve(result);
    };
    reader.readAsDataURL(blob);
  });
}

export async function resolveReportBranding(
  school: School,
  template?: ReportTemplate | null,
): Promise<ResolvedReportBranding> {
  const effectiveFontSize = Number(
    template?.report_font_size ?? school.report_font_size ?? '11',
  );

  const tableAlternatingColors =
    template?.table_alternating_colors ?? school.table_alternating_colors ?? true;

  const showPageNumbers =
    template?.show_page_numbers ?? school.show_page_numbers ?? true;

  const showGenerationDate =
    template?.show_generation_date ?? school.show_generation_date ?? true;

  const reportLogoSelection =
    template?.report_logo_selection ?? school.report_logo_selection ?? 'primary';

  // Decide which logos we may need
  const needPrimary = ['primary', 'both', 'primary_ministry'].includes(
    reportLogoSelection,
  );
  const needSecondary = ['secondary', 'both'].includes(reportLogoSelection);
  const needMinistry = ['ministry', 'primary_ministry'].includes(
    reportLogoSelection,
  );

  const [primaryLogo, secondaryLogo, ministryLogo] = await Promise.all([
    needPrimary
      ? uint8ToDataUrl(
          school.primary_logo_binary || undefined,
          school.primary_logo_mime_type || undefined || 'image/png',
        )
      : Promise.resolve(null),
    needSecondary
      ? uint8ToDataUrl(
          school.secondary_logo_binary || undefined,
          school.secondary_logo_mime_type || undefined || 'image/png',
        )
      : Promise.resolve(null),
    needMinistry
      ? uint8ToDataUrl(
          school.ministry_logo_binary || undefined,
          school.ministry_logo_mime_type || undefined || 'image/png',
        )
      : Promise.resolve(null),
  ]);

  return {
    headerHtml: template?.header_html ?? school.header_text ?? null,
    footerHtml: template?.footer_html ?? school.footer_text ?? null,
    logoDataUrl: primaryLogo,
    secondaryLogoDataUrl: secondaryLogo,
    ministryLogoDataUrl: ministryLogo,
    fontFamily: school.font_family || 'Bahij Nassim',
    fontSize: effectiveFontSize || 11,
    showPageNumbers,
    showGenerationDate,
    tableAlternatingColors,
    primaryColor: school.primary_color || '#00004d',
    secondaryColor: school.secondary_color || '#0056b3',
    accentColor: school.accent_color || '#ff6b35',
  };
}
