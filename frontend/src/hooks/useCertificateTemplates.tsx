import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { certificateTemplatesApi } from '@/lib/api/client';

export interface CertificateLayoutConfig {
  // Field positions (x, y as percentages 0-100)
  headerPosition?: { x: number; y: number };
  studentNamePosition?: { x: number; y: number };
  fatherNamePosition?: { x: number; y: number };
  grandfatherNamePosition?: { x: number; y: number };
  motherNamePosition?: { x: number; y: number };
  courseNamePosition?: { x: number; y: number }; // For course certificates
  classNamePosition?: { x: number; y: number }; // For graduation certificates
  schoolNamePosition?: { x: number; y: number }; // For graduation certificates
  academicYearPosition?: { x: number; y: number }; // For graduation certificates
  graduationDatePosition?: { x: number; y: number }; // For graduation certificates
  positionPosition?: { x: number; y: number }; // For graduation certificates (rank/position)
  certificateNumberPosition?: { x: number; y: number };
  datePosition?: { x: number; y: number }; // For course certificates
  provincePosition?: { x: number; y: number };
  districtPosition?: { x: number; y: number };
  villagePosition?: { x: number; y: number };
  nationalityPosition?: { x: number; y: number };
  guardianNamePosition?: { x: number; y: number };
  studentPhotoPosition?: { x: number; y: number; width?: number; height?: number };
  qrCodePosition?: { x: number; y: number; width?: number; height?: number };
  directorSignaturePosition?: { x: number; y: number }; // For course certificates
  officialSealPosition?: { x: number; y: number }; // For course certificates
  // Editable text content for fields
  headerText?: string; // Custom header text (default: "Certificate of Completion" or "Graduation Certificate")
  courseNameText?: string; // Custom course name label/prefix (default: empty, uses actual course name)
  classNameText?: string; // Custom class name label/prefix (default: empty, uses actual class name)
  dateText?: string; // Custom date label/prefix (default: "Date:")
  directorSignatureText?: string; // Custom director signature label (default: "Director Signature", empty string to hide)
  officialSealText?: string; // Custom official seal label (default: "Official Seal", empty string to hide)
  certificateNumberPrefix?: string; // Custom certificate number prefix (default: "Certificate No:", empty string to show only number)
  qrCodeValueSource?: 'certificate_number' | 'admission_no' | 'student_id' | 'course_student_id'; // What data should be encoded in QR
  // Field visibility (optional fields - user can enable/disable)
  enabledFields?: string[]; // Array of field IDs that should be displayed
  // Global style settings (used as defaults)
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  rtl?: boolean;
  // Per-field font settings (overrides global settings)
  fieldFonts?: {
    [fieldId: string]: {
      fontSize?: number; // Custom font size for this field (overrides global fontSize * multiplier)
      fontFamily?: string; // Custom font family for this field (overrides global fontFamily)
    };
  };
}

export interface CertificateTemplate {
  id: string;
  organization_id: string;
  course_id: string | null;
  school_id: string | null;
  type: string | null;
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
    father_name?: string | null;
    grandfather_name?: string | null;
    mother_name?: string | null;
    registration_date: string | null;
    completion_date: string | null;
    certificate_number: string | null;
    certificate_issued_at: string | null;
    status: string;
    curr_province?: string | null;
    curr_district?: string | null;
    curr_village?: string | null;
    nationality?: string | null;
    guardian_name?: string | null;
    picture_path?: string | null;
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

export const useCertificateTemplates = (activeOnly?: boolean, filters?: { type?: string; school_id?: string }) => {
  const { user, profile } = useAuth();

  return useQuery<CertificateTemplate[]>({
    queryKey: ['certificate-templates', activeOnly, filters],
    queryFn: async () => {
      if (!user || !profile) return [];
      const params: any = {};
      if (activeOnly) params.active_only = 'true';
      if (filters?.type) params.type = filters.type;
      // Strict school scoping: do not allow client-selected school_id.
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
      course_id?: string | null;
      school_id?: string | null;
      type?: string;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.background_image) formData.append('background_image', data.background_image);
      if (data.layout_config) formData.append('layout_config', JSON.stringify(data.layout_config));
      if (data.course_id) formData.append('course_id', data.course_id);
      // Strict school scoping: server derives school from context.
      if (data.type) formData.append('type', data.type);
      if (data.is_default !== undefined) formData.append('is_default', data.is_default ? '1' : '0');
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

      const template = await certificateTemplatesApi.create(formData);
      return template as CertificateTemplate;
    },
    onSuccess: () => {
      showToast.success('toast.certificateTemplates.created');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'toast.certificateTemplates.createFailed';
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[useCreateCertificateTemplate] Error:', error);
      }
    },
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
        course_id?: string | null;
        school_id?: string | null;
        type?: string;
        is_default?: boolean;
        is_active?: boolean;
      };
    }) => {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.description !== undefined) formData.append('description', data.description || '');
      if (data.background_image) formData.append('background_image', data.background_image);
      if (data.layout_config) formData.append('layout_config', JSON.stringify(data.layout_config));
      if (data.course_id !== undefined) formData.append('course_id', data.course_id || '');
      // Strict school scoping: server derives school from context.
      if (data.type) formData.append('type', data.type);
      if (data.is_default !== undefined) formData.append('is_default', data.is_default ? '1' : '0');
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

      const template = await certificateTemplatesApi.update(id, formData);
      return template as CertificateTemplate;
    },
    onSuccess: () => {
      showToast.success('toast.certificateTemplates.updated');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['certificate-template'] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'toast.certificateTemplates.updateFailed';
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[useUpdateCertificateTemplate] Error:', error);
      }
    },
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
      showToast.success('toast.certificateTemplates.deleted');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.certificateTemplates.deleteFailed'),
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
      showToast.success('toast.certificateTemplates.defaultUpdated');
      void queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.certificateTemplates.setDefaultFailed'),
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
      showToast.success('toast.certificateTemplates.generated');
      void queryClient.invalidateQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.certificateTemplates.generateFailed'),
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
