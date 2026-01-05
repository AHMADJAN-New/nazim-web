import { FileDown, FileSpreadsheet } from 'lucide-react';
import { useState, useMemo } from 'react';

import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { useSchool } from '@/hooks/useSchools';
import { useServerReport } from '@/hooks/useServerReport';
import type { ReportColumn } from '@/lib/reporting/serverReportTypes';
import { showToast } from '@/lib/toast';

export interface ReportExportButtonsProps<T extends Record<string, any>> {
  /** The data to export (filtered data matching on-screen filters) */
  data: T[];
  /** Columns configuration for the report */
  columns: (string | ReportColumn)[];
  /** Report key identifier (e.g., 'buildings', 'rooms', 'students') */
  reportKey: string;
  /** Report title */
  title: string;
  /** Transform function to convert domain data to report row format */
  transformData: (data: T[]) => Record<string, any>[];
  /** Optional function to build filters summary string */
  buildFiltersSummary?: () => string;
  /** School ID (optional, will use profile default if not provided) */
  schoolId?: string;
  /** Template type for finding default template (e.g., 'buildings', 'rooms') */
  templateType?: string;
  /** Disabled state (e.g., when no data or loading) */
  disabled?: boolean;
  /** Error message when no school is available */
  errorNoSchool?: string;
  /** Error message when no data to export */
  errorNoData?: string;
  /** Success message for PDF export */
  successPdf?: string;
  /** Success message for Excel export */
  successExcel?: string;
  /** Error message for PDF export */
  errorPdf?: string;
  /** Error message for Excel export */
  errorExcel?: string;
  /** Additional parameters to pass to report generation */
  parameters?: Record<string, any>;
  /** Custom button size */
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  /** Custom button variant */
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  /** Show only PDF button */
  showPdfOnly?: boolean;
  /** Show only Excel button */
  showExcelOnly?: boolean;
}

/**
 * Reusable component for PDF and Excel export buttons with progress dialog
 * 
 * Features:
 * - Matches on-screen filters (uses provided filtered data)
 * - PDF includes: title, org/school name, date range, page numbers
 * - Excel includes: title row, column headings, totals row (where applicable)
 * - RTL text support (handled by backend)
 * - Progress tracking with dialog
 * - Auto-download on completion
 */
