import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Communication {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  target_audience: string[];
  created_by: string;
  branch_id: string;
  published_date?: string;
  expires_at?: string;
  created_at: string;
  class_ids?: string[];
}

export const useCommunications = () => {
  return useQuery({
    queryKey: ['communications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as Communication[];
    },
  });
};

export const useCreateCommunication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communicationData: Omit<Communication, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('communications')
        .insert(communicationData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Communication created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create communication');
    },
  });
};

export const useUpdateCommunication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Communication> & { id: string }) => {
      const { data, error } = await supabase
        .from('communications')
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
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Communication updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update communication');
    },
  });
};

export const useDeleteCommunication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Communication deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete communication');
    },
  });
};