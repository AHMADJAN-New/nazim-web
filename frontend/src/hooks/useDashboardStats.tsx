import { useQuery } from '@tanstack/react-query';
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
  const { user, profile: authProfile, profileLoading } = useAuth();
  const { data: profile } = useProfile();
  
  // Use profile from auth context if available, otherwise from query
  const currentProfile = authProfile || profile;
  
  // CRITICAL: Event users should not fetch dashboard stats
  const isEventUser = currentProfile?.is_event_user === true;

  const query = useQuery({
    queryKey: ['dashboard-stats', currentProfile?.organization_id],
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

      const organizationId = profile.organization_id || undefined;

      // Fetch all stats in parallel
      const [staffStats, studentStats, classes, rooms, buildings, hostelOverview] = await Promise.all([
        staffApi.stats({ organization_id: organizationId }).catch(() => ({ total: 0 })),
        studentsApi.stats({ organization_id: organizationId }).catch(() => ({ total: 0, male: 0, female: 0 })),
        classesApi.list({ organization_id: organizationId }).catch(() => []),
        roomsApi.list({ organization_id: organizationId }).catch(() => []),
        buildingsApi.list({ organization_id: organizationId }).catch(() => []),
        hostelApi
          .overview({ organization_id: organizationId })
          .catch(() => ({
            summary: { total_rooms: 0, occupied_rooms: 0, total_students_in_rooms: 0 },
          })),
      ]);

      const studentStatsData = studentStats as any;

      return {
        totalStudents: studentStatsData?.total || 0,
        totalStaff: (staffStats as any)?.total || 0,
        totalClasses: Array.isArray(classes) ? classes.length : 0,
        totalRooms: Array.isArray(rooms) ? rooms.length : 0,
        totalBuildings: Array.isArray(buildings) ? buildings.length : 0,
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
          percentage:
            (hostelOverview as any)?.summary?.total_rooms
              ? Math.round(
                  (((hostelOverview as any).summary.occupied_rooms || 0) /
                    (hostelOverview as any).summary.total_rooms) *
                    100
                )
              : 0,
          occupied: (hostelOverview as any)?.summary?.occupied_rooms || 0,
          total: (hostelOverview as any)?.summary?.total_rooms || 0,
        }
      };
    },
    enabled: !!user && !!currentProfile && !profileLoading && !isEventUser, // Disable for event users and wait for profile
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