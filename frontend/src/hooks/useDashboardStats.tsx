import { useQuery } from '@tanstack/react-query';
import { staffApi, studentsApi } from '@/lib/api/client';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';

export interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  todayAttendance: {
    percentage: number;
    present: number;
    total: number;
  };
  feeCollection: {
    amount: number;
    currency: string;
  };
  donations: {
    amount: number;
    currency: string;
  };
  hostelOccupancy: {
    percentage: number;
    occupied: number;
    total: number;
  };
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const query = useQuery({
    queryKey: ['dashboard-stats', profile?.organization_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user || !profile) {
        return {
          totalStudents: 0,
          totalStaff: 0,
          todayAttendance: {
            percentage: 0,
            present: 0,
            total: 0
          },
          feeCollection: {
            amount: 0,
            currency: '₹'
          },
          donations: {
            amount: 0,
            currency: '₹'
          },
          hostelOccupancy: {
            percentage: 0,
            occupied: 0,
            total: 0
          }
        };
      }

      // Fetch staff stats from Laravel API
      let totalStaff = 0;
      try {
        const staffStats = await staffApi.stats({
          organization_id: profile.organization_id || undefined,
        });
        totalStaff = staffStats?.total || 0;
      } catch (error) {
        console.error('Failed to fetch staff stats:', error);
        totalStaff = 0;
      }

      // Fetch student stats from Laravel API
      let totalStudents = 0;
      try {
        const studentStats = await studentsApi.stats({
          organization_id: profile.organization_id || undefined,
        });
        totalStudents = studentStats?.total || 0;
      } catch (error) {
        console.error('Failed to fetch student stats:', error);
        totalStudents = 0;
      }

      // Return default values for non-existent tables
      return {
        totalStudents,
        totalStaff,
        todayAttendance: {
          percentage: 0,
          present: 0,
          total: 0
        },
        feeCollection: {
          amount: 0,
          currency: '₹'
        },
        donations: {
          amount: 0,
          currency: '₹'
        },
        hostelOccupancy: {
          percentage: 0,
          occupied: 0,
          total: 0
        }
      };
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Use refetchInterval instead of realtime subscriptions
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: false, // Prevent infinite retries on connection errors
  });

  // Realtime subscriptions disabled - using polling instead
  // React Query will automatically refetch based on refetchInterval

  return query;
};

export const useStudentsByClass = () => {
  return useQuery({
    queryKey: ['students-by-class'],
    queryFn: async () => {
      // Return empty array - students table doesn't exist
      return [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useWeeklyAttendance = () => {
  return useQuery({
    queryKey: ['weekly-attendance'],
    queryFn: async () => {
      // Return empty array - attendance table doesn't exist
      return [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useMonthlyFeeCollection = () => {
  return useQuery({
    queryKey: ['monthly-fee-collection'],
    queryFn: async () => {
      // Return empty array - fees table doesn't exist
      return [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};

export const useUpcomingExams = () => {
  return useQuery({
    queryKey: ['upcoming-exams'],
    queryFn: async () => {
      // Return empty array - exams table doesn't exist
      return [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};