import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ParentChildSummary {
  id: string;
  name: string;
  class: string;
  rollNumber?: string;
  attendancePercentage?: number;
  pendingFees: number;
  recentGrade?: string;
  profilePhoto?: string;
}

interface ParentPortalData {
  children: ParentChildSummary[];
  attendanceTrend: Array<{ week: string; attendance: number }>;
  upcomingEvents: Array<{ title: string; date: string; time?: string; type: string }>;
  recentMessages: Array<{ from: string; subject: string; time: string; unread: boolean }>;
}

export function useParentPortal() {
  const { user } = useAuth();

  const query = useQuery<ParentPortalData>({
    queryKey: ['parent-portal', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1) Get children linked to this parent
      const { data: sp, error: spErr } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          is_primary,
          students:student_id (
            id,
            student_id:student_id,
            class_id,
            profiles:user_id ( full_name, avatar_url, email ),
            classes:class_id ( name )
          )
        `)
        .eq('parent_id', user.id);
      if (spErr) throw spErr;

      const children = (sp || []).map((r) => ({
        id: r.students?.id as string,
        name: r.students?.profiles?.full_name || r.students?.profiles?.email || 'Student',
        class: r.students?.classes?.name || 'N/A',
        rollNumber: r.students?.student_id || undefined,
        pendingFees: 0,
        recentGrade: undefined,
        profilePhoto: (r.students?.profiles as any)?.avatar_url || undefined,
      }));

      const childIds = children.map((c) => c.id);

      // 2) Pending fees via invoices (status = pending)
      if (childIds.length) {
        const { data: invoices, error: invErr } = await supabase
          .from('invoices')
          .select('student_id,total_amount,paid_amount,status')
          .in('student_id', childIds)
          .eq('status', 'pending');
        if (!invErr && invoices) {
          const byStudent: Record<string, number> = {};
          invoices.forEach((inv) => {
            byStudent[inv.student_id] = (byStudent[inv.student_id] || 0) + Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
          });
          children.forEach((c) => (c.pendingFees = Math.max(0, Math.round(byStudent[c.id] || 0))));
        }
      }

      // 3) Recent grade from latest exam_results
      if (childIds.length) {
        const { data: results, error: resErr } = await supabase
          .from('exam_results')
          .select('student_id,grade,created_at')
          .in('student_id', childIds)
          .order('created_at', { ascending: false });
        if (!resErr && results) {
          const seen = new Set<string>();
          results.forEach((r) => {
            if (!seen.has(r.student_id)) {
              const child = children.find((c) => c.id === r.student_id);
              if (child) child.recentGrade = r.grade || undefined;
              seen.add(r.student_id);
            }
          });
        }
      }

      // 4) Attendance percentage from attendance_summary (current month)
      if (childIds.length) {
        const now = new Date();
        const { data: summary, error: sumErr } = await supabase
          .from('attendance_summary')
          .select('student_id,percentage,month,year')
          .in('student_id', childIds)
          .eq('month', now.getMonth() + 1)
          .eq('year', now.getFullYear());
        if (!sumErr && summary) {
          const byStudent: Record<string, number> = {};
          summary.forEach((s) => (byStudent[s.student_id] = Number(s.percentage || 0)));
          children.forEach((c) => (c.attendancePercentage = byStudent[c.id]));
        }
      }

      // 5) Attendance trend (last 4 weeks across all children)
      let attendanceTrend: Array<{ week: string; attendance: number }> = [];
      if (childIds.length) {
        const start = new Date();
        start.setDate(start.getDate() - 28);
        const { data: att, error: attErr } = await supabase
          .from('attendance')
          .select('student_id,date,status')
          .in('student_id', childIds)
          .gte('date', start.toISOString().slice(0, 10));
        if (!attErr && att) {
          const weeks = [0, 1, 2, 3].map((i) => {
            const wStart = new Date();
            wStart.setDate(wStart.getDate() - (7 * (3 - i)) - 6);
            const wEnd = new Date(wStart);
            wEnd.setDate(wStart.getDate() + 6);
            const label = `Week ${i + 1}`;
            const total = att.filter((r) => {
              const d = new Date(r.date);
              return d >= wStart && d <= wEnd;
            }).length;
            const present = att.filter((r) => {
              const d = new Date(r.date);
              return d >= wStart && d <= wEnd && r.status === 'present';
            }).length;
            const pct = total ? Math.round((present / total) * 100) : 0;
            return { week: label, attendance: pct };
          });
          attendanceTrend = weeks;
        }
      }

      // 6) Upcoming events
      const today = new Date().toISOString().slice(0, 10);
      const { data: events, error: evErr } = await supabase
        .from('events')
        .select('title,event_date,start_time,category')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5);
      const upcomingEvents = !evErr && events ? events.map((e) => ({
        title: e.title,
        date: new Date(e.event_date as any).toDateString(),
        time: e.start_time || undefined,
        type: e.category || 'event',
      })) : [];

      // 7) Recent messages to this parent
      const { data: msgs } = await supabase
        .from('messages')
        .select('subject,created_at,sender_id')
        .contains('recipients', [user.id])
        .order('created_at', { ascending: false })
        .limit(5);
      const recentMessages = (msgs || []).map((m) => ({
        from: 'School',
        subject: m.subject,
        time: new Date(m.created_at).toLocaleString(),
        unread: true,
      }));

      return { children, attendanceTrend, upcomingEvents, recentMessages };
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
