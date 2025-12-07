import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { certificateTemplatesApi } from '@/lib/api/client';

export interface CertificateLayoutConfig {
  studentNamePosition?: { x: number; y: number };
  fatherNamePosition?: { x: number; y: number };
  courseNamePosition?: { x: number; y: number };
  certificateNumberPosition?: { x: number; y: number };
  datePosition?: { x: number; y: number };
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  rtl?: boolean;
}

export interface CertificateTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  background_image_path: string | null;
  layout_config: CertificateLayoutConfig;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateData {
  student: {
    id: string;
    full_name: string;
    father_name: string;
    registration_date: string | null;
    completion_date: string | null;
    certificate_number: string | null;
    certificate_issued_at: string | null;
    status: string;
  };
  course: {
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    duration_days: number | null;
    instructor_name: string | null;
  } | null;
  template: CertificateTemplate | null;
  background_url: string | null;
}

export const useCertificateTemplates = (activeOnly?: boolean) => {
  const { user, profile } = useAuth();

  return useQuery<CertificateTemplate[]>({
    queryKey: ['certificate-templates', activeOnly],
    queryFn: async () => {
      if (!user || !profile) return [];
      const params: any = {};
      if (activeOnly) params.active_only = 'true';
      const templates = await certificateTemplatesApi.list(params);
      return templates as CertificateTemplate[];
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCertificateTemplate = (templateId: string) => {
  const { user, profile } = useAuth();

  return useQuery<CertificateTemplate>({
    queryKey: ['certificate-template', templateId],
    queryFn: async () => {
      if (!user || !profile) throw new Error('Not authenticated');
      const template = await certificateTemplatesApi.get(templateId);
      return template as CertificateTemplate;
    },
    enabled: !!user && !!profile && !!templateId,
  });
};

export const useCreateCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string | null;
      background_image?: File | null;
      layout_config?: CertificateLayoutConfig;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.background_image) formData.append('background_image', data.background_image);
      if (data.layout_config) formData.append('layout_config', JSON.stringify(data.layout_config));
      if (data.is_default !== undefined) formData.append('is_default', data.is_default ? '1' : '0');
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

      const template = await certificateTemplatesApi.create(formData);
      return template as CertificateTemplate;
    },
    onSuccess: () => {
      toast.success('Certificate template created');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not create template'),
  });
};

export const useUpdateCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        name?: string;
        description?: string | null;
        background_image?: File | null;
        layout_config?: CertificateLayoutConfig;
        is_default?: boolean;
        is_active?: boolean;
      };
    }) => {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.description !== undefined) formData.append('description', data.description || '');
      if (data.background_image) formData.append('background_image', data.background_image);
      if (data.layout_config) formData.append('layout_config', JSON.stringify(data.layout_config));
      if (data.is_default !== undefined) formData.append('is_default', data.is_default ? '1' : '0');
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

      const template = await certificateTemplatesApi.update(id, formData);
      return template as CertificateTemplate;
    },
    onSuccess: () => {
      toast.success('Certificate template updated');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['certificate-template'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not update template'),
  });
};

export const useDeleteCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await certificateTemplatesApi.delete(id);
      return id;
    },
    onSuccess: () => {
      toast.success('Certificate template deleted');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete template'),
  });
};

export const useSetDefaultCertificateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const template = await certificateTemplatesApi.setDefault(id);
      return template as CertificateTemplate;
    },
    onSuccess: () => {
      toast.success('Default template updated');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not set default template'),
  });
};

export const useGenerateCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseStudentId, templateId }: { courseStudentId: string; templateId: string }) => {
      const result = await certificateTemplatesApi.generateCertificate(courseStudentId, { template_id: templateId });
      return result as {
        student: any;
        template: CertificateTemplate;
        background_url: string | null;
      };
    },
    onSuccess: () => {
      toast.success('Certificate generated');
      void queryClient.invalidateQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not generate certificate'),
  });
};

export const useCertificateData = (courseStudentId: string) => {
  const { user, profile } = useAuth();

  return useQuery<CertificateData>({
    queryKey: ['certificate-data', courseStudentId],
    queryFn: async () => {
      if (!user || !profile) throw new Error('Not authenticated');
      const data = await certificateTemplatesApi.getCertificateData(courseStudentId);
      return data as CertificateData;
    },
    enabled: !!user && !!profile && !!courseStudentId,
  });
};

export const getCertificateBackgroundUrl = (templateId: string) => {
  return certificateTemplatesApi.getBackgroundUrl(templateId);
};
