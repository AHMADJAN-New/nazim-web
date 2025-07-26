import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HifzProgress {
  id: string;
  student_id: string;
  date: string;
  surah_name?: string;
  ayah_from?: number;
  ayah_to?: number;
  pages_memorized?: number;
  revision_pages?: number;
  mistakes_count?: number;
  rating?: number;
  teacher_feedback?: string;
  recorded_by: string;
  created_at: string;
  student?: {
    student_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export const useHifzProgress = (filters?: { student_id?: string }) => {
  return useQuery({
    queryKey: ['hifz-progress', filters],
    queryFn: async () => {
      let query = supabase
        .from('hifz_progress')
        .select(`
          *,
          student:students!student_id (
            student_id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .order('date', { ascending: false });

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as HifzProgress[];
    },
  });
};

export const useCreateHifzProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (progressData: Omit<HifzProgress, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('hifz_progress')
        .insert(progressData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hifz-progress'] });
      toast.success('Hifz progress recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record hifz progress');
    },
  });
};

export const useUpdateHifzProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HifzProgress> & { id: string }) => {
      const { data, error } = await supabase
        .from('hifz_progress')
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
      queryClient.invalidateQueries({ queryKey: ['hifz-progress'] });
      toast.success('Hifz progress updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update hifz progress');
    },
  });
};