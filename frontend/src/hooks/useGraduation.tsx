import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { useHasPermission } from './usePermissions';

import {
  certificateTemplatesV2Api,
  graduationBatchesApi,
  issuedCertificatesApi,
} from '@/lib/api/client';
import { showToast } from '@/lib/toast';

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
    mutationFn: async (data: {
      school_id: string;
      academic_year_id: string;
      class_id: string;
      exam_id?: string;
      exam_ids?: string[];
      exam_weights?: Record<string, number>;
      graduation_date: string;
      graduation_type?: 'final_year' | 'promotion' | 'transfer';
      from_class_id?: string;
      to_class_id?: string;
      min_attendance_percentage?: number;
      require_attendance?: boolean;
      exclude_approved_leaves?: boolean;
    }) => {
      // Ensure exam_weights is passed correctly if provided
      const payload = { ...data };
      
      // If exam_weights is provided, ensure it's in the correct format
      if (payload.exam_weights && Object.keys(payload.exam_weights).length > 0) {
        // Validate weights are numbers (already handled by backend, but ensure type safety)
        const weights: Record<string, number> = {};
        for (const [examId, weight] of Object.entries(payload.exam_weights)) {
          weights[examId] = typeof weight === 'number' ? weight : parseFloat(String(weight));
        }
        payload.exam_weights = weights;
      }
      
      return graduationBatchesApi.create(payload);
    },
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
    mutationFn: async ({ id, data }: { 
      id: string; 
      data: {
        academic_year_id?: string;
        class_id?: string;
        exam_id?: string;
        exam_ids?: string[];
        exam_weights?: Record<string, number>;
        graduation_date?: string;
        graduation_type?: 'final_year' | 'promotion' | 'transfer';
        from_class_id?: string;
        to_class_id?: string;
        min_attendance_percentage?: number;
        require_attendance?: boolean;
        exclude_approved_leaves?: boolean;
      };
    }) => {
      // Ensure exam_weights is passed correctly if provided
      const payload = { ...data };
      
      // If exam_weights is provided, ensure it's in the correct format
      if (payload.exam_weights && Object.keys(payload.exam_weights).length > 0) {
        // Validate weights are numbers (already handled by backend, but ensure type safety)
        const weights: Record<string, number> = {};
        for (const [examId, weight] of Object.entries(payload.exam_weights)) {
          weights[examId] = typeof weight === 'number' ? weight : parseFloat(String(weight));
        }
        payload.exam_weights = weights;
      }
      
      return graduationBatchesApi.update(
        id, 
        payload, 
        profile?.default_school_id ? { school_id: profile.default_school_id } : undefined
      );
    },
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
    mutationFn: ({ 
      batchId, 
      templateId, 
      schoolId,
      startingNumber,
      prefix,
      certificateType,
      padding,
    }: { 
      batchId: string; 
      templateId: string; 
      schoolId?: string;
      startingNumber?: number;
      prefix?: string;
      certificateType?: string;
      padding?: number;
    }) =>
      graduationBatchesApi.issueCertificates(batchId, { 
        template_id: templateId, 
        school_id: schoolId,
        starting_number: startingNumber,
        prefix: prefix,
        certificate_type: certificateType,
        padding: padding,
      }),
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
      // Always pass filters - backend will return school-specific + general (null school_id) templates
      const result = await certificateTemplatesV2Api.list(filters);
      if (import.meta.env.DEV) {
        console.log('[useCertificateTemplatesV2] Fetched templates:', result?.length || 0, 'filters:', filters);
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
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
    onSuccess: async () => {
      showToast.success('toast.certificateTemplates.created');
      await queryClient.invalidateQueries({ queryKey: ['certificate-templates-v2'] });
      await queryClient.refetchQueries({ queryKey: ['certificate-templates-v2'] });
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
    onSuccess: async (_, vars) => {
      showToast.success('toast.certificateTemplates.updated');
      await queryClient.invalidateQueries({ queryKey: ['certificate-templates-v2'] });
      await queryClient.invalidateQueries({ queryKey: ['certificate-template-v2', vars.id] });
      await queryClient.refetchQueries({ queryKey: ['certificate-templates-v2'] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.certificateTemplates.updateFailed'),
  });
};

export const useDeleteCertificateTemplateV2 = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => certificateTemplatesV2Api.delete(id),
    onSuccess: async () => {
      showToast.success('toast.certificateTemplates.deleted');
      await queryClient.invalidateQueries({ queryKey: ['certificate-templates-v2'] });
      await queryClient.refetchQueries({ queryKey: ['certificate-templates-v2'] });
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
  const hasPermission = useHasPermission('issued_certificates.read');

  // Use default_school_id from profile if school_id not provided
  const effectiveFilters = {
    ...filters,
    school_id: filters?.school_id || profile?.default_school_id || undefined,
  };

  return useQuery({
    queryKey: ['issued-certificates', effectiveFilters],
    enabled: !!user && !!profile && hasPermission !== false && !!effectiveFilters.school_id, // Require school_id
    queryFn: async () => {
      if (!user || !profile) return [];
      if (!effectiveFilters.school_id) {
        if (import.meta.env.DEV) {
          console.warn('[useIssuedCertificates] No school_id provided and user has no default_school_id');
        }
        return [];
      }
      try {
        return await issuedCertificatesApi.list(effectiveFilters);
      } catch (error: any) {
        // Handle 403 errors gracefully - user doesn't have permission
        // API client throws Error objects, check message for 403
        const errorMessage = error?.message || '';
        if (errorMessage.includes('403') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
          if (import.meta.env.DEV) {
            console.warn('[useIssuedCertificates] User does not have issued_certificates.read permission');
          }
          return [];
        }
        // Handle "No default school" error
        if (errorMessage.includes('No default school') || errorMessage.includes('no school_id provided')) {
          if (import.meta.env.DEV) {
            console.warn('[useIssuedCertificates] No school_id available - user needs to select a school');
          }
          return [];
        }
        // For other errors, log and return empty array to prevent UI crashes
        if (import.meta.env.DEV) {
          console.error('[useIssuedCertificates] Error fetching certificates:', error);
        }
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useRevokeCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason, school_id }: { id: string; reason: string; school_id?: string }) => 
      issuedCertificatesApi.revoke(id, reason, school_id),
    onSuccess: () => {
      showToast.success('toast.certificates.revoked');
      void queryClient.invalidateQueries({ queryKey: ['issued-certificates'] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.certificates.revokeFailed'),
  });
};
