import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Donation {
  id: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: number;
  purpose: string;
  donationType: 'individual' | 'corporate' | 'anonymous';
  paymentMethod: string;
  transactionId: string;
  donationDate: string;
  receiptGenerated: boolean;
  notes?: string | null;
  branchId: string;
  createdAt: string;
}

interface DonationStats {
  donations: Donation[];
  totalAmount: number;
  monthlyAmount: number;
  count: number;
}

export const useDonationStats = () => {
  const query = useQuery({
    queryKey: ['donations'],
    queryFn: async (): Promise<DonationStats> => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startDate = startOfMonth.toISOString().split('T')[0];

      const { data, count, error } = await supabase
        .from('donations')
        .select('*', { count: 'exact' })
        .order('donation_date', { ascending: false });

      if (error) throw new Error(error.message);

      const donations: Donation[] = (data ?? []).map((d) => ({
        id: d.id,
        donorName: d.donor_name,
        donorEmail: d.donor_email,
        donorPhone: d.donor_phone,
        amount: Number(d.amount),
        purpose: d.purpose,
        donationType: d.donation_type,
        paymentMethod: d.payment_method,
        transactionId: d.transaction_id,
        donationDate: d.donation_date,
        receiptGenerated: d.receipt_generated,
        notes: d.notes,
        branchId: d.branch_id,
        createdAt: d.created_at,
      }));

      const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
      const monthlyAmount = donations
        .filter((d) => d.donationDate >= startDate)
        .reduce((sum, d) => sum + d.amount, 0);

      return {
        donations,
        totalAmount,
        monthlyAmount,
        count: count ?? 0,
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        query.refetch();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [query.refetch]);

  return query;
};

