import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained: number;
  grade?: string;
  percentage?: number;
  remarks?: string;
  entered_by: string;
  created_at: string;
  updated_at: string;
  exam?: {
    name: string;
    total_marks: number;
    subject_id: string;
  };
  student?: {
    student_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export const useExamResults = (examId?: string) => {
  return useQuery({
    queryKey: ['exam-results', examId],
    queryFn: async () => {
      let query = supabase
        .from('exam_results')
        .select(`
          *,
          exam:exams!exam_id (
            name,
            total_marks,
            subject_id
          ),
          student:students!student_id (
            student_id,
            profiles:user_id (
              full_name
            )
          )
        `);

      if (examId) {
        query = query.eq('exam_id', examId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as any[];
    },
  });
};

export const useStudentExamResults = (studentId: string) => {
  return useQuery({
    queryKey: ['student-exam-results', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exam:exams!exam_id (
            name,
            total_marks,
            subject_id,
            exam_date
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as any[];
    },
  });
};

export const useCreateExamResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resultData: Omit<ExamResult, 'id' | 'created_at' | 'updated_at'>) => {
      // Calculate percentage if not provided
      const percentage = resultData.percentage || 
        (resultData.marks_obtained / (resultData.exam?.total_marks || 100)) * 100;

      // Determine grade based on percentage
      const grade = resultData.grade || calculateGrade(percentage);

      const { data, error } = await supabase
        .from('exam_results')
        .insert({
          ...resultData,
          percentage,
          grade
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      toast.success('Exam result added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add exam result');
    },
  });
};

export const useUpdateExamResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExamResult> & { id: string }) => {
      // Recalculate percentage and grade if marks changed
      if (updates.marks_obtained) {
        const percentage = (updates.marks_obtained / (updates.exam?.total_marks || 100)) * 100;
        updates.percentage = percentage;
        updates.grade = calculateGrade(percentage);
      }

      const { data, error } = await supabase
        .from('exam_results')
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
      queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      toast.success('Exam result updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update exam result');
    },
  });
};

export const useBulkCreateExamResults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (results: Omit<ExamResult, 'id' | 'created_at' | 'updated_at'>[]) => {
      const processedResults = results.map(result => {
        const percentage = result.percentage || 
          (result.marks_obtained / (result.exam?.total_marks || 100)) * 100;
        const grade = result.grade || calculateGrade(percentage);

        return {
          ...result,
          percentage,
          grade
        };
      });

      const { data, error } = await supabase
        .from('exam_results')
        .insert(processedResults)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      toast.success('Exam results imported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import exam results');
    },
  });
};

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}