import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';


export interface FinanceDocument {
  id: string;
  organization_id: string;
  school_id: string | null;
  document_type: 'invoice' | 'receipt' | 'budget' | 'report' | 'tax_document' | 'voucher' | 'bank_statement' | 'other';
  title: string;
  description: string | null;
  fee_collection_id: string | null;
  student_id: string | null;
  staff_id: string | null;
  amount: string | null;
  reference_number: string | null;
  document_date: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinanceDocumentFilters {
  documentType?: string;
  studentId?: string;
  staffId?: string;
  feeCollectionId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// CRITICAL: ALWAYS use organization_id AND default_school_id for multi-tenancy
export const useFinanceDocuments = (filters?: FinanceDocumentFilters) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['finance-documents', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id || !profile.default_school_id) {
        return [];
      }

      const params = new URLSearchParams();
      if (filters?.documentType && filters.documentType !== 'all') {
        params.append('document_type', filters.documentType);
      }
      if (filters?.studentId) {
        params.append('student_id', filters.studentId);
      }
      if (filters?.staffId) {
        params.append('staff_id', filters.staffId);
      }
      if (filters?.feeCollectionId) {
        params.append('fee_collection_id', filters.feeCollectionId);
      }
      if (filters?.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('end_date', filters.endDate);
      }
      if (filters?.search) {
        params.append('search', filters.search);
      }

      const queryString = params.toString();
      const url = `/finance-documents${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.request<FinanceDocument[]>(url, {
        method: 'GET',
      });

      return response;
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateFinanceDocument = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: FormData) => {
      if (!user || !profile || !profile.organization_id || !profile.default_school_id) {
        throw new Error('User must be assigned to an organization and school');
      }

      const response = await apiClient.request<FinanceDocument>('/finance-documents', {
        method: 'POST',
        body: data,
      });

      return response;
    },
    onSuccess: () => {
      showToast.success(t('toast.financeDocumentCreated'));
      void queryClient.invalidateQueries({ queryKey: ['finance-documents'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.financeDocumentCreateFailed'));
    },
  });
};

export const useDeleteFinanceDocument = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      await apiClient.request(`/finance-documents/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: async () => {
      showToast.success(t('toast.financeDocumentDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['finance-documents'] });
      await queryClient.refetchQueries({ queryKey: ['finance-documents'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.financeDocumentDeleteFailed'));
    },
  });
};

export const useDownloadFinanceDocument = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/finance-documents/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'document';

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.financeDocumentDownloadFailed'));
    },
  });
};

