import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { leaveRequestsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import type { LeaveRequest, LeaveRequestInsert, LeaveRequestUpdate } from '@/types/domain/leave';
import type * as LeaveApi from '@/types/api/leaveRequest';
import { mapLeaveRequestApiToDomain, mapLeaveRequestDomainToInsert, mapLeaveRequestDomainToUpdate } from '@/mappers/leaveMapper';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';

export type LeaveFilters = {
  studentId?: string;
  classId?: string;
  schoolId?: string;
  status?: LeaveApi.LeaveRequest['status'];
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
};

export const useLeaveRequests = (filters: LeaveFilters = {}) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({ initialPage: 1, initialPageSize: 10 });

  const { data, isLoading, error } = useQuery<PaginatedResponse<LeaveRequest> | LeaveRequest[]>({
    queryKey: ['leave-requests', profile?.organization_id ?? null, filters, page, pageSize],
    queryFn: async () => {
      if (!user || !profile) return [] as LeaveRequest[];
      const params: Record<string, any> = {
        student_id: filters.studentId,
        class_id: filters.classId,
        school_id: filters.schoolId,
        status: filters.status,
        month: filters.month,
        year: filters.year,
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        page,
        per_page: pageSize,
      };
      const response = await leaveRequestsApi.list(params);
      if (response && typeof response === 'object' && 'data' in response && 'current_page' in response) {
        const paginated = response as any;
        const mapped = (paginated.data as LeaveApi.LeaveRequest[]).map(mapLeaveRequestApiToDomain);
        const meta: PaginationMeta = {
          current_page: paginated.current_page,
          from: paginated.from,
          last_page: paginated.last_page,
          per_page: paginated.per_page,
          to: paginated.to,
          total: paginated.total,
          path: paginated.path,
          first_page_url: paginated.first_page_url,
          last_page_url: paginated.last_page_url,
          next_page_url: paginated.next_page_url,
          prev_page_url: paginated.prev_page_url,
        };
        return { data: mapped, meta } as PaginatedResponse<LeaveRequest>;
      }
      return (response as LeaveApi.LeaveRequest[]).map(mapLeaveRequestApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (data && 'meta' in (data as any)) {
      updateFromMeta((data as PaginatedResponse<LeaveRequest>).meta);
    }
  }, [data, updateFromMeta]);

  const paginatedData = data as PaginatedResponse<LeaveRequest> | undefined;

  return {
    requests: paginatedData?.data || (data as LeaveRequest[] | undefined) || [],
    pagination: paginatedData?.meta ?? null,
    paginationState,
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading,
    error,
  };
};

export const useLeaveRequest = (id?: string) => {
  const { user, profile } = useAuth();
  const { data, isLoading, error, refetch } = useQuery<LeaveRequest | undefined>({
    queryKey: ['leave-request', id, profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !id) return undefined;
      const response = await leaveRequestsApi.get(id);
      return mapLeaveRequestApiToDomain(response as LeaveApi.LeaveRequest);
    },
    enabled: !!user && !!profile && !!id,
  });

  return { request: data, isLoading, error, refetch };
};

export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (payload: LeaveRequestInsert) => {
      const apiPayload = mapLeaveRequestDomainToInsert(payload);
      const response = await leaveRequestsApi.create(apiPayload);
      return mapLeaveRequestApiToDomain(response as LeaveApi.LeaveRequest);
    },
    onSuccess: () => {
      toast.success(t('common.savedSuccess') || 'Leave request created');
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'));
    },
  });
};

export const useUpdateLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LeaveRequestUpdate }) => {
      const apiPayload = mapLeaveRequestDomainToUpdate(data);
      const response = await leaveRequestsApi.update(id, apiPayload);
      return mapLeaveRequestApiToDomain(response as LeaveApi.LeaveRequest);
    },
    onSuccess: () => {
      toast.success(t('common.savedSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'));
    },
  });
};

export const useApproveLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string | null }) => {
      const response = await leaveRequestsApi.approve(id, note ? { approval_note: note } : {});
      return mapLeaveRequestApiToDomain(response as LeaveApi.LeaveRequest);
    },
    onSuccess: () => {
      toast.success(t('common.savedSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (error: Error) => toast.error(error.message || t('common.error')),
  });
};

export const useRejectLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string | null }) => {
      const response = await leaveRequestsApi.reject(id, note ? { approval_note: note } : {});
      return mapLeaveRequestApiToDomain(response as LeaveApi.LeaveRequest);
    },
    onSuccess: () => {
      toast.success(t('common.savedSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (error: Error) => toast.error(error.message || t('common.error')),
  });
};
