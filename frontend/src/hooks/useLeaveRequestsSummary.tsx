import { useQuery } from '@tanstack/react-query';
import { leaveRequestsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';

export interface LeaveRequestsSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * Get leave requests summary (for dashboard)
 * Returns counts by status only, not full list
 */
export const useLeaveRequestsSummary = (enabled: boolean = true) => {
  const { user, profile } = useAuth();

  return useQuery<LeaveRequestsSummary>({
    queryKey: ['leave-requests', 'summary', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) {
        return {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        };
      }
      return await leaveRequestsApi.summary();
    },
    enabled: !!user && !!profile && enabled, // Only run if enabled flag is true
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

