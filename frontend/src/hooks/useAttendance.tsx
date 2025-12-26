import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { attendanceSessionsApi } from '@/lib/api/client';
import { useLanguage } from './useLanguage';
import type * as AttendanceApi from '@/types/api/attendance';
import type {
  AttendanceRecord,
  AttendanceRecordInsert,
  AttendanceSession,
  AttendanceSessionInsert,
  AttendanceSessionUpdate,
} from '@/types/domain/attendance';
import {
  mapAttendanceRecordApiToDomain,
  mapAttendanceSessionApiToDomain,
  mapAttendanceSessionDomainToInsert,
  mapAttendanceSessionDomainToUpdate,
} from '@/mappers/attendanceMapper';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';

export type AttendanceFilters = {
  classId?: string;
  method?: AttendanceApi.AttendanceMethod;
  status?: AttendanceApi.AttendanceSessionStatus;
  dateFrom?: string;
  dateTo?: string;
  schoolId?: string;
};

export const useAttendanceSessions = (filters: AttendanceFilters = {}, usePaginated: boolean = true) => {
  const { user, profile, profileLoading } = useAuth();
  const isEventUser = profile?.is_event_user === true;
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 10,
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
        const paginatedResponse = apiSessions as any;
        const mapped = (paginatedResponse.data as AttendanceApi.AttendanceSession[]).map(mapAttendanceSessionApiToDomain);
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
    staleTime: 2 * 60 * 1000,
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
  });

  return { session: data, isLoading, error, refetch };
};

export const useCreateAttendanceSession = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

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
  const { t } = useLanguage();
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
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (records: AttendanceRecordInsert[]) => {
      if (!sessionId) throw new Error('Session is required');
      const toPayload = (batch: AttendanceRecordInsert[]) => batch.map(r => ({
        student_id: r.studentId,
        status: r.status,
        note: r.note ?? null,
      }));

      const chunkSize = 200;
      for (let i = 0; i < records.length; i += chunkSize) {
        const batch = records.slice(i, i + chunkSize);
        // eslint-disable-next-line no-await-in-loop
        await attendanceSessionsApi.markRecords(sessionId, { records: toPayload(batch) });
      }
    },
    onSuccess: () => {
      showToast.success('attendancePage.saveSuccess');
      void queryClient.invalidateQueries({ queryKey: ['attendance-session', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'common.error');
    },
  });
};

export const useScanAttendance = (sessionId?: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
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
    onSuccess: (record) => {
      const mapped = mapAttendanceRecordApiToDomain(record as AttendanceApi.AttendanceRecord);
      showToast.success('attendancePage.scanSuccess');
      queryClient.setQueryData(['attendance-session', sessionId], (current: AttendanceSession | undefined) => {
        if (!current) return current;
        const existing = current.records || [];
        const filtered = existing.filter(item => item.studentId !== mapped.studentId);
        return { ...current, records: [{ ...mapped }, ...filtered] };
      });
      queryClient.setQueryData(['attendance-scan-feed', sessionId], (current: AttendanceRecord[] | undefined) => {
        const existing = current || [];
        const withoutDuplicate = existing.filter(item => item.studentId !== mapped.studentId);
        return [mapped, ...withoutDuplicate].slice(0, 50);
      });
      void queryClient.invalidateQueries({ queryKey: ['attendance-session', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'common.error');
    },
  });
};

export const useAttendanceRoster = (classIds?: string[], academicYearId?: string) => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['attendance-roster', classIds?.join(','), academicYearId, profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !classIds || classIds.length === 0) return [];
      return attendanceSessionsApi.roster({ class_ids: classIds, academic_year_id: academicYearId });
    },
    enabled: !!user && !!profile && !!classIds && classIds.length > 0,
  });
};

export const useAttendanceScanFeed = (sessionId?: string, limit: number = 25, enabled: boolean = true) => {
  const { user, profile } = useAuth();
  return useQuery<AttendanceRecord[]>({
    queryKey: ['attendance-scan-feed', sessionId, limit, profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !sessionId) return [];
      const feed = await attendanceSessionsApi.scanFeed(sessionId, { limit });
      return (feed as AttendanceApi.AttendanceRecord[]).map(mapAttendanceRecordApiToDomain);
    },
    enabled: !!user && !!profile && !!sessionId && enabled,
    refetchInterval: enabled && sessionId ? 1500 : false,
  });
};

export const useCloseAttendanceSession = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
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
