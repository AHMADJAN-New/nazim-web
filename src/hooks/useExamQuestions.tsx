import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_number: number;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';
  options?: string[];
  correct_answer?: string;
  marks: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  subject_area?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useExamQuestions = (examId?: string) => {
  return useQuery({
    queryKey: ['exam-questions', examId],
    queryFn: async () => {
      let query = supabase
        .from('exam_questions')
        .select('*')
        .order('question_number', { ascending: true });

      if (examId) {
        query = query.eq('exam_id', examId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as ExamQuestion[];
    },
  });
};

export const useCreateExamQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionData: Omit<ExamQuestion, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('exam_questions')
        .insert(questionData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-questions'] });
      toast.success('Question added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add question');
    },
  });
};

export const useUpdateExamQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExamQuestion> & { id: string }) => {
      const { data, error } = await supabase
        .from('exam_questions')
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
      queryClient.invalidateQueries({ queryKey: ['exam-questions'] });
      toast.success('Question updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update question');
    },
  });
};

export const useDeleteExamQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-questions'] });
      toast.success('Question deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete question');
    },
  });
};