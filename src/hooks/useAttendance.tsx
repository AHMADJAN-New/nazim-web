import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by: string;
  remarks?: string;
  created_at: string;
  student?: {
    student_id: string;
    profiles?: {
      full_name: string;
    };
  };
  classes?: {
    name: string;
  };
}

export const useAttendance = (filters?: { date?: string; class_id?: string }) => {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          student:students!student_id (
            student_id,
            profiles:user_id (
              full_name
            )
          ),
          classes (
            name
          )
        `)
        .order('date', { ascending: false });

      if (filters?.date) {
        query = query.eq('date', filters.date);
      }
      if (filters?.class_id) {
        query = query.eq('class_id', filters.class_id);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as AttendanceRecord[];
    },
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceData: Omit<AttendanceRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance marked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark attendance');
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttendanceRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('attendance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update attendance');
    },
  });
};