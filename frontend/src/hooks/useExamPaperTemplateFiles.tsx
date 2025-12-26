import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import { useAuth } from './useAuth';
import { examPaperTemplatesApi } from '@/lib/api/client';
import type * as ExamPaperTemplateFileApi from '@/types/api/examPaperTemplateFile';
import type { ExamPaperTemplateFile } from '@/types/domain/examPaperTemplateFile';
import {
  mapExamPaperTemplateFileApiToDomain,
  mapExamPaperTemplateFileDomainToInsert,
  mapExamPaperTemplateFileDomainToUpdate,
} from '@/mappers/examPaperTemplateFileMapper';

// Re-export domain types for convenience
export type { ExamPaperTemplateFile } from '@/types/domain/examPaperTemplateFile';
export type { ExamPaperLanguage } from '@/types/domain/examPaperTemplateFile';

export interface UseExamPaperTemplateFilesParams {
  language?: 'en' | 'ps' | 'fa' | 'ar';
  isActive?: boolean;
  isDefault?: boolean;
}

export const useExamPaperTemplateFiles = (params?: UseExamPaperTemplateFilesParams) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useQuery<ExamPaperTemplateFile[]>({
    queryKey: ['exam-paper-template-files', profile?.organization_id, profile?.default_school_id ?? null, params?.language, params?.isActive, params?.isDefault],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) {
        if (import.meta.env.DEV) {
          console.log('[useExamPaperTemplateFiles] No user or profile');
        }
        return [];
      }

      try {
        const apiFiles = await examPaperTemplatesApi.templateFiles.list({
          language: params?.language,
          is_active: params?.isActive,
          is_default: params?.isDefault,
        });

        return (apiFiles as ExamPaperTemplateFileApi.ExamPaperTemplateFile[]).map(
          mapExamPaperTemplateFileApiToDomain
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useExamPaperTemplateFiles] Error fetching template files:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useExamPaperTemplateFile = (id: string | null) => {
  const { user, profile } = useAuth();

  return useQuery<ExamPaperTemplateFile | null>({
    queryKey: ['exam-paper-template-file', id, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id || !id) {
        return null;
      }

      try {
        const apiFile = await examPaperTemplatesApi.templateFiles.get(id);
        return mapExamPaperTemplateFileApiToDomain(apiFile as ExamPaperTemplateFileApi.ExamPaperTemplateFile);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useExamPaperTemplateFile] Error fetching template file:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useCreateExamPaperTemplateFile = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<ExamPaperTemplateFile>) => {
      if (!user || !profile || !profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      const insertData = mapExamPaperTemplateFileDomainToInsert({
        ...data,
      });

      const apiFile = await examPaperTemplatesApi.templateFiles.create(insertData);
      return mapExamPaperTemplateFileApiToDomain(apiFile as ExamPaperTemplateFileApi.ExamPaperTemplateFile);
    },
    onSuccess: () => {
      showToast.success(t('toast.templateFileCreated') || 'Template file created successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template-files'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.templateFileCreateFailed') || 'Failed to create template file'));
    },
  });
};

export const useUpdateExamPaperTemplateFile = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExamPaperTemplateFile> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const updateData = mapExamPaperTemplateFileDomainToUpdate(updates);
      const apiFile = await examPaperTemplatesApi.templateFiles.update(id, updateData);
      return mapExamPaperTemplateFileApiToDomain(apiFile as ExamPaperTemplateFileApi.ExamPaperTemplateFile);
    },
    onSuccess: () => {
      showToast.success(t('toast.templateFileUpdated') || 'Template file updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template-files'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template-file'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.templateFileUpdateFailed') || 'Failed to update template file'));
    },
  });
};

export const useDeleteExamPaperTemplateFile = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      await examPaperTemplatesApi.templateFiles.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.templateFileDeleted') || 'Template file deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['exam-paper-template-files'] });
      await queryClient.refetchQueries({ queryKey: ['exam-paper-template-files'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.templateFileDeleteFailed') || 'Failed to delete template file'));
    },
  });
};

export const useSetDefaultTemplateFile = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const apiFile = await examPaperTemplatesApi.templateFiles.setDefault(id);
      return mapExamPaperTemplateFileApiToDomain(apiFile as ExamPaperTemplateFileApi.ExamPaperTemplateFile);
    },
    onSuccess: () => {
      showToast.success(t('toast.templateFileSetDefault') || 'Template file set as default');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template-files'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.templateFileSetDefaultFailed') || 'Failed to set default template file'));
    },
  });
};

export const usePreviewTemplateFile = () => {
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const response = await examPaperTemplatesApi.templateFiles.preview(id);
      return response as { html: string; variant: number };
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        console.error('[usePreviewTemplateFile] Error generating preview:', error);
      }
    },
  });
};


