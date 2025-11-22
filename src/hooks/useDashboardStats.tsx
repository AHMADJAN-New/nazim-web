import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

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
  const query = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Only query staff table which exists
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      const totalStaff = staffCount || 0;

      // Return default values for non-existent tables
      return {
        totalStudents: 0,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => query.refetch())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [query.refetch]);

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