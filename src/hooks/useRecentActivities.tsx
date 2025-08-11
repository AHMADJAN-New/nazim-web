import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, CreditCard, Trophy, Calendar } from 'lucide-react';

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
      const activities: RecentActivity[] = [];
      
      // Get recent students (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: recentStudents } = await supabase
        .from('students')
        .select(`
          id,
          created_at,
          profiles!inner(full_name),
          classes!inner(name)
        `)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      // Add student admissions to activities
      recentStudents?.forEach(student => {
        const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
        const cls = Array.isArray(student.classes) ? student.classes[0] : student.classes;
        const timeAgo = getTimeAgo(new Date(student.created_at));
        activities.push({
          id: `student-${student.id}`,
          title: 'New student admission',
          description: `${profile?.full_name} has been admitted to ${cls?.name}`,
          time: timeAgo,
          type: 'admission',
          icon: Users
        });
      });

      // Get recent fee payments
      const { data: recentPayments } = await supabase
        .from('fees')
        .select(`
          id,
          amount,
          paid_date,
          students!inner(
            profiles!inner(full_name),
            classes!inner(name)
          )
        `)
        .eq('status', 'paid')
        .gte('paid_date', weekAgo.toISOString().split('T')[0])
        .order('paid_date', { ascending: false })
        .limit(3);

      // Add fee payments to activities
      recentPayments?.forEach(payment => {
        const studentRel = Array.isArray((payment as any).students) ? (payment as any).students[0] : (payment as any).students;
        const pProfile = Array.isArray(studentRel?.profiles) ? studentRel?.profiles[0] : studentRel?.profiles;
        const pClass = Array.isArray(studentRel?.classes) ? studentRel?.classes[0] : studentRel?.classes;
        const timeAgo = getTimeAgo(new Date(payment.paid_date));
        activities.push({
          id: `payment-${payment.id}`,
          title: 'Fee payment received',
          description: `₹${Number(payment.amount).toLocaleString()} received from ${pProfile?.full_name} (${pClass?.name})`,
          time: timeAgo,
          type: 'payment',
          icon: CreditCard
        });
      });

      // Get recent exams
      const { data: recentExams } = await supabase
        .from('exams')
        .select(`
          id,
          name,
          created_at,
          classes!inner(name)
        `)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(2);

      // Add exam activities
      recentExams?.forEach(exam => {
        const timeAgo = getTimeAgo(new Date(exam.created_at));
        const clsName = Array.isArray((exam as any).classes) ? (exam as any).classes[0]?.name : (exam as any).classes?.name;
        activities.push({
          id: `exam-${exam.id}`,
          title: 'Exam scheduled',
          description: `${exam.name} scheduled for ${clsName}`,
          time: timeAgo,
          type: 'exam',
          icon: Trophy
        });
      });

      // Sort all activities by time and return top 4
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 4);
    },
  });
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}