import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { courseAttendanceSessionsApi } from '@/lib/api/client';

export interface CourseAttendanceSession {
  id: string;
  organization_id: string;
  course_id: string;
  session_date: string;
  session_title: string | null;
  method: 'manual' | 'barcode' | 'mixed';
  status: 'open' | 'closed';
  remarks: string | null;
  created_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
  course?: {
    id: string;
    name: string;
  };
  records?: CourseAttendanceRecord[];
  records_count?: number;
  present_count?: number;
  absent_count?: number;
}

export interface CourseAttendanceRecord {
  id: string;
  attendance_session_id: string;
  organization_id: string;
  course_id: string;
  course_student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave';
  entry_method: 'manual' | 'barcode';
  marked_at: string | null;
  marked_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  course_student?: {
    id: string;
    full_name: string;
    father_name: string;
    card_number: string | null;
    admission_no: string | null;
  };
}

export interface CourseRosterStudent {
  id: string;
  full_name: string;
  father_name: string;
  card_number: string | null;
  admission_no: string | null;
  status: string;
}

export const useCourseAttendanceSessions = (courseId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<CourseAttendanceSession[]>({
    queryKey: ['course-attendance-sessions', courseId ?? 'all'],
    queryFn: async () => {
      if (!user || !profile) return [];
      const params: any = {};
      if (courseId) params.course_id = courseId;
      const sessions = await courseAttendanceSessionsApi.list(params);
      return sessions as CourseAttendanceSession[];
    },
    enabled: !!user && !!profile,
    staleTime: 30 * 1000,
  });
};

export const useCourseAttendanceSession = (sessionId: string) => {
  const { user, profile } = useAuth();

  return useQuery<CourseAttendanceSession>({
    queryKey: ['course-attendance-session', sessionId],
    queryFn: async () => {
      if (!user || !profile) throw new Error('Not authenticated');
      const session = await courseAttendanceSessionsApi.get(sessionId);
      return session as CourseAttendanceSession;
    },
    enabled: !!user && !!profile && !!sessionId,
  });
};

export const useCreateCourseAttendanceSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      course_id: string;
      session_date: string;
      session_title?: string | null;
      method?: string;
      remarks?: string | null;
    }) => {
      const session = await courseAttendanceSessionsApi.create(data);
      return session as CourseAttendanceSession;
    },
    onSuccess: () => {
      toast.success('Attendance session created');
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-sessions'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not create session'),
  });
};

export const useUpdateCourseAttendanceSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const session = await courseAttendanceSessionsApi.update(id, data);
      return session as CourseAttendanceSession;
    },
    onSuccess: () => {
      toast.success('Attendance session updated');
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-session'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not update session'),
  });
};

export const useDeleteCourseAttendanceSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await courseAttendanceSessionsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      toast.success('Attendance session deleted');
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-sessions'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete session'),
  });
};

export const useCourseRoster = (courseId: string) => {
  const { user, profile } = useAuth();

  return useQuery<CourseRosterStudent[]>({
    queryKey: ['course-roster', courseId],
    queryFn: async () => {
      if (!user || !profile || !courseId) return [];
      const roster = await courseAttendanceSessionsApi.roster({ course_id: courseId });
      return roster as CourseRosterStudent[];
    },
    enabled: !!user && !!profile && !!courseId,
  });
};

export const useMarkCourseAttendanceRecords = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, records }: {
      sessionId: string;
      records: Array<{
        course_student_id: string;
        status: 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave';
        note?: string | null;
      }>;
    }) => {
      const result = await courseAttendanceSessionsApi.markRecords(sessionId, { records });
      return result;
    },
    onSuccess: () => {
      toast.success('Attendance records saved');
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-session'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save attendance'),
  });
};

export const useScanCourseAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, code }: { sessionId: string; code: string }) => {
      const result = await courseAttendanceSessionsApi.scan(sessionId, { code });
      return result;
    },
    onSuccess: (data: any) => {
      if (data.student) {
        toast.success(`${data.student.full_name} marked ${data.status}`);
      }
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-session'] });
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-scans'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Scan failed'),
  });
};

export const useCourseAttendanceScans = (sessionId: string, limit: number = 10) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['course-attendance-scans', sessionId, limit],
    queryFn: async () => {
      if (!user || !profile || !sessionId) return [];
      const scans = await courseAttendanceSessionsApi.scans(sessionId, { limit });
      return scans as CourseAttendanceRecord[];
    },
    enabled: !!user && !!profile && !!sessionId,
    refetchInterval: 3000, // Poll every 3 seconds for new scans
  });
};

export const useCloseCourseAttendanceSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await courseAttendanceSessionsApi.close(sessionId);
      return result as CourseAttendanceSession;
    },
    onSuccess: () => {
      toast.success('Attendance session closed');
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['course-attendance-session'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not close session'),
  });
};

export const useCourseAttendanceReport = (params?: {
  courseId?: string;
  courseStudentId?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['course-attendance-report', params],
    queryFn: async () => {
      if (!user || !profile) return [];
      const apiParams: any = {};
      if (params?.courseId) apiParams.course_id = params.courseId;
      if (params?.courseStudentId) apiParams.course_student_id = params.courseStudentId;
      if (params?.dateFrom) apiParams.date_from = params.dateFrom;
      if (params?.dateTo) apiParams.date_to = params.dateTo;
      const report = await courseAttendanceSessionsApi.report(apiParams);
      return report;
    },
    enabled: !!user && !!profile && !!params?.courseId,
  });
};
