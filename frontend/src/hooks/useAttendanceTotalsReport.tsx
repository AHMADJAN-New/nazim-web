import { useQuery } from '@tanstack/react-query';
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

  return useQuery<AttendanceTotalsReport>({
    queryKey: ['attendance-totals-report', normalizedFilters],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params: Record<string, string | number | string[] | undefined> = {
        organization_id: normalizedFilters.organizationId,
        academic_year_id: normalizedFilters.academicYearId,
        class_id: normalizedFilters.classId,
        status: normalizedFilters.status,
        date_from: normalizedFilters.dateFrom,
        date_to: normalizedFilters.dateTo,
        student_id: normalizedFilters.studentId,
        student_type: normalizedFilters.studentType,
        sessions_limit: normalizedFilters.sessionsLimit,
        student_breakdown_page: normalizedFilters.studentBreakdownPage,
        student_breakdown_per_page: normalizedFilters.studentBreakdownPerPage,
      };
      // Strict school scoping: do not allow client-selected school_id.

      if (normalizedFilters.classIds && normalizedFilters.classIds.length > 0) {
        params.class_ids = normalizedFilters.classIds;
      }

      const apiReport = await attendanceSessionsApi.totalsReport(
        Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
        ) as Record<string, string | number | string[] | undefined>
      );
      return mapAttendanceTotalsReportApiToDomain(
        apiReport as AttendanceTotalsReportApi.AttendanceTotalsReport
      );
    },
    enabled: !!user && !!profile && !!profile.default_school_id && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: false,
  });
};
