import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Donation {
  id: string;
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  amount: number;
  purpose: string;
  donation_type: 'individual' | 'corporate' | 'anonymous';
  payment_method: string;
  transaction_id: string;
  donation_date: string;
  receipt_generated: boolean;
  notes?: string;
  branch_id: string;
  created_at: string;
}

export const useDonations = () => {
  return useQuery({
    queryKey: ['donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as Donation[];
    },
  });
};

export const useCreateDonation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (donationData: Omit<Donation, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('donations')
        .insert(donationData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Donation record created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create donation record');
    },
  });
};

export const useUpdateDonation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Donation> & { id: string }) => {
      const { data, error } = await supabase
        .from('donations')
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
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Donation record updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update donation record');
    },
  });
};

export const useDeleteDonation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Donation record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete donation record');
    },
  });
};