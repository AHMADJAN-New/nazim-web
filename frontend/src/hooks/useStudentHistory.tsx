import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { mapStudentHistoryApiToDomain } from '@/mappers/studentHistoryMapper';
import type * as StudentHistoryApi from '@/types/api/studentHistory';
import type { StudentHistory, StudentHistoryFilters, StudentHistoryExportRequest } from '@/types/domain/studentHistory';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import type { ReportStatus } from '@/lib/reporting/serverReportTypes';
import { useServerReport } from '@/hooks/useServerReport';

// Re-export domain types for convenience
export type {
  StudentHistory,
  StudentBasicInfo,
  HistorySummary,
  HistoryEvent,
  HistorySections,
  AdmissionRecord,
  AttendanceHistory,
  ExamHistory,
  FeeHistory,
  LibraryHistory,
  IdCardHistory,
  CourseHistory,
  GraduationHistory,
  StudentHistoryFilters,
  StudentHistoryExportRequest,
} from '@/types/domain/studentHistory';

/**
 * Hook to fetch complete student history
 */
export const useStudentHistory = (studentId: string | undefined, filters?: StudentHistoryFilters) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<StudentHistory | null>({
    queryKey: ['student-history', studentId, profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile || !studentId) {
        if (import.meta.env.DEV) {
          console.log('[useStudentHistory] Missing user, profile, or studentId');
        }
        return null;
      }

      const params: Record<string, string> = {};
      if (filters?.dateFrom) {
        params.date_from = filters.dateFrom.toISOString().slice(0, 10);
      }
      if (filters?.dateTo) {
        params.date_to = filters.dateTo.toISOString().slice(0, 10);
      }

      const response = await apiClient.get<StudentHistoryApi.StudentHistoryResponse>(
        `/students/${studentId}/history`,
        params
      );

      return mapStudentHistoryApiToDomain(response);
    },
    enabled: !!user && !!profile && !!studentId && !!profile.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to fetch a specific section of student history (lazy loading)
 */
export const useStudentHistorySection = (
  studentId: string | undefined,
  section: string | undefined,
  filters?: StudentHistoryFilters
) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['student-history-section', studentId, section, profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile || !studentId || !section) {
        return null;
      }

      const params: Record<string, string> = {};
      if (filters?.dateFrom) {
        params.date_from = filters.dateFrom.toISOString().slice(0, 10);
      }
      if (filters?.dateTo) {
        params.date_to = filters.dateTo.toISOString().slice(0, 10);
      }

      return await apiClient.get(`/students/${studentId}/history/${section}`, params);
    },
    enabled: !!user && !!profile && !!studentId && !!section && !!profile.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Shared report runner for student history exports (PDF/Excel) using backend endpoints,
 * but exposing the same progress state as the central report system.
 */
function useExportStudentHistoryReport(reportType: 'pdf' | 'excel') {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [isPolling, setIsPolling] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);

  const reset = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollAttemptsRef.current = 0;
    setIsPolling(false);
    setReportId(null);
    setStatus(null);
    setProgress(0);
    setDownloadUrl(null);
    setFileName(null);
    setError(null);
  }, []);

  const downloadReport = useCallback(async () => {
    if (!downloadUrl || !reportId) return;

    try {
      const url = new URL(downloadUrl);
      let endpoint = url.pathname;

      // Remove /api prefix if present (apiClient adds /api itself)
      if (endpoint.startsWith('/api/')) {
        endpoint = endpoint.substring(4);
      } else if (endpoint.startsWith('/api')) {
        endpoint = endpoint.substring(4);
      }

      if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
      }

      const { blob, filename } = await apiClient.requestFile(endpoint);
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || fileName || (reportType === 'pdf' ? 'student-history.pdf' : 'student-history.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (t('toast.reportDownloadFailed') || 'Failed to download report');
      setError(msg);
      showToast.error(msg);
    }
  }, [downloadUrl, reportId, fileName, reportType, t]);

  const pollReportStatus = (id: string): void => {
    setIsPolling(true);
    setStatus('pending');
    setProgress(0);
    setError(null);
    pollAttemptsRef.current = 0;
    const maxAttempts = 300; // 5 minutes max

    const poll = async (): Promise<void> => {
      try {
        // Clear any existing interval
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        if (pollAttemptsRef.current >= maxAttempts) {
          setIsPolling(false);
          setStatus('failed');
          setError(t('toast.reportGenerationTimeout') || 'Report generation timed out');
          showToast.error(t('toast.reportGenerationTimeout') || 'Report generation timed out');
          return;
        }

        pollAttemptsRef.current++;

        const response = await apiClient.get<{
          success: boolean;
          status: ReportStatus;
          progress: number;
          download_url?: string | null;
          file_name?: string | null;
          error_message?: string | null;
          error?: string;
        }>(`/reports/${id}/status`);

        if (!response.success) {
          setIsPolling(false);
          setStatus('failed');
          setError(response.error || response.error_message || t('toast.reportGenerationFailed') || 'Failed to generate report');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          showToast.error(response.error || response.error_message || t('toast.reportGenerationFailed') || 'Failed to generate report');
          return;
        }

        setStatus(response.status);
        setProgress(response.progress ?? 0);
        setDownloadUrl(response.download_url || null);
        setFileName(response.file_name || null);
        setError(response.error_message || response.error || null);

        if (response.status === 'completed' && response.download_url) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setStatus('completed');
          setProgress(100);
          setDownloadUrl(response.download_url || null);
          setFileName(response.file_name || null);

          // Authenticated download (same approach as central export buttons)
          await downloadReport();

          showToast.success(t('toast.reportDownloaded') || 'Report downloaded successfully');
          return;
        }

        if (response.status === 'failed') {
          setIsPolling(false);
          setStatus('failed');
          setError(response.error_message || response.error || t('toast.reportGenerationFailed') || 'Failed to generate report');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          showToast.error(response.error_message || response.error || t('toast.reportGenerationFailed') || 'Failed to generate report');
          return;
        }

        // Continue polling if still processing
        if (response.status === 'pending' || response.status === 'processing') {
          pollIntervalRef.current = setTimeout(poll, 1000); // Poll every second
        } else {
          setIsPolling(false);
        }
      } catch (error) {
        setIsPolling(false);
        setStatus('failed');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        const errorMessage = error instanceof Error ? error.message : 'Failed to check report status';
        setError(errorMessage);
        showToast.error(errorMessage);
      }
    };

    // Start polling immediately
    void poll();
  };

  const mutation = useMutation({
    mutationFn: async ({
      studentId,
      options,
    }: {
      studentId: string;
      options?: StudentHistoryExportRequest;
    }) => {
      const params: Record<string, string | string[]> = {};
      if (options?.brandingId) params.branding_id = options.brandingId;
      if (options?.calendarPreference) params.calendar_preference = options.calendarPreference;
      if (options?.language) params.language = options.language;
      if (options?.sections) params.sections = options.sections;

      const response = await apiClient.post<{ id: string; status: ReportStatus; message?: string }>(
        `/students/${studentId}/history/export/${reportType}`,
        params
      );

      return response;
    },
    onSuccess: (data) => {
      if (data.id) {
        setReportId(data.id);
        setStatus(data.status ?? 'pending');
        setProgress(0);
        setError(null);
        showToast.success(t('toast.reportGenerationStarted') || 'Report generation started');
        void queryClient.invalidateQueries({ queryKey: ['reports'] });
        // Start polling for status
        void pollReportStatus(data.id);
      } else {
        setStatus('failed');
        setError(t('toast.reportGenerationFailed') || 'Failed to start report generation');
        showToast.error(t('toast.reportGenerationFailed') || 'Failed to start report generation');
      }
    },
    onError: (error: Error) => {
      setStatus('failed');
      setError(error.message || t('toast.reportGenerationFailed') || 'Failed to generate report');
      showToast.error(error.message || t('toast.reportGenerationFailed') || 'Failed to generate report');
    },
  });

  return {
    ...mutation,
    reportId,
    isPolling,
    status,
    progress,
    downloadUrl,
    fileName,
    error,
    downloadReport,
    reset,
  };
}

