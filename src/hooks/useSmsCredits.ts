import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SmsCredits {
  id: string;
  credits: number;
  updated_at: string;
}

export const useSmsCredits = () => {
  return useQuery({
    queryKey: ['smsCredits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_credits')
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as SmsCredits;
    },
  });
};

export const useDecrementSmsCredits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const { data, error } = await supabase.rpc('decrement_sms_credit', { amount });
      if (error) {
        throw new Error(error.message);
      }
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsCredits'] });
    },
  });
};
