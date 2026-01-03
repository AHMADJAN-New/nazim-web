import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from './useAuth';

import { studentAdmissionsApi } from '@/lib/api/client';
import { mapStudentAdmissionReportApiToDomain } from '@/mappers/studentAdmissionReportMapper';
import type * as StudentAdmissionReportApi from '@/types/api/studentAdmissionReport';
import type { StudentAdmissionReport, StudentAdmissionReportFilters } from '@/types/domain/studentAdmissionReport';

export const useStudentAdmissionReport = (
  filters: StudentAdmissionReportFilters = {},
  options?: { enabled?: boolean }
) => {
  const { user, profile } = useAuth();

  const normalizedFilters = useMemo(() => {
    return {
      ...filters,
      organizationId: filters.organizationId || profile?.organization_id,
    };
  }, [filters, profile?.organization_id]);

  const query = useQuery<StudentAdmissionReport>({
    queryKey: ['student-admissions-report', normalizedFilters, normalizedFilters.page, normalizedFilters.perPage],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params: Record<string, string | number | boolean | undefined> = {
        organization_id: normalizedFilters.organizationId,
        academic_year_id: normalizedFilters.academicYearId,
        enrollment_status: normalizedFilters.enrollmentStatus,
        residency_type_id: normalizedFilters.residencyTypeId,
        is_boarder: normalizedFilters.isBoarder,
        from_date: normalizedFilters.fromDate,
        to_date: normalizedFilters.toDate,
        page: normalizedFilters.page || 1,
        per_page: normalizedFilters.perPage || 25,
      };
      // Strict school scoping: do not allow client-selected school_id.

      const apiReport = await studentAdmissionsApi.report(params);
      return mapStudentAdmissionReportApiToDomain(apiReport as StudentAdmissionReportApi.StudentAdmissionReport);
    },
    enabled: !!user && !!profile && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return query;
};
