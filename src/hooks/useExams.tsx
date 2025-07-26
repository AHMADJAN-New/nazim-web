import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Exam {
  id: string;
  name: string;
  subject_id: string;
  class_id: string;
  branch_id: string;
  exam_date: string;
  type: 'quiz' | 'midterm' | 'final' | 'assignment';
  total_marks: number;
  pass_marks?: number;
  duration_minutes?: number;
  instructions?: string;
  created_by: string;
  created_at: string;
  subjects?: {
    name: string;
    code: string;
  };
  classes?: {
    name: string;
  };
}

export const useExams = (filters?: { class_id?: string; subject_id?: string }) => {
  return useQuery({
    queryKey: ['exams', filters],
    queryFn: async () => {
      let query = supabase
        .from('exams')
        .select(`
          *,
          subjects (
            name,
            code
          ),
          classes (
            name
          )
        `)
        .order('exam_date', { ascending: false });

      if (filters?.class_id) {
        query = query.eq('class_id', filters.class_id);
      }
      if (filters?.subject_id) {
        query = query.eq('subject_id', filters.subject_id);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as Exam[];
    },
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examData: Omit<Exam, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create exam');
    },
  });
};

export const useUpdateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Exam> & { id: string }) => {
      const { data, error } = await supabase
        .from('exams')
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
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update exam');
    },
  });
};

export const useDeleteExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete exam');
    },
  });
};