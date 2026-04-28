import { useOfflineCachedQuery } from './useOfflineCachedQuery';
import { useMemo } from 'react';

import { useAuth } from './useAuth';

import { attendanceSessionsApi } from '@/lib/api/client';
import { mapAttendanceTotalsReportApiToDomain } from '@/mappers/attendanceTotalsReportMapper';
import type * as AttendanceTotalsReportApi from '@/types/api/attendanceTotalsReport';
import type {
  AttendanceTotalsReport,
  AttendanceTotalsReportFilters,
} from '@/types/domain/attendanceTotalsReport';

export const useAttendanceTotalsReport = (
  filters: AttendanceTotalsReportFilters = {},
  options?: { enabled?: boolean }
) => {
  const { user, profile } = useAuth();

  const normalizedFilters = useMemo(() => ({
    ...filters,
    organizationId: filters.organizationId || profile?.organization_id,
  }), [filters, profile?.organization_id]);

  const queryKey = ['attendance-totals-report', normalizedFilters];
  return useOfflineCachedQuery<AttendanceTotalsReport>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'attendance.totals-report',
    queryKey,
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params: Record<string, string | string[] | undefined> = {
        organization_id: normalizedFilters.organizationId,
        academic_year_id: normalizedFilters.academicYearId,
        class_id: normalizedFilters.classId,
        status: normalizedFilters.status,
        date_from: normalizedFilters.dateFrom,
        date_to: normalizedFilters.dateTo,
      };
      // Strict school scoping: do not allow client-selected school_id.

      if (normalizedFilters.classIds && normalizedFilters.classIds.length > 0) {
        params.class_ids = normalizedFilters.classIds;
      }

      const apiReport = await attendanceSessionsApi.totalsReport(params);
      return mapAttendanceTotalsReportApiToDomain(
        apiReport as AttendanceTotalsReportApi.AttendanceTotalsReport
      );
    },
    enabled: !!user && !!profile && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: false,
  });
};
