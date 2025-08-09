import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TeacherInfo {
  name: string;
  subject?: string;
  classes: Array<{ id: string; name: string }>;
  totalStudents: number;
}

interface ClassSchedule {
  class_id: string;
  class_name: string;
  start_time: string;
  end_time: string;
  day_of_week: string;
  subject?: string | null;
  room?: string | null;
}

interface TeacherPortalData {
  teacherInfo: TeacherInfo;
  classPerformance: Array<{ classId: string; class: string; avgGrade: number; attendance: number }>;
  attendanceOverview: Array<{ name: 'Present' | 'Absent'; value: number; color: string }>;
  upcomingExams: Array<{ subject: string; class: string; date: string; status: string }>;
  recentMessages: Array<{ from: string; subject: string; time: string; unread: boolean }>;
  schedule: ClassSchedule[];
}

export function useTeacherPortal() {
  const { user } = useAuth();

  return useQuery<TeacherPortalData>({
    queryKey: ['teacher-portal', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Classes assigned to this teacher
      const { data: classes, error: clsErr } = await supabase
        .from('classes')
        .select('id,name')
        .eq('class_teacher_id', user.id);
      if (clsErr) throw clsErr;
      const classList = classes || [];
      const classIds = classList.map((c) => c.id);

      // Teacher name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Count students in these classes
      let totalStudents = 0;
      if (classIds.length) {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .in('class_id', classIds);
        totalStudents = count || 0;
      }

      // Attendance overview for today
      const today = new Date().toISOString().slice(0, 10);
      let present = 0, total = 0;
      if (classIds.length) {
        const { data: att } = await supabase
          .from('attendance')
          .select('status')
          .in('class_id', classIds)
          .eq('date', today);
        total = att?.length || 0;
        present = (att || []).filter((a) => a.status === 'present').length;
      }
      const attendanceOverview = [
        { name: 'Present' as const, value: present, color: 'hsl(var(--success))' },
        { name: 'Absent' as const, value: Math.max(0, total - present), color: 'hsl(var(--destructive))' },
      ];

      // Fetch schedule for today
      const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      let schedule: ClassSchedule[] = [];
      if (user.id) {
        const { data: sched } = await (supabase as any)
          .from('teacher_daily_schedule')
          .select('class_id,class_name,start_time,end_time,day_of_week,subject,room')
          .eq('teacher_id', user.id)
          .eq('day_of_week', weekday);
        schedule = sched || [];
      }

      // Class performance (avg grade per class) and attendance summary
      let classPerformance: Array<{ classId: string; class: string; avgGrade: number; attendance: number }> = [];
      const attendanceSummaryMap: Record<string, number> = {};
      if (user.id) {
        const { data: classAtt } = await (supabase as any)
          .from('class_attendance_summary')
          .select('class_id,attendance_percentage')
          .eq('teacher_id', user.id);
        (classAtt || []).forEach((a: any) => {
          attendanceSummaryMap[a.class_id] = Number(a.attendance_percentage || 0);
        });
      }

      if (classIds.length) {
        const { data: std } = await supabase
          .from('students')
          .select('id,class_id')
          .in('class_id', classIds);
        const byClass: Record<string, string[]> = {};
        (std || []).forEach((s) => {
          byClass[s.class_id] = byClass[s.class_id] || [];
          byClass[s.class_id].push(s.id);
        });

        // Fetch exam results for these students
        const allStudentIds = Object.values(byClass).flat();
        if (allStudentIds.length) {
          const { data: results } = await supabase
            .from('exam_results')
            .select('student_id,percentage');
          const map: Record<string, { sum: number; count: number }> = {};
          (results || []).forEach((r) => {
            map[r.student_id] = map[r.student_id] || { sum: 0, count: 0 };
            map[r.student_id].sum += Number(r.percentage || 0);
            map[r.student_id].count += 1;
          });

          classPerformance = classList.map((cls) => {
            const ids = byClass[cls.id] || [];
            const totals = ids.reduce((acc, id) => {
              const m = map[id];
              if (m) { acc.sum += m.sum / (m.count || 1); acc.count += 1; }
              return acc;
            }, { sum: 0, count: 0 });
            const avg = totals.count ? Math.round(totals.sum / totals.count) : 0;
            const attendance = Math.round(attendanceSummaryMap[cls.id] || 0);
            return { classId: cls.id, class: cls.name, avgGrade: avg, attendance };
          });
        }
      }

      if (!classPerformance.length) {
        classPerformance = classList.map((cls) => ({
          classId: cls.id,
          class: cls.name,
          avgGrade: 0,
          attendance: Math.round(attendanceSummaryMap[cls.id] || 0),
        }));
      }

      // Upcoming exams
      let upcomingExams: Array<{ subject: string; class: string; date: string; status: string }> = [];
      if (classIds.length) {
        const { data: exams } = await supabase
          .from('exams')
          .select('name,exam_date,class_id')
          .in('class_id', classIds)
          .gte('exam_date', today)
          .order('exam_date', { ascending: true })
          .limit(5);
        upcomingExams = (exams || []).map((e) => ({
          subject: e.name,
          class: (classList.find((c) => c.id === e.class_id)?.name) || 'Class',
          date: new Date(e.exam_date as any).toDateString(),
          status: 'scheduled',
        }));
      }

      // Recent messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('subject,created_at')
        .or(`sender_id.eq.${user.id},recipients.cs.{${user.id}}`)
        .order('created_at', { ascending: false })
        .limit(5);

      const teacherInfo: TeacherInfo = {
        name: profile?.full_name || (user.email || 'Teacher'),
        subject: undefined,
        classes: classList.map((c) => ({ id: c.id, name: c.name })),
        totalStudents,
      };

      return {
        teacherInfo,
        classPerformance,
        attendanceOverview,
        upcomingExams,
        recentMessages: (msgs || []).map((m) => ({ from: 'School', subject: m.subject, time: new Date(m.created_at).toLocaleString(), unread: true })),
        schedule,
      };
    },
  });
}
