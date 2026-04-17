import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from './useAuth';
import { usePagination } from './usePagination';

import { attendanceSessionsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import {
  mapAttendanceRecordApiToDomain,
  mapAttendanceSessionApiToDomain,
  mapAttendanceSessionDomainToInsert,
  mapAttendanceSessionDomainToUpdate,
} from '@/mappers/attendanceMapper';
import type * as AttendanceApi from '@/types/api/attendance';
import type {
  AttendanceRecord,
  AttendanceRecordInsert,
  AttendanceSession,
  AttendanceSessionInsert,
  AttendanceSessionUpdate,
} from '@/types/domain/attendance';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';

type AttendanceSessionsPaginationApi = {
  current_page: number;
  data: AttendanceApi.AttendanceSession[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};


export type AttendanceFilters = {
  classId?: string;
  method?: AttendanceApi.AttendanceMethod;
  status?: AttendanceApi.AttendanceSessionStatus;
  dateFrom?: string;
  dateTo?: string;
  schoolId?: string;
};

export const useAttendanceSessions = (
  filters: AttendanceFilters = {},
  usePaginated: boolean = true,
  initialPageSize: number = 10
) => {
  const { user, profile, profileLoading } = useAuth();
  const isEventUser = profile?.is_event_user === true;
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize,
  });

  const { data, isLoading, error } = useQuery<AttendanceSession[] | PaginatedResponse<AttendanceApi.AttendanceSession>>({
    queryKey: [
      'attendance-sessions',
      profile?.organization_id ?? null,
      profile?.default_school_id ?? null,
      filters,
      usePaginated ? page : undefined,
      usePaginated ? pageSize : undefined,
    ],
    queryFn: async () => {
      if (!user || !profile) return [];

      const params: Record<string, string | number | undefined> = {
        class_id: filters.classId,
        method: filters.method,
        status: filters.status,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
      };
      // Strict school scoping: do not allow client-selected school_id.

      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }

      const apiSessions = await attendanceSessionsApi.list(params);

      if (usePaginated && apiSessions && typeof apiSessions === 'object' && 'data' in apiSessions && 'current_page' in apiSessions) {
        const paginatedResponse = apiSessions as AttendanceSessionsPaginationApi;
        const mapped = paginatedResponse.data.map(mapAttendanceSessionApiToDomain);
        const meta: PaginationMeta = {
          current_page: paginatedResponse.current_page,
          from: paginatedResponse.from,
          last_page: paginatedResponse.last_page,
          per_page: paginatedResponse.per_page,
          to: paginatedResponse.to,
          total: paginatedResponse.total,
          path: paginatedResponse.path,
          first_page_url: paginatedResponse.first_page_url,
          last_page_url: paginatedResponse.last_page_url,
          next_page_url: paginatedResponse.next_page_url,
          prev_page_url: paginatedResponse.prev_page_url,
        };
        return { data: mapped, meta } as PaginatedResponse<AttendanceApi.AttendanceSession>;
      }

      return (apiSessions as AttendanceApi.AttendanceSession[]).map(mapAttendanceSessionApiToDomain);
    },
    enabled: !!user && !!profile && !profileLoading && !isEventUser, // Disable for event users and wait for profile
    staleTime: 5 * 60 * 1000, // 5 minutes - increased from 2 minutes
    refetchOnWindowFocus: false, // Prevent refetch on tab switch
    refetchOnReconnect: false, // Prevent refetch on reconnect
  });

  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<AttendanceApi.AttendanceSession>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<AttendanceApi.AttendanceSession> | undefined;
    return {
      sessions: paginatedData?.data || [],
      pagination: paginatedData?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
      isLoading,
      error,
    };
  }

  return {
    sessions: data as AttendanceSession[] | undefined,
    isLoading,
    error,
  };
};

export const useAttendanceSession = (id?: string) => {
  const { user, profile } = useAuth();
  const { data, isLoading, error, refetch } = useQuery<AttendanceSession | undefined>({
    queryKey: ['attendance-session', id, profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !id) return undefined;
      const apiSession = await attendanceSessionsApi.get(id);
      const mapped = mapAttendanceSessionApiToDomain(apiSession as AttendanceApi.AttendanceSession);
      const records = (apiSession as AttendanceApi.AttendanceSession & { records?: AttendanceApi.AttendanceRecord[] }).records;
      return {
        ...mapped,
        records: records?.map(mapAttendanceRecordApiToDomain),
      };
    },
    enabled: !!user && !!profile && !!id,
    staleTime: 30 * 1000, // 30s – avoid refetch on every focus; optimistic updates handle scan
    refetchOnWindowFocus: false,
  });

  return { session: data, isLoading, error, refetch };
};

