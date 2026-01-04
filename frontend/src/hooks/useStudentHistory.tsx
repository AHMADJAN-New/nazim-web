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
 */
export const useExportStudentHistoryPdf = () => {
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

      return await apiClient.post(`/students/${studentId}/history/export/pdf`, params);
    },
    onSuccess: (data) => {
      showToast.success(t('toast.reportGenerationStarted') || 'Report generation started');
      // Optionally invalidate reports query to refresh report list
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      return data;
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.reportGenerationFailed') || 'Failed to generate report');
    },
  });
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

