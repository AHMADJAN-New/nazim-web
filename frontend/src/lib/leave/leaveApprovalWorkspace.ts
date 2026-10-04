import type { LeaveFilters } from '@/hooks/useLeaveRequests';
import type { LeaveStatus } from '@/types/domain/leave';

export type LeaveApprovalStatusFilter = 'all' | LeaveStatus;

export function buildLeaveApprovalFilters(
  status: LeaveApprovalStatusFilter,
  dateFrom: string,
  dateTo: string,
): LeaveFilters {
  return {
    ...(status === 'all' ? {} : { status }),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
}

export function canEditLeaveRequestDates(status: LeaveStatus): boolean {
  return status === 'pending';
}
