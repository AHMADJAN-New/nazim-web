import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResidencyType {
  id: string;
  type: string;
  created_at: string;
}

export const useResidencyTypes = () => {
  return useQuery({
    queryKey: ['residency-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residency_types')
        .select('*')
        .order('type', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as ResidencyType[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useCreateResidencyType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (typeData: { type: string }) => {
      // Validation: max 100 characters
      if (typeData.type.length > 100) {
        throw new Error('Residency type must be 100 characters or less');
      }

      // Check for duplicates
      const { data: existing } = await supabase
        .from('residency_types')
        .select('id')
        .eq('type', typeData.type)
        .single();

      if (existing) {
        throw new Error('This residency type already exists');
      }

      const { data, error } = await supabase
        .from('residency_types')
        .insert(typeData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      toast.success('Residency type created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create residency type');
    },
  });
};

export const useUpdateResidencyType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ResidencyType> & { id: string }) => {
      // Validation: max 100 characters
      if (updates.type && updates.type.length > 100) {
        throw new Error('Residency type must be 100 characters or less');
      }

      // Check for duplicates (excluding current record)
      if (updates.type) {
        const { data: existing } = await supabase
          .from('residency_types')
          .select('id')
          .eq('type', updates.type)
          .neq('id', id)
          .single();

        if (existing) {
          throw new Error('This residency type already exists');
        }
      }

      const { data, error } = await supabase
        .from('residency_types')
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
      queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      toast.success('Residency type updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update residency type');
    },
  });
};

export const useDeleteResidencyType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if residency type is in use by students
      // Note: This check should be done in the application layer
      // as we don't have a students table with residency_type_id yet
      // For now, we'll just attempt deletion and handle FK errors

      const { error } = await supabase
        .from('residency_types')
        .delete()
        .eq('id', id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503') {
          throw new Error('This residency type is in use and cannot be deleted');
        }
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      toast.success('Residency type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete residency type');
    },
  });
};

