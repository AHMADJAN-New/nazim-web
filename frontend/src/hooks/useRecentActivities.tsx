import { useOfflineCachedQuery } from './useOfflineCachedQuery';

export interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: string;
  icon: any;
}

export const useRecentActivities = () => {
  const queryKey = ['recent-activities'];

  return useOfflineCachedQuery({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'activity-logs.recent',
    queryKey,
    queryFn: async (): Promise<RecentActivity[]> => {
      // Return empty array - students, fees, and exams tables don't exist
      return [];
    },
  });
};