export const useCreateAttendanceSession = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: AttendanceSessionInsert) => {
      if (!profile?.organization_id) throw new Error('Organization required to create attendance session');
      const apiPayload = mapAttendanceSessionDomainToInsert(payload);
      const apiSession = await attendanceSessionsApi.create(apiPayload);
      return mapAttendanceSessionApiToDomain(apiSession as AttendanceApi.AttendanceSession);
    },
    onSuccess: () => {
      showToast.success('attendancePage.createSuccess');
      void queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'common.error');
    },
  });
};

export const useUpdateAttendanceSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AttendanceSessionUpdate }) => {
      const apiPayload = mapAttendanceSessionDomainToUpdate(data);
      const apiSession = await attendanceSessionsApi.update(id, apiPayload);
      return mapAttendanceSessionApiToDomain(apiSession as AttendanceApi.AttendanceSession);
    },
    onSuccess: (_data, variables) => {
      showToast.success('attendancePage.saveSuccess');
      void queryClient.invalidateQueries({ queryKey: ['attendance-session', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'common.error');
    },
  });
};

export const useMarkAttendance = (sessionId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ records }: { records: AttendanceRecordInsert[]; silent?: boolean }) => {
      if (!sessionId) throw new Error('Session is required');
      let latestSession: AttendanceSession | undefined;
      const toPayload = (batch: AttendanceRecordInsert[]) => batch.map(r => ({
        student_id: r.studentId,
        status: r.status,
        note: r.note ?? null,
      }));

      const chunkSize = 200;
      for (let i = 0; i < records.length; i += chunkSize) {
        const batch = records.slice(i, i + chunkSize);
        const apiSession = await attendanceSessionsApi.markRecords(sessionId, { records: toPayload(batch) });
        const mappedSession = mapAttendanceSessionApiToDomain(apiSession as AttendanceApi.AttendanceSession);
        const sessionRecords = (apiSession as AttendanceApi.AttendanceSession & { records?: AttendanceApi.AttendanceRecord[] }).records;
        latestSession = {
          ...mappedSession,
          records: sessionRecords?.map(mapAttendanceRecordApiToDomain),
        };
      }

      return latestSession;
    },
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueriesData<AttendanceSession | undefined>({ queryKey: ['attendance-session', sessionId] }, () => data);
      }

      if (!variables.silent) {
        showToast.success('attendancePage.saveSuccess');
      }
    },
    onError: (error: Error, variables) => {
      if (!variables.silent) {
        showToast.error(error.message || 'common.error');
      }
    },
  });
};

export const useScanAttendance = (sessionId?: string) => {
  return useMutation({
    mutationFn: async (payload: { cardNumber: string; status?: AttendanceApi.AttendanceStatus; note?: string | null }) => {
      if (!sessionId) throw new Error('Session is required for scanning');
      const record = await attendanceSessionsApi.scan(sessionId, {
        card_number: payload.cardNumber,
        status: payload.status,
        note: payload.note,
      });
      return record as AttendanceApi.AttendanceRecord;
    },
  });
};

export const useAttendanceRoster = (classIds?: string[], academicYearId?: string, isBoarder?: boolean) => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['attendance-roster', classIds?.join(','), academicYearId, isBoarder, profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !classIds || classIds.length === 0) return [];
      return attendanceSessionsApi.roster({
        class_ids: classIds,
        academic_year_id: academicYearId,
        ...(isBoarder !== undefined && { is_boarder: isBoarder }),
      });
    },
    enabled: !!user && !!profile && !!classIds && classIds.length > 0,
  });
};

export const useAttendanceScanFeed = (sessionId?: string, limit: number = 25, enabled: boolean = true) => {
  const { user, profile } = useAuth();
  return useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-scan-feed', sessionId, limit, profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !sessionId) return [];
      const feed = await attendanceSessionsApi.scanFeed(sessionId, { limit });
      return (feed as AttendanceApi.AttendanceRecord[]).map(mapAttendanceRecordApiToDomain);
    },
    enabled: !!user && !!profile && !!sessionId && enabled,
    staleTime: 10 * 1000, // keep feed stable locally; explicit resume refetch handles catch-up after active scans
    refetchInterval: enabled && sessionId ? 5000 : false, // 5s – background sync only, teacher feedback is immediate
    refetchOnWindowFocus: false,
  });
};

export const useCloseAttendanceSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const apiSession = await attendanceSessionsApi.close(sessionId);
      return mapAttendanceSessionApiToDomain(apiSession as AttendanceApi.AttendanceSession);
    },
    onSuccess: () => {
      showToast.success('attendancePage.sessionClosed');
      void queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-session'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'common.error');
    },
  });
};