export function ReportExportButtons<T extends Record<string, any>>({
  data,
  columns,
  reportKey,
  title,
  transformData,
  buildFiltersSummary,
  schoolId,
  templateType,
  disabled = false,
  errorNoSchool,
  errorNoData,
  successPdf,
  successExcel,
  errorPdf,
  errorExcel,
  parameters,
  buttonSize = 'sm',
  buttonVariant = 'outline',
  showPdfOnly = false,
  showExcelOnly = false,
}: ReportExportButtonsProps<T>) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { selectedSchoolId } = useSchoolContext();
  
  // Get school ID priority: provided schoolId > selectedSchoolId from context > profile default
  // This ensures reports work correctly when users switch schools
  const effectiveSchoolId = schoolId || selectedSchoolId || profile?.default_school_id;
  const { data: school } = useSchool(effectiveSchoolId || '');
  const { data: templates } = useReportTemplates(effectiveSchoolId);
  
  // Report generation hook
  const {
    generateReport,
    status,
    progress,
    downloadUrl,
    isGenerating,
    error: reportError,
    downloadReport,
    reset: resetReport,
  } = useServerReport();
  
  const [showReportProgress, setShowReportProgress] = useState(false);

  // Find default template for the report type
  const defaultTemplate = useMemo(() => {
    if (!templates || !templateType) return null;
    return (
      templates.find(
        (t) => t.is_default && t.template_type === templateType && t.is_active
      ) ||
      templates.find((t) => t.template_type === templateType && t.is_active) ||
      null
    );
  }, [templates, templateType]);

  // Build filters summary
  const filtersSummary = buildFiltersSummary?.() || '';

  // Export handlers
  const handleExport = async (reportType: 'pdf' | 'excel') => {
    // Validation
    if (!school) {
      showToast.error(
        errorNoSchool || t('events.exportErrorNoSchool') || 'School is required for export'
      );
      return;
    }

    if (!data || data.length === 0) {
      showToast.error(
        errorNoData || t('events.exportErrorNoData') || 'No data to export'
      );
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`[ReportExportButtons] Generating ${reportType.toUpperCase()} report:`, {
        reportKey,
        schoolId: school.id,
        schoolName: school.school_name,
        brandingId: school.id,
        hasTemplate: !!defaultTemplate,
        templateId: defaultTemplate?.id,
        dataCount: data.length,
      });
    }

    try {
      // Transform data for export
      const reportData = transformData(data);

      // Show progress dialog
      setShowReportProgress(true);
      resetReport();

      // Generate report using central reporting system
      await generateReport({
        reportKey,
        reportType,
        title,
        columns,
        rows: reportData,
        brandingId: school.id, // School.id IS the branding_id (School = SchoolBranding)
        reportTemplateId: defaultTemplate?.id,
        parameters: {
          filters_summary: filtersSummary || undefined,
          ...parameters,
        },
        async: true,
        onProgress: (progress, message) => {
          if (import.meta.env.DEV) {
            console.log(`Report progress: ${progress}%${message ? ` - ${message}` : ''}`);
          }
        },
        onComplete: () => {
          const successMessage =
            reportType === 'pdf'
              ? successPdf || t('events.exportSuccessPdf') || 'PDF report generated successfully'
              : successExcel || t('events.exportSuccessExcel') || 'Excel report generated successfully';
          
          showToast.success(successMessage);
          
          // Auto-download when complete using authenticated download
          // Wait for state to be updated, then download
          setTimeout(() => {
            downloadReport();
          }, 300);
          
          setShowReportProgress(false);
        },
        onError: (error) => {
          const errorMessage =
            reportType === 'pdf'
              ? error || errorPdf || t('events.exportErrorPdf') || 'Failed to generate PDF report'
              : error || errorExcel || t('events.exportErrorExcel') || 'Failed to generate Excel report';
          
          showToast.error(errorMessage);
          setShowReportProgress(false);
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Export error:', error);
      }
      
      const errorMessage =
        reportType === 'pdf'
          ? errorPdf || t('events.exportErrorPdf') || 'Failed to generate PDF report'
          : errorExcel || t('events.exportErrorExcel') || 'Failed to generate Excel report';
      
      showToast.error(
        error instanceof Error ? error.message : errorMessage
      );
      setShowReportProgress(false);
    }
  };

  const handleExportPdf = () => handleExport('pdf');
  const handleExportExcel = () => handleExport('excel');

  // Determine if buttons should be disabled
  const isDisabled = disabled || !data || data.length === 0 || !school || isGenerating;

  const excelLabel = t('events.exportExcel') || 'Export Excel';
  const pdfLabel = t('events.exportPdf') || 'Export PDF';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {!showPdfOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={buttonVariant}
                size={buttonSize}
                onClick={handleExportExcel}
                disabled={isDisabled}
                className="flex-shrink-0"
                aria-label={excelLabel}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{excelLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="sm:hidden">
              <p>{excelLabel}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {!showExcelOnly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={buttonVariant}
                size={buttonSize}
                onClick={handleExportPdf}
                disabled={isDisabled}
                className="flex-shrink-0"
                aria-label={pdfLabel}
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{pdfLabel}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="sm:hidden">
              <p>{pdfLabel}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Report Progress Dialog */}
      <ReportProgressDialog
        open={showReportProgress}
        onOpenChange={setShowReportProgress}
        status={status}
        progress={progress}
        downloadUrl={downloadUrl}
        error={reportError}
        onDownload={downloadReport}
      />
    </TooltipProvider>
  );
}

