import { useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi, studentsApi, classesApi, roomsApi, buildingsApi, hostelApi } from '@/lib/api/client';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';

export interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  totalRooms: number;
  totalBuildings: number;
  studentGender: {
    male: number;
    female: number;
  };
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard-stats', profile?.organization_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user || !profile) {
        return {
          totalStudents: 0,
          totalStaff: 0,
          totalClasses: 0,
          totalRooms: 0,
          totalBuildings: 0,
          studentGender: {
            male: 0,
            female: 0
          },
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

      // Check if we have bootstrap data cached (from useAuth)
      const bootstrapData = queryClient.getQueryData(['app', 'bootstrap']) as any;
      if (bootstrapData?.dashboardCounters) {
        const counters = bootstrapData.dashboardCounters;
        
        // Use bootstrap counters - skip API calls for basic counts
        // Gender breakdown can be fetched later if needed (lazy load)
        return {
          totalStudents: counters.students_count || 0,
          totalStaff: counters.staff_count || 0,
          totalClasses: counters.classes_count || 0,
          totalRooms: counters.rooms_count || 0,
          totalBuildings: counters.buildings_count || 0,
          studentGender: {
            male: 0, // Will be fetched later if needed
            female: 0
          },
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

      // Fallback: If no bootstrap data, fetch minimal data needed
      const organizationId = profile.organization_id || undefined;
      
      // Only fetch student stats for gender breakdown (bootstrap doesn't include this)
      const studentStats = await studentsApi.stats({ organization_id: organizationId }).catch(() => ({ total: 0, male: 0, female: 0 }));
      const studentStatsData = studentStats as any;
      
      // Use default counters if bootstrap not available
      return {
        totalStudents: 0,
        totalStaff: 0,
        totalClasses: 0,
        totalRooms: 0,
        totalBuildings: 0,
        studentGender: {
          male: studentStatsData?.male || 0,
          female: studentStatsData?.female || 0
        },
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