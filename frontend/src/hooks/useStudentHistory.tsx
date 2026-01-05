import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { mapStudentHistoryApiToDomain } from '@/mappers/studentHistoryMapper';
import type * as StudentHistoryApi from '@/types/api/studentHistory';
import type { StudentHistory, StudentHistoryFilters, StudentHistoryExportRequest } from '@/types/domain/studentHistory';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

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
 * Hook to export student history as PDF
 * Returns mutation and report progress state for use with ReportProgressDialog
 */
export const useExportStudentHistoryPdf = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [reportId, setReportId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);

  const pollReportStatus = (id: string): void => {
    setIsPolling(true);
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
          showToast.error(t('toast.reportGenerationTimeout') || 'Report generation timed out');
          return;
        }

        pollAttemptsRef.current++;

        const response = await apiClient.get<{
          success: boolean;
          status: string;
          progress: number;
          download_url?: string | null;
          file_name?: string | null;
          error_message?: string | null;
          error?: string;
        }>(`/reports/${id}/status`);

        if (!response.success) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          showToast.error(response.error || response.error_message || t('toast.reportGenerationFailed') || 'Failed to generate report');
          return;
        }

        if (response.status === 'completed' && response.download_url) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          // Trigger download
          const link = document.createElement('a');
          link.href = response.download_url;
          link.download = response.file_name || 'student-history.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast.success(t('toast.reportDownloaded') || 'Report downloaded successfully');
          return;
        }

        if (response.status === 'failed') {
          setIsPolling(false);
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
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        const errorMessage = error instanceof Error ? error.message : 'Failed to check report status';
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

      const response = await apiClient.post<{ id: string; status: string; message?: string }>(
        `/students/${studentId}/history/export/pdf`,
        params
      );

      return response;
    },
    onSuccess: (data) => {
      if (data.id) {
        setReportId(data.id);
        showToast.success(t('toast.reportGenerationStarted') || 'Report generation started');
        void queryClient.invalidateQueries({ queryKey: ['reports'] });
        // Start polling for status
        void pollReportStatus(data.id);
      } else {
        showToast.error(t('toast.reportGenerationFailed') || 'Failed to start report generation');
      }
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.reportGenerationFailed') || 'Failed to generate report');
    },
  });

  return {
    ...mutation,
    reportId,
    isPolling,
  };
};

/**
 * Hook to export student history as Excel
 */
export const useExportStudentHistoryExcel = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
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

      return await apiClient.post(`/students/${studentId}/history/export/excel`, params);
    },
    onSuccess: (data) => {
      showToast.success(t('toast.reportGenerationStarted') || 'Report generation started');
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      return data;
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.reportGenerationFailed') || 'Failed to generate report');
    },
  });
};

