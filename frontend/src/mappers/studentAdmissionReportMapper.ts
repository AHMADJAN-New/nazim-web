import type * as StudentAdmissionReportApi from '@/types/api/studentAdmissionReport';
import type { StudentAdmissionReport } from '@/types/domain/studentAdmissionReport';
import { mapStudentAdmissionApiToDomain } from './studentAdmissionMapper';

export const mapStudentAdmissionReportApiToDomain = (
  apiReport: StudentAdmissionReportApi.StudentAdmissionReport
): StudentAdmissionReport => ({
  totals: apiReport.totals,
  statusBreakdown: (apiReport.status_breakdown || []).map((item) => ({
    status: item.enrollment_status,
    count: item.total,
  })),
  schoolBreakdown: (apiReport.school_breakdown || []).map((item) => ({
    schoolId: item.school_id,
    schoolName: item.school_name || '—',
    total: Number(item.total),
    active: Number(item.active_count),
    boarders: Number(item.boarder_count),
  })),
  academicYearBreakdown: (apiReport.academic_year_breakdown || []).map((item) => ({
    academicYearId: item.academic_year_id,
    academicYearName: item.academic_year_name || '—',
    total: Number(item.total),
    active: Number(item.active_count),
    boarders: Number(item.boarder_count),
  })),
  residencyBreakdown: (apiReport.residency_breakdown || []).map((item) => ({
    residencyTypeId: item.residency_type_id,
    residencyTypeName: item.residency_type_name || '—',
    total: Number(item.total),
    boarders: Number(item.boarder_count),
    active: Number(item.active_count),
  })),
  recentAdmissions: (apiReport.recent_admissions || []).map(mapStudentAdmissionApiToDomain),
  pagination: apiReport.pagination ? {
    currentPage: apiReport.pagination.current_page,
    perPage: apiReport.pagination.per_page,
    total: apiReport.pagination.total,
    lastPage: apiReport.pagination.last_page,
    from: apiReport.pagination.from,
    to: apiReport.pagination.to,
  } : {
    currentPage: 1,
    perPage: 25,
    total: 0,
    lastPage: 1,
    from: 0,
    to: 0,
  },
});
