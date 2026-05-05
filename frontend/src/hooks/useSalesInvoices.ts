import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';

export interface SalesInvoiceListItem {
  id: string;
  invoice_number: string;
  currency: 'AFN' | 'USD' | string;
  total_amount: number;
  status: string;
  issued_at: string | null;
  due_date: string | null;
  paid_at?: string | null;
}

export interface SalesInvoiceDetail {
  invoice: SalesInvoiceListItem;
  items: Array<{
    id: string;
    title: string;
    description?: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    sort_order: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    payment_method: string;
    payment_reference?: string | null;
    payment_date: string | null;
    status: string;
    notes?: string | null;
  }>;
  payment_summary: { total: number; paid: number; due: number } | null;
}

export function useSalesInvoices() {
  const { user } = useAuth();

  return useQuery<SalesInvoiceListItem[]>({
    queryKey: ['sales-invoices', user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiClient.get<{ data: SalesInvoiceListItem[] }>('/subscription/sales-invoices');
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSalesInvoice(id: string | null) {
  const { user } = useAuth();

  return useQuery<SalesInvoiceDetail | null>({
    queryKey: ['sales-invoice', id, user?.id ?? null],
    enabled: !!user && !!id,
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<{ data: SalesInvoiceDetail }>('/subscription/sales-invoices/' + id);
      return res?.data ?? null;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export async function downloadSalesInvoicePdf(id: string): Promise<{ blob: Blob; filename: string | null }> {
  return apiClient.requestFile(`/subscription/sales-invoices/${id}/pdf`, { method: 'GET' });
}

