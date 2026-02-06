/**
 * Activity Logs Hook
 *
 * Provides hooks for fetching and managing activity logs data.
 * Uses organization and school context for multi-tenancy.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { activityLogsApi } from '@/lib/api/client';
import type * as ActivityLogApi from '@/types/api/activityLog';
import type { ActivityLog, ActivityLogFilters, ActivityLogPagination } from '@/types/domain/activityLog';
import {
  mapActivityLogApiToDomain,
  mapFiltersToApi,
  mapPaginationApiToDomain,
} from '@/mappers/activityLogMapper';

// Re-export domain types for convenience
export type { ActivityLog, ActivityLogFilters, ActivityLogPagination } from '@/types/domain/activityLog';
export { LOG_NAMES, EVENTS } from '@/types/domain/activityLog';

interface UseActivityLogsParams extends ActivityLogFilters {
  page?: number;
  perPage?: number;
}

export interface UseActivityLogsResult {
  data: ActivityLog[];
  pagination: ActivityLogPagination;
}

/**
 * Hook to fetch paginated activity logs with filters
 */
export const useActivityLogs = (params: UseActivityLogsParams = {}) => {
  const { user, profile } = useAuth();

  return useQuery<UseActivityLogsResult>({
    queryKey: [
      'activity-logs',
      profile?.organization_id ?? null,
      profile?.default_school_id ?? null,
      params.page ?? 1,
      params.perPage ?? 25,
      params.logName,
      params.event,
      params.subjectId,
      params.causerId,
      params.startDate,
      params.endDate,
      params.search,
    ],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        return {
          data: [],
          pagination: {
            currentPage: 1,
            lastPage: 1,
            perPage: 25,
            total: 0,
            from: null,
            to: null,
          },
        };
      }

      // Convert domain filters to API filters
      const apiFilters = mapFiltersToApi(params);

      const response = await activityLogsApi.list({
        page: params.page ?? 1,
        per_page: params.perPage ?? 25,
        ...apiFilters,
      });

      // Map API response to domain types
      const apiResponse = response as ActivityLogApi.ActivityLogPaginatedResponse;

      return {
        data: apiResponse.data.map(mapActivityLogApiToDomain),
        pagination: mapPaginationApiToDomain(apiResponse),
      };
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 30 * 1000, // 30 seconds so new data shows without full reload
    refetchOnWindowFocus: true, // Refetch when user returns to tab so new logs appear
    refetchOnMount: true, // Refetch when navigating to the page
  });
};

/**
 * Hook to fetch available log names for filter dropdown
 */
export const useActivityLogNames = () => {
  const { user, profile } = useAuth();

  return useQuery<string[]>({
    queryKey: ['activity-log-names', profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        return [];
      }

      const response = await activityLogsApi.getLogNames();
      return response.data || [];
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch available event types for filter dropdown
 */
export const useActivityEventTypes = () => {
  const { user, profile } = useAuth();

  return useQuery<string[]>({
    queryKey: ['activity-event-types', profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        return [];
      }

      const response = await activityLogsApi.getEventTypes();
      return response.data || [];
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch activity log statistics
 */
export const useActivityLogStats = () => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['activity-log-stats', profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        return {
          todayCount: 0,
          weekCount: 0,
          uniqueUsersToday: 0,
          topEvents: [],
        };
      }

      const response = await activityLogsApi.getStats();
      return {
        todayCount: response.today_count,
        weekCount: response.week_count,
        uniqueUsersToday: response.unique_users_today,
        topEvents: response.top_events.map((e) => ({
          event: e.event,
          count: e.count,
        })),
      };
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 30 * 1000, // 30 seconds so stats stay in sync with list
    refetchOnWindowFocus: true,
  });
};
