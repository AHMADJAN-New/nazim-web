import { FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';

import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { useSchool } from '@/hooks/useSchools';
import { useServerReport } from '@/hooks/useServerReport';
import { useHasFeature } from '@/hooks/useSubscription';
import type { ReportColumn } from '@/lib/reporting/serverReportTypes';
import { showToast } from '@/lib/toast';

export interface MultiSectionReportSection {
  /** Per-section title (e.g., "Class 10A - A") */
  title: string;
  /** Excel sheet name (will be sanitized server-side too) */
  sheetName: string;
  columns: (string | ReportColumn)[];
  rows: Record<string, any>[];
}

export interface MultiSectionReportExportButtonsProps {
  reportKey: string;
  title: string;
  templateType?: string;
  schoolId?: string;
  disabled?: boolean;
  buildFiltersSummary?: () => string;
  /** Build all sections at click time (must match on-screen filters) */
  buildSections: () => Promise<MultiSectionReportSection[]>;
  /** Show a Print button that generates PDF then opens browser print dialog */
  showPrint?: boolean;
  /** Show Excel export button (default true) */
  showExcel?: boolean;
  /** Show PDF export button (default true) */
  showPdf?: boolean;
}

/**
 * Central export buttons for multi-section reports.
 *
 * - Excel: uses central reporting system with parameters.sheets => one sheet per section
 * - PDF: uses central reporting system with template_name=table_multi_sections and parameters.sections => page breaks per section
 * - Shows the same progress dialog UX as ReportExportButtons
 */
export function MultiSectionReportExportButtons({
  reportKey,
  title,
  templateType,
  schoolId,
  disabled = false,
  buildFiltersSummary,
  buildSections,
  showPrint = false,
  showExcel = true,
  showPdf = true,
}: MultiSectionReportExportButtonsProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { selectedSchoolId } = useSchoolContext();

  const effectiveSchoolId = schoolId || selectedSchoolId || profile?.default_school_id;
  const { data: school } = useSchool(effectiveSchoolId || '');
  
  // Only load report templates if report_templates feature is enabled
  const hasReportTemplatesFeature = useHasFeature('report_templates');
  const { data: templates } = useReportTemplates(
    hasReportTemplatesFeature ? effectiveSchoolId : undefined
  );

  const defaultTemplate = useMemo(() => {
    // If feature is disabled, don't use custom templates
    if (!hasReportTemplatesFeature) return null;
    if (!templates || !templateType) return null;
    return (
      templates.find((tpl) => tpl.is_default && tpl.template_type === templateType && tpl.is_active) ||
      templates.find((tpl) => tpl.template_type === templateType && tpl.is_active) ||
      null
    );
  }, [hasReportTemplatesFeature, templates, templateType]);

  const {
    generateReport,
    status,
    progress,
    downloadUrl,
    fileName,
    isGenerating,
    error: reportError,
    downloadReport,
    reset: resetReport,
  } = useServerReport();
  
  // Track reportId separately to construct download URL if needed
  const reportIdRef = useRef<string | null>(null);

  const [showProgress, setShowProgress] = useState(false);
  // Use a ref to track the latest downloadUrl (for use in callbacks)
  const downloadUrlRef = useRef<string | null>(null);

  // Update ref whenever downloadUrl changes
  useEffect(() => {
    downloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  const filtersSummary = buildFiltersSummary?.() || '';

  const isDisabled = disabled || !school || isGenerating;

  const generateExcel = async () => {
    if (!school) {
      showToast.error(t('events.exportErrorNoSchool') || 'School is required for export');
      return;
    }

    const sections = await buildSections();
    if (!sections || sections.length === 0) {
      showToast.error(t('events.exportErrorNoData') || 'No data to export');
      return;
    }

    // Use first section columns/rows for required request fields, but drive multi-sheet via parameters.sheets
    const first = sections[0];

    setShowProgress(true);
    resetReport();

    await generateReport({
      reportKey,
      reportType: 'excel',
      title,
      columns: first.columns,
      rows: first.rows,
      brandingId: school.id,
      reportTemplateId: hasReportTemplatesFeature && defaultTemplate ? defaultTemplate.id : null,
      parameters: {
        filters_summary: filtersSummary || undefined,
        sheets: sections.map((s) => ({
          sheet_name: s.sheetName,
          title: s.title,
          columns: s.columns,
          rows: s.rows,
        })),
      },
      // IMPORTANT:
      // Run Excel generation synchronously so multi-sheet support works immediately
      // even if a queue worker hasn't been restarted yet.
      // (PDF remains async because it can be heavier.)
      async: false,
      onComplete: () => {
        showToast.success(t('events.exportSuccessExcel') || 'Excel report generated successfully');
        setTimeout(() => {
          downloadReport();
        }, 300);
        setShowProgress(false);
      },
      onError: (err) => {
        showToast.error(err || t('events.exportErrorExcel') || 'Failed to generate Excel report');
        setShowProgress(false);
      },
    });
  };

  const generatePdf = async (mode: 'download' | 'print') => {
    if (!school) {
      showToast.error(t('events.exportErrorNoSchool') || 'School is required for export');
      return;
    }

    const sections = await buildSections();
    if (!sections || sections.length === 0) {
      showToast.error(t('events.exportErrorNoData') || 'No data to export');
      return;
    }

    const first = sections[0];

    setShowProgress(true);
    resetReport();

    await generateReport({
      reportKey,
      reportType: 'pdf',
      title,
      columns: first.columns,
      rows: first.rows,
      brandingId: school.id,
      reportTemplateId: hasReportTemplatesFeature && defaultTemplate ? defaultTemplate.id : null,
      templateName: 'table_multi_sections',
      parameters: {
        filters_summary: filtersSummary || undefined,
        sections: sections.map((s) => ({
          title: s.title,
          columns: s.columns,
          rows: s.rows,
        })),
      },
      async: true,
      onComplete: async (urlFromCallback?: string | null) => {
        try {
          if (mode === 'download') {
            showToast.success(t('events.exportSuccessPdf') || 'PDF report generated successfully');
            setTimeout(() => {
              downloadReport();
            }, 300);
            return;
          }

          // mode === 'print' => fetch blob and print in same tab
          // Use downloadUrl from callback parameter (most reliable) or fallback to ref/state
          let urlToUse = urlFromCallback || downloadUrlRef.current || downloadUrl;
          
          // If still not available, wait a bit for state to update
          if (!urlToUse) {
            await new Promise((r) => setTimeout(r, 500));
            urlToUse = downloadUrlRef.current || downloadUrl;
          }

          if (!urlToUse) {
            throw new Error('Download URL not available for printing. Please try again.');
          }

          const url = new URL(urlToUse);
          let endpoint = url.pathname;
          if (endpoint.startsWith('/api/')) endpoint = endpoint.substring(4);
          if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;

          const { apiClient } = await import('@/lib/api/client');
          const { blob } = await apiClient.requestFile(endpoint);

          const blobUrl = window.URL.createObjectURL(blob);
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = 'none';
          iframe.style.opacity = '0';
          iframe.style.pointerEvents = 'none';
          iframe.src = blobUrl;

          document.body.appendChild(iframe);

          iframe.onload = () => {
            setTimeout(() => {
              try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
              } finally {
                const cleanup = () => {
                  setTimeout(() => {
                    if (iframe.parentNode) document.body.removeChild(iframe);
                    window.URL.revokeObjectURL(blobUrl);
                    window.removeEventListener('afterprint', cleanup);
                  }, 500);
                };
                window.addEventListener('afterprint', cleanup);
                // Fallback cleanup
                setTimeout(cleanup, 30000);
              }
            }, 800);
          };

          showToast.success(t('events.print') || 'Print');
        } catch (e) {
          showToast.error(e instanceof Error ? e.message : (t('events.exportErrorPdf') || 'Failed to generate PDF'));
        } finally {
          setShowProgress(false);
        }
      },
      onError: (err) => {
        showToast.error(err || t('events.exportErrorPdf') || 'Failed to generate PDF report');
        setShowProgress(false);
      },
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showPrint ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void generatePdf('print')}
            disabled={isDisabled}
            className="flex-shrink-0"
          >
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('events.print') || 'Print'}</span>
            <span className="sm:hidden">Print</span>
          </Button>
        ) : null}

        {showExcel ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => void generateExcel()} 
            disabled={isDisabled}
            className="flex-shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('events.exportExcel') || 'Export Excel'}</span>
            <span className="sm:hidden">Excel</span>
          </Button>
        ) : null}

        {showPdf ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => void generatePdf('download')} 
            disabled={isDisabled}
            className="flex-shrink-0"
          >
            <FileDown className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('events.exportPdf') || 'Export PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        ) : null}
      </div>

      <ReportProgressDialog
        open={showProgress}
        onOpenChange={setShowProgress}
        status={status}
        progress={progress}
        fileName={fileName}
        error={reportError}
        onDownload={downloadReport}
      />
    </>
  );
}


