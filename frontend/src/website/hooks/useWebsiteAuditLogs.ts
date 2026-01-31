import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { websiteAuditLogsApi } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { usePagination } from '@/hooks/usePagination';
import { mapWebsiteAuditLogApiToDomain } from '@/mappers/websiteAuditLogMapper';
import type { WebsiteAuditLogEntry as WebsiteAuditLogApi } from '@/types/api/websiteAuditLog';
import type { WebsiteAuditLogEntry } from '@/types/domain/websiteAuditLog';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';

export const useWebsiteAuditLogs = (usePaginated: boolean = true) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPageSize: 25,
  });

  const queryResult = useQuery<WebsiteAuditLogEntry[] | PaginatedResponse<WebsiteAuditLogApi>>({
    queryKey: ['website-audit-logs', profile?.organization_id, profile?.default_school_id ?? null, usePaginated ? page : null, usePaginated ? pageSize : null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        return usePaginated ? { data: [], meta: null } : [];
      }

      if (usePaginated) {
        const response = await websiteAuditLogsApi.list({ page, per_page: pageSize });
        
        // Laravel returns pagination data directly (not wrapped in meta)
        // Check if response has pagination fields (Laravel format)
        if (response && typeof response === 'object' && 'data' in response && 'total' in response) {
          const laravelResponse = response as {
            data: WebsiteAuditLogApi[];
            current_page: number;
            per_page: number;
            total: number;
            last_page: number;
            from: number | null;
            to: number | null;
          };
          
          return {
            data: (laravelResponse.data || []).map(mapWebsiteAuditLogApiToDomain),
            meta: {
              current_page: laravelResponse.current_page ?? page,
              per_page: laravelResponse.per_page ?? pageSize,
              total: laravelResponse.total ?? 0,
              last_page: laravelResponse.last_page ?? 1,
              from: laravelResponse.from ?? null,
              to: laravelResponse.to ?? null,
            } as PaginationMeta,
          };
        }
        
        // Fallback: treat as array (backward compatibility)
        return {
          data: (response as WebsiteAuditLogApi[]).map(mapWebsiteAuditLogApiToDomain),
          meta: null,
        };
      } else {
        // Backward compatibility: use limit parameter
        const logs = await websiteAuditLogsApi.list({ limit: 200 });
        return (logs as WebsiteAuditLogApi[]).map(mapWebsiteAuditLogApiToDomain);
      }
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && queryResult.data && typeof queryResult.data === 'object' && 'meta' in queryResult.data) {
      const paginatedData = queryResult.data as { data: WebsiteAuditLogEntry[]; meta: PaginationMeta | null };
      if (paginatedData.meta) {
        updateFromMeta(paginatedData.meta);
      }
    }
  }, [queryResult.data, updateFromMeta, usePaginated]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = queryResult.data as { data: WebsiteAuditLogEntry[]; meta: PaginationMeta | null } | undefined;
    return {
      data: paginatedData?.data ?? [],
      isLoading: queryResult.isLoading,
      isFetching: queryResult.isFetching,
      error: queryResult.error,
      refetch: queryResult.refetch,
      pagination: paginatedData?.meta ?? null,
      page,
      pageSize,
      setPage,
      setPageSize,
      paginationState,
    };
  }

  return {
    data: (queryResult.data as WebsiteAuditLogEntry[]) ?? [],
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
    refetch: queryResult.refetch,
    pagination: null,
    page: 1,
    pageSize: 200,
    setPage: () => {},
    setPageSize: () => {},
    paginationState: null,
  };
};
