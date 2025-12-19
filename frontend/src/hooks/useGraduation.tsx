import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { showToast } from '@/lib/toast';
import {
  certificateTemplatesV2Api,
  graduationBatchesApi,
  issuedCertificatesApi,
} from '@/lib/api/client';

export const useGraduationBatches = (filters?: {
  school_id?: string;
  academic_year_id?: string;
  class_id?: string;
  exam_id?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['graduation-batches', filters],
    // Only enable if user/profile exist AND we have a school_id or default_school_id
    // This prevents 403 errors when school_id is not available
    enabled: !!user && !!profile && (!!filters?.school_id || !!profile?.default_school_id),
    queryFn: async () => {
      if (!user || !profile) return [];
      return graduationBatchesApi.list(filters);
    },
  });
};

export const useGraduationBatch = (id?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['graduation-batch', id, profile?.default_school_id],
    enabled: !!user && !!profile && !!id && (!!profile?.default_school_id || true), // Allow even without school_id
    queryFn: async () => {
      if (!id) throw new Error('Missing batch id');
      // Pass school_id if available, but don't require it
      return graduationBatchesApi.get(id, profile?.default_school_id ? { school_id: profile.default_school_id } : undefined);
    },
  });
};

export const useCreateGraduationBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: graduationBatchesApi.create,
    onSuccess: () => {
      showToast.success('toast.graduation.batchCreated');
      void queryClient.invalidateQueries({ queryKey: ['graduation-batches'] });
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'toast.graduation.batchCreateFailed');
    },
  });
};

export const useUpdateGraduationBatch = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      graduationBatchesApi.update(id, data, profile?.default_school_id ? { school_id: profile.default_school_id } : undefined),
    onSuccess: (_, vars) => {
      showToast.success('toast.graduation.batchUpdated');
      void queryClient.invalidateQueries({ queryKey: ['graduation-batches'] });
      void queryClient.invalidateQueries({ queryKey: ['graduation-batch', vars.id] });
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'toast.graduation.batchUpdateFailed');
    },
  });
};

export const useDeleteGraduationBatch = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      await graduationBatchesApi.delete(id, profile?.default_school_id ? { school_id: profile.default_school_id } : undefined);
    },
    onSuccess: async () => {
      showToast.success('toast.graduation.batchDeleted');
      await queryClient.invalidateQueries({ queryKey: ['graduation-batches'] });
      await queryClient.refetchQueries({ queryKey: ['graduation-batches'] });
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'toast.graduation.batchDeleteFailed');
    },
  });
};

export const useGenerateGraduationStudents = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: ({ batchId, schoolId }: { batchId: string; schoolId?: string }) =>
      graduationBatchesApi.generateStudents(batchId, { school_id: schoolId }),
    onSuccess: (_, vars) => {
      showToast.success(t('toast.graduation.studentsGenerated') || 'Students generated successfully');
      void queryClient.invalidateQueries({ queryKey: ['graduation-batch', vars.batchId] });
    },
    onError: (err: Error) => {
      // Display the error message from backend, or fallback to translated message
      const errorMessage = err.message || t('toast.graduation.studentsGenerateFailed') || 'Failed to generate students';
      showToast.error(errorMessage);
    },
  });
};

export const useApproveGraduationBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, schoolId }: { batchId: string; schoolId?: string }) =>
      graduationBatchesApi.approve(batchId, { school_id: schoolId }),
    onSuccess: (_, vars) => {
      showToast.success('toast.graduation.batchApproved');
      void queryClient.invalidateQueries({ queryKey: ['graduation-batch', vars.batchId] });
      void queryClient.invalidateQueries({ queryKey: ['graduation-batches'] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.graduation.batchApproveFailed'),
  });
};

export const useIssueGraduationCertificates = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, templateId, schoolId }: { batchId: string; templateId: string; schoolId?: string }) =>
      graduationBatchesApi.issueCertificates(batchId, { template_id: templateId, school_id: schoolId }),
    onSuccess: (_, vars) => {
      showToast.success('toast.graduation.certificatesIssued');
      void queryClient.invalidateQueries({ queryKey: ['graduation-batch', vars.batchId] });
      void queryClient.invalidateQueries({ queryKey: ['issued-certificates'] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.graduation.issueFailed'),
  });
};

export const useCertificateTemplatesV2 = (filters?: { school_id?: string; type?: string }) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['certificate-templates-v2', filters],
    enabled: !!user && !!profile,
    queryFn: async () => {
      if (!user || !profile) return [];
      return certificateTemplatesV2Api.list(filters);
    },
  });
};

export const useCreateCertificateTemplateV2 = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      school_id?: string;
      type: string;
      title: string;
      body_html?: string;
      layout_config?: any;
      background_image?: File | null;
      description?: string | null;
      page_size?: 'A4' | 'A5' | 'custom';
      custom_width_mm?: number | null;
      custom_height_mm?: number | null;
      rtl?: boolean;
      font_family?: string | null;
      is_active?: boolean;
    }) => certificateTemplatesV2Api.create(data),
    onSuccess: () => {
      showToast.success('toast.certificateTemplates.created');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates-v2'] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.certificateTemplates.createFailed'),
  });
};

export const useUpdateCertificateTemplateV2 = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { 
      id: string; 
      data: {
        school_id?: string;
        type?: string;
        title?: string;
        body_html?: string;
        layout_config?: any;
        background_image?: File | null;
        description?: string | null;
        page_size?: 'A4' | 'A5' | 'custom';
        custom_width_mm?: number | null;
        custom_height_mm?: number | null;
        rtl?: boolean;
        font_family?: string | null;
        is_active?: boolean;
      };
    }) => certificateTemplatesV2Api.update(id, data),
    onSuccess: (_, vars) => {
      showToast.success('toast.certificateTemplates.updated');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates-v2'] });
      void queryClient.invalidateQueries({ queryKey: ['certificate-template-v2', vars.id] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.certificateTemplates.updateFailed'),
  });
};

export const useDeleteCertificateTemplateV2 = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => certificateTemplatesV2Api.delete(id),
    onSuccess: () => {
      showToast.success('toast.certificateTemplates.deleted');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates-v2'] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.certificateTemplates.deleteFailed'),
  });
};

export const getGraduationCertificateBackgroundUrl = (templateId: string) => {
  return certificateTemplatesV2Api.getBackgroundUrl(templateId);
};

export const useIssuedCertificates = (filters?: {
  school_id?: string;
  student_id?: string;
  batch_id?: string;
  type?: string;
}) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['issued-certificates', filters],
    enabled: !!user && !!profile,
    queryFn: async () => {
      if (!user || !profile) return [];
      return issuedCertificatesApi.list(filters);
    },
  });
};

export const useRevokeCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => issuedCertificatesApi.revoke(id, reason),
    onSuccess: () => {
      showToast.success('toast.certificates.revoked');
      void queryClient.invalidateQueries({ queryKey: ['issued-certificates'] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.certificates.revokeFailed'),
  });
};
