import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type AdmissionApplication = Database['public']['Tables']['admission_applications']['Row'];

export const useAdmissions = () => {
  return useQuery({
    queryKey: ['admissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .order('applied_date', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as AdmissionApplication[];
    },
  });
};

export const useUpdateAdmissionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdmissionApplication['status'] }) => {
      const { data, error } = await supabase
        .from('admission_applications')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      toast.success('Application status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update application status');
    },
  });
};

