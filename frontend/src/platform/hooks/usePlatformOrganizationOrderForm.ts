import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { calendarState } from '@/lib/calendarState';
import { platformApi } from '@/platform/lib/platformApi';
import { showToast } from '@/lib/toast';
import type {
  PlatformOrderForm,
  PlatformOrderFormDocument,
  PlatformOrderFormResponse,
} from '@/types/api/platformOrderForm';

const buildOrderFormQueryKey = (organizationId: string | null) => [
  'platform-order-form',
  organizationId,
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const usePlatformOrganizationOrderForm = (organizationId: string | null) => {
  return useQuery<PlatformOrderFormResponse>({
    queryKey: buildOrderFormQueryKey(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      const response = await platformApi.orderForms.get(organizationId);
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
};

export const useSavePlatformOrganizationOrderForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: Partial<PlatformOrderForm>;
    }) => {
      const response = await platformApi.orderForms.update(organizationId, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(buildOrderFormQueryKey(variables.organizationId), data);
      showToast.success('Order form saved');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to save order form');
    },
  });
};

export const useDownloadPlatformOrganizationOrderFormPdf = () => {
  return useMutation({
    mutationFn: async (payload: {
      organizationId: string;
      orderForm?: Partial<PlatformOrderForm>;
    }) => {
      const { organizationId, orderForm } = payload;
      const calendar = calendarState.get();
      const language =
        (typeof window !== 'undefined' && localStorage.getItem('nazim-language')) || 'ps';
      const calendarPreference =
        calendar === 'hijri_shamsi' ? 'jalali' : calendar === 'hijri_qamari' ? 'qamari' : 'gregorian';
      const result = await platformApi.orderForms.downloadPdf(organizationId, {
        calendar_preference: calendarPreference,
        language,
        order_form: orderForm,
      });
      const filename = result.filename || 'nazim-order-form.pdf';
      downloadBlob(result.blob, filename);
      return filename;
    },
    onSuccess: () => {
      showToast.success('PDF downloaded');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to download PDF');
    },
  });
};

export const useUploadPlatformOrganizationOrderFormDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      file,
      documentCategory,
      title,
      notes,
    }: {
      organizationId: string;
      file: File;
      documentCategory: PlatformOrderFormDocument['document_category'];
      title?: string;
      notes?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_category', documentCategory);
      if (title) {
        formData.append('title', title);
      }
      if (notes) {
        formData.append('notes', notes);
      }

      const response = await platformApi.orderForms.uploadDocument(organizationId, formData);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildOrderFormQueryKey(variables.organizationId),
      });
      showToast.success('Document uploaded');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to upload document');
    },
  });
};

export const useDownloadPlatformOrganizationOrderFormDocument = () => {
  return useMutation({
    mutationFn: async ({
      organizationId,
      documentId,
      fileName,
    }: {
      organizationId: string;
      documentId: string;
      fileName: string;
    }) => {
      const result = await platformApi.orderForms.downloadDocument(organizationId, documentId);
      downloadBlob(result.blob, result.filename || fileName || 'document');
      return result.filename || fileName;
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to download document');
    },
  });
};

export const useDeletePlatformOrganizationOrderFormDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      documentId,
    }: {
      organizationId: string;
      documentId: string;
    }) => {
      await platformApi.orderForms.deleteDocument(organizationId, documentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildOrderFormQueryKey(variables.organizationId),
      });
      showToast.success('Document removed');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete document');
    },
  });
};

export const useCreatePlatformOrganizationOrderFormPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: {
        payment_type: 'license' | 'maintenance';
        amount: number;
        currency: 'AFN' | 'USD';
        payment_date: string;
        payment_method?: string;
        payment_reference?: string;
        notes?: string;
      };
    }) => {
      const response = await platformApi.orderForms.createPayment(organizationId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildOrderFormQueryKey(variables.organizationId),
      });
      showToast.success('Payment recorded');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to record payment');
    },
  });
};

export const useDeletePlatformOrganizationOrderFormPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      paymentId,
    }: {
      organizationId: string;
      paymentId: string;
    }) => {
      await platformApi.orderForms.deletePayment(organizationId, paymentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildOrderFormQueryKey(variables.organizationId),
      });
      showToast.success('Payment removed');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to remove payment');
    },
  });
};
