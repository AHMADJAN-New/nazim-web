import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
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
    enabled: !!user && !!profile,
    queryFn: async () => {
      if (!user || !profile) return [];
      return graduationBatchesApi.list(filters);
    },
  });
};

export const useGraduationBatch = (id?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['graduation-batch', id],
    enabled: !!user && !!profile && !!id,
    queryFn: async () => {
      if (!id) throw new Error('Missing batch id');
      return graduationBatchesApi.get(id);
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

export const useGenerateGraduationStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, schoolId }: { batchId: string; schoolId?: string }) =>
      graduationBatchesApi.generateStudents(batchId, { school_id: schoolId }),
    onSuccess: (_, vars) => {
      showToast.success('toast.graduation.studentsGenerated');
      void queryClient.invalidateQueries({ queryKey: ['graduation-batch', vars.batchId] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.graduation.studentsGenerateFailed'),
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
    mutationFn: certificateTemplatesV2Api.create,
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
    mutationFn: ({ id, data }: { id: string; data: any }) => certificateTemplatesV2Api.update(id, data),
    onSuccess: (_, vars) => {
      showToast.success('toast.certificateTemplates.updated');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates-v2'] });
      void queryClient.invalidateQueries({ queryKey: ['certificate-template-v2', vars.id] });
    },
    onError: (err: Error) => showToast.error(err.message || 'toast.certificateTemplates.updateFailed'),
  });
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
