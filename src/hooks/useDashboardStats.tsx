import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date().toISOString().split('T')[0];
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().slice(0, 7);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

      // Batch all queries for better performance
      const [
        studentsCount,
        staffCount,
        attendanceData,
        feeData,
        donationData,
        roomsCount,
        allocationsCount
      ] = await Promise.all([
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('staff')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('attendance')
          .select('status')
          .eq('date', today),
        supabase
          .from('fees')
          .select('amount')
          .eq('status', 'paid')
          .gte('paid_date', `${currentMonth}-01`)
          .lt('paid_date', nextMonth.toISOString().split('T')[0]),
        supabase
          .from('donations')
          .select('amount')
          .gte('donation_date', `${currentMonth}-01`)
          .lt('donation_date', nextMonth.toISOString().split('T')[0]),
        supabase
          .from('hostel_rooms')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('hostel_allocations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
      ]);

      // Process results efficiently
      const totalStudents = studentsCount.count || 0;
      const totalStaff = staffCount.count || 0;
      
      const presentCount = attendanceData.data?.filter(a => a.status === 'present').length || 0;
      const totalAttendance = attendanceData.data?.length || 0;
      const attendancePercentage = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

      const feeCollectionAmount = feeData.data?.reduce((sum, fee) => sum + Number(fee.amount), 0) || 0;
      const donationsAmount = donationData.data?.reduce((sum, donation) => sum + Number(donation.amount), 0) || 0;

      const totalRooms = roomsCount.count || 0;
      const occupiedRooms = allocationsCount.count || 0;
      const hostelOccupancyPercentage = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

      return {
        totalStudents,
        totalStaff,
        todayAttendance: {
          percentage: attendancePercentage,
          present: presentCount,
          total: totalAttendance
        },
        feeCollection: {
          amount: feeCollectionAmount,
          currency: '₹'
        },
        donations: {
          amount: donationsAmount,
          currency: '₹'
        },
        hostelOccupancy: {
          percentage: hostelOccupancyPercentage,
          occupied: occupiedRooms,
          total: totalRooms
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStudentsByClass = () => {
  return useQuery({
    queryKey: ['students-by-class'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select(`
          id,
          class_id,
          classes!inner(name)
        `)
        .eq('status', 'active');

      // Group by class efficiently
      const classGroups = data?.reduce((acc, student) => {
        const className = student.classes?.name || 'Unknown';
        if (!acc[className]) {
          acc[className] = { class: className, students: 0 };
        }
        acc[className].students++;
        return acc;
      }, {} as Record<string, { class: string; students: number }>);

      return Object.values(classGroups || {});
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useWeeklyAttendance = () => {
  return useQuery({
    queryKey: ['weekly-attendance'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Group by day efficiently
      const dayGroups = data?.reduce((acc, record) => {
        const date = new Date(record.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!acc[dayName]) {
          acc[dayName] = { day: dayName, present: 0, absent: 0 };
        }
        
        if (record.status === 'present') {
          acc[dayName].present++;
        } else {
          acc[dayName].absent++;
        }
        
        return acc;
      }, {} as Record<string, { day: string; present: number; absent: number }>);

      return Object.values(dayGroups || {});
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useMonthlyFeeCollection = () => {
  return useQuery({
    queryKey: ['monthly-fee-collection'],
    queryFn: async () => {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      
      const { data } = await supabase
        .from('fees')
        .select('amount, paid_date')
        .eq('status', 'paid')
        .gte('paid_date', fiveMonthsAgo.toISOString().split('T')[0])
        .order('paid_date', { ascending: true });

      // Group by month efficiently
      const monthGroups = data?.reduce((acc, fee) => {
        const date = new Date(fee.paid_date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        
        if (!acc[monthKey]) {
          acc[monthKey] = { month: monthKey, collected: 0, pending: 0 };
        }
        
        acc[monthKey].collected += Number(fee.amount) / 100000; // Convert to lakhs
        
        return acc;
      }, {} as Record<string, { month: string; collected: number; pending: number }>);

      return Object.values(monthGroups || {});
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};

export const useUpcomingExams = () => {
  return useQuery({
    queryKey: ['upcoming-exams'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          exam_date,
          subjects!inner(name),
          classes!inner(name)
        `)
        .gte('exam_date', today)
        .order('exam_date', { ascending: true })
        .limit(4);

      return data?.map(exam => ({
        subject: exam.subjects?.name || exam.name,
        date: exam.exam_date,
        enrolled: 0 // Would need student-exam enrollment table
      })) || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};