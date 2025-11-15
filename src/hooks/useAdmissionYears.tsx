import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdmissionYear {
  id: string;
  year: string;
  created_at: string;
}

export const useAdmissionYears = () => {
  return useQuery({
    queryKey: ['admission-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admission_years')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as AdmissionYear[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useCreateAdmissionYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (yearData: { year: string }) => {
      // Validation: max 50 characters
      if (yearData.year.length > 50) {
        throw new Error('Year must be 50 characters or less');
      }

      // Check for duplicates
      const { data: existing } = await supabase
        .from('admission_years')
        .select('id')
        .eq('year', yearData.year)
        .single();

      if (existing) {
        throw new Error('This admission year already exists');
      }

      const { data, error } = await supabase
        .from('admission_years')
        .insert(yearData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-years'] });
      toast.success('Admission year created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create admission year');
    },
  });
};