/**
 * Hook to export student history as PDF (with progress state)
 * Uses useServerReport for consistent progress tracking
 */
export const useExportStudentHistoryPdf = () => {
  const { t } = useLanguage();
  const {
    generateReport,
    status,
    progress,
    downloadUrl,
    fileName,
    isGenerating,
    error,
    downloadReport,
    reset,
  } = useServerReport();

  const mutation = useMutation({
    mutationFn: async ({
      studentId,
      options,
    }: {
      studentId: string;
      options?: StudentHistoryExportRequest;
    }) => {
      // Call the central generateReport function
      await generateReport({
        reportKey: 'student_lifetime_history',
        reportType: 'pdf',
        title: t('studentHistory.lifetimeHistory') || 'Student Lifetime History',
        columns: [], // Columns are handled by the custom Blade template
        rows: [],    // Rows are handled by the custom Blade template
        brandingId: options?.brandingId,
        calendarPreference: options?.calendarPreference,
        language: options?.language,
        templateName: 'student-history', // Explicitly use the custom template
        parameters: {
          student_id: studentId, // Pass student ID as a parameter for the backend to fetch data
          sections: options?.sections,
        },
        async: true,
      });
    },
    onSuccess: () => {
      // The useServerReport hook handles success toasts and download
    },
    onError: (err: Error) => {
      // The useServerReport hook handles error toasts
      console.error('PDF export mutation error:', err);
    },
  });

  return {
    ...mutation,
    status,
    progress,
    fileName,
    downloadUrl,
    isPolling: isGenerating, // Expose isGenerating as isPolling for consistency
    isPending: mutation.isPending || isGenerating, // Include isGenerating in isPending
    error,
    downloadReport,
    reset,
  };
};

/**
 * Hook to export student history as Excel (with progress state)
 * Uses useServerReport for consistent progress tracking
 */
export const useExportStudentHistoryExcel = () => {
  const { t } = useLanguage();
  const {
    generateReport,
    status,
    progress,
    downloadUrl,
    fileName,
    isGenerating,
    error,
    downloadReport,
    reset,
  } = useServerReport();

  const mutation = useMutation({
    mutationFn: async ({
      studentId,
      options,
    }: {
      studentId: string;
      options?: StudentHistoryExportRequest;
    }) => {
      // Call the central generateReport function
      await generateReport({
        reportKey: 'student_lifetime_history',
        reportType: 'excel',
        title: t('studentHistory.lifetimeHistory') || 'Student Lifetime History',
        columns: [], // Columns are handled by the custom Blade template
        rows: [],    // Rows are handled by the custom Blade template
        brandingId: options?.brandingId,
        calendarPreference: options?.calendarPreference,
        language: options?.language,
        templateName: null, // Excel uses multi-sheet structure, no template needed
        parameters: {
          student_id: studentId, // Pass student ID as a parameter for the backend to fetch data
          sections: options?.sections,
        },
        async: true, // Excel can also be async
      });
    },
    onSuccess: () => {
      // The useServerReport hook handles success toasts and download
    },
    onError: (err: Error) => {
      // The useServerReport hook handles error toasts
      console.error('Excel export mutation error:', err);
    },
  });

  return {
    ...mutation,
    status,
    progress,
    fileName,
    downloadUrl,
    isPolling: isGenerating, // Expose isGenerating as isPolling for consistency
    isPending: mutation.isPending || isGenerating, // Include isGenerating in isPending
    error,
    downloadReport,
    reset,
  };
};

