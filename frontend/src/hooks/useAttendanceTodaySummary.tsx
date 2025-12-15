import { useQuery } from '@tanstack/react-query';
import { attendanceSessionsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';

export interface AttendanceTodaySummary {
  today: {
    percentage: number;
    present: number;
    absent: number;
    total: number;
  };
}

/**
 * Get today's attendance summary (for dashboard)
 * Returns today's stats only, not full list
 */
export const useAttendanceTodaySummary = (enabled: boolean = true) => {
  const { user, profile } = useAuth();

  return useQuery<AttendanceTodaySummary>({
    queryKey: ['attendance', 'today-summary', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) {
        return {
          today: {
            percentage: 0,
            present: 0,
            absent: 0,
            total: 0,
          },
        };
      }
      return await attendanceSessionsApi.todaySummary();
    },
    enabled: !!user && !!profile && enabled, // Only run if enabled flag is true
    staleTime: 2 * 60 * 1000, // 2 minutes (attendance changes frequently)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

