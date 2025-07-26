import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Fee {
  id: string;
  student_id: string;
  academic_year_id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  payment_method?: string;
  transaction_id?: string;
  remarks?: string;
  created_at: string;
  student?: {
    student_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export interface Invoice {
  id: string;
  student_id: string;
  fee_structure_id: string;
  academic_year_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useFees = (filters?: { student_id?: string; status?: string }) => {
  return useQuery({
    queryKey: ['fees', filters],
    queryFn: async () => {
      let query = supabase
        .from('fees')
        .select(`
          *,
          student:students!student_id (
            student_id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters?.status && ['pending', 'paid', 'overdue', 'waived'].includes(filters.status)) {
        query = query.eq('status', filters.status as 'pending' | 'paid' | 'overdue' | 'waived');
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as Fee[];
    },
  });
};

export const useInvoices = (filters?: { student_id?: string; status?: string }) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters?.status && ['pending', 'paid', 'partial', 'overdue', 'cancelled'].includes(filters.status)) {
        query = query.eq('status', filters.status as 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled');
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as Invoice[];
    },
  });
};

export const useCreateFee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeData: Omit<Fee, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('fees')
        .insert(feeData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee record created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create fee record');
    },
  });
};

export const useUpdateFee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Fee> & { id: string }) => {
      const { data, error } = await supabase
        .from('fees')
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
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee record updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update fee record');
    },
  });
};