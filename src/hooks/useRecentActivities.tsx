import { useQuery } from '@tanstack/react-query';

export interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: string;
  icon: any;
}

export const useRecentActivities = () => {
  return useQuery({
    queryKey: ['recent-activities'],
    queryFn: async (): Promise<RecentActivity[]> => {
      // Return empty array - students, fees, and exams tables don't exist
      return [];
    },
  });
};
