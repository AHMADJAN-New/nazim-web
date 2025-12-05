import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentAdmissionsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import type { StudentAdmissionReport, StudentAdmissionReportFilters } from '@/types/domain/studentAdmissionReport';
import { mapStudentAdmissionReportApiToDomain } from '@/mappers/studentAdmissionReportMapper';
import type * as StudentAdmissionReportApi from '@/types/api/studentAdmissionReport';

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
    queryKey: ['student-admissions-report', normalizedFilters],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const params: Record<string, string | number | boolean | undefined> = {
        organization_id: normalizedFilters.organizationId,
        school_id: normalizedFilters.schoolId,
        academic_year_id: normalizedFilters.academicYearId,
        enrollment_status: normalizedFilters.enrollmentStatus,
        residency_type_id: normalizedFilters.residencyTypeId,
        is_boarder: normalizedFilters.isBoarder,
        from_date: normalizedFilters.fromDate,
        to_date: normalizedFilters.toDate,
      };

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
