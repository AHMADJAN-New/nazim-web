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
      // Get total students
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get total staff
      const { count: totalStaff } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', today);

      const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
      const totalAttendance = attendanceData?.length || 0;
      const attendancePercentage = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

      // Get fee collection this month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: feeData } = await supabase
        .from('fees')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_date', `${currentMonth}-01`)
        .lt('paid_date', `${currentMonth}-32`);

      const feeCollectionAmount = feeData?.reduce((sum, fee) => sum + Number(fee.amount), 0) || 0;

      // Get donations this month (placeholder - would need donations table)
      const donationsAmount = 320000; // Mock data for now

      // Get hostel occupancy
      const { count: totalRooms } = await supabase
        .from('hostel_rooms')
        .select('*', { count: 'exact', head: true });

      const { count: occupiedRooms } = await supabase
        .from('hostel_allocations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const hostelOccupancyPercentage = totalRooms && totalRooms > 0 ? 
        ((occupiedRooms || 0) / totalRooms) * 100 : 0;

      return {
        totalStudents: totalStudents || 0,
        totalStaff: totalStaff || 0,
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
          occupied: occupiedRooms || 0,
          total: totalRooms || 0
        }
      };
    },
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

      // Group by class
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

      // Group by day
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

      // Group by month
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
  });
};