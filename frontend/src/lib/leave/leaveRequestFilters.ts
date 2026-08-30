import type { LeaveFilters } from '@/hooks/useLeaveRequests';

/** Build API list params; omit empty optional filters (history must not send blank student/class). */
export function buildLeaveRequestListParams(
  filters: LeaveFilters,
  page: number,
  pageSize: number
): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page,
    per_page: pageSize,
  };

  if (filters.studentId) params.student_id = filters.studentId;
  if (filters.classId) params.class_id = filters.classId;
  if (filters.status) params.status = filters.status;
  if (filters.month != null) params.month = filters.month;
  if (filters.year != null) params.year = filters.year;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;

  return params;
}
