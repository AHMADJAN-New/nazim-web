import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface LandingStats {
  students: number;
  staff: number;
}

export const useLandingStats = () => {
  const query = useQuery({
    queryKey: ['landing-stats'],
    queryFn: async (): Promise<LandingStats> => {
      try {
        // Fetch stats from Laravel API (public endpoints, no auth required)
        const [studentsResponse, staffResponse] = await Promise.all([
          apiClient.get<{ count: number }>('/stats/students-count').catch(() => ({ count: 0 })),
          apiClient.get<{ count: number }>('/stats/staff-count').catch(() => ({ count: 0 })),
        ]);

        return {
          students: studentsResponse.count ?? 0,
          staff: staffResponse.count ?? 0,
        };
      } catch (error) {
        // Return default values if API is not available
        console.warn('Could not fetch landing stats:', error);
        return {
          students: 0,
          staff: 0,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return query;
};

