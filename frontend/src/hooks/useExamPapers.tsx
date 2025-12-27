import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import { useAuth } from './useAuth';
import { examPaperTemplatesApi, examPaperPreviewApi } from '@/lib/api/client';
import type * as ExamPaperApi from '@/types/api/examPaper';
import type {
  ExamPaperTemplate,
  ExamPaperItem,
  ExamPaperStats,
  ExamPaperPreview,
  AvailableTemplatesResponse,
  ExamPaperItemReorder,
  ExamPaperLanguage,
} from '@/types/domain/examPaper';
import {
  mapExamPaperTemplateApiToDomain,
  mapExamPaperTemplateDomainToInsert,
  mapExamPaperTemplateDomainToUpdate,
  mapExamPaperItemApiToDomain,
  mapExamPaperItemDomainToInsert,
  mapExamPaperItemDomainToUpdate,
  mapExamPaperItemReorderDomainToApi,
  mapExamPaperStatsApiToDomain,
  mapExamPaperPreviewApiToDomain,
  mapAvailableTemplatesResponseApiToDomain,
} from '@/mappers/examPaperMapper';

// Re-export domain types for convenience
export type {
  ExamPaperTemplate,
  ExamPaperItem,
  ExamPaperStats,
  ExamPaperPreview,
  ExamPaperPreviewSection,
  ExamPaperPreviewQuestion,
  ExamPaperLanguage,
  SchoolInfo,
} from '@/types/domain/examPaper';
export { EXAM_PAPER_LANGUAGES, RTL_LANGUAGES } from '@/types/domain/examPaper';

interface ExamPaperTemplateFilters {
  schoolId?: string;
  examId?: string;
  examSubjectId?: string;
  subjectId?: string;
  classAcademicYearId?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Hook to fetch exam paper templates with filters
 */
export const useExamPaperTemplates = (filters?: ExamPaperTemplateFilters) => {
  const { user, profile } = useAuth();

  return useQuery<ExamPaperTemplate[]>({
    queryKey: ['exam-paper-templates', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile) return [];

      try {
        const apiFilters: ExamPaperApi.ExamPaperTemplateFilters = {};
        if (filters?.schoolId) apiFilters.school_id = filters.schoolId;
        if (filters?.examId) apiFilters.exam_id = filters.examId;
        if (filters?.examSubjectId) apiFilters.exam_subject_id = filters.examSubjectId;
        if (filters?.subjectId) apiFilters.subject_id = filters.subjectId;
        if (filters?.classAcademicYearId) apiFilters.class_academic_year_id = filters.classAcademicYearId;
        if (filters?.isDefault !== undefined) apiFilters.is_default = filters.isDefault;
        if (filters?.isActive !== undefined) apiFilters.is_active = filters.isActive;

        const response = await examPaperTemplatesApi.list(apiFilters);
        return (response as ExamPaperApi.ExamPaperTemplate[]).map(mapExamPaperTemplateApiToDomain);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useExamPaperTemplates] Error fetching templates:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to fetch a single exam paper template with items
 */
export const useExamPaperTemplate = (templateId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamPaperTemplate | null>({
    queryKey: ['exam-paper-template', templateId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !templateId) return null;

      try {
        const response = await examPaperTemplatesApi.get(templateId);
        return mapExamPaperTemplateApiToDomain(response as ExamPaperApi.ExamPaperTemplate);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useExamPaperTemplate] Error fetching template:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!templateId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to create a new exam paper template
 */
export const useCreateExamPaperTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<ExamPaperTemplate>) => {
      const insertData = mapExamPaperTemplateDomainToInsert(data);
      const response = await examPaperTemplatesApi.create(insertData);
      return mapExamPaperTemplateApiToDomain(response as ExamPaperApi.ExamPaperTemplate);
    },
    onSuccess: () => {
      showToast.success(t('toast.examPaperTemplateCreated') || 'Exam paper template created successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-templates'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examPaperTemplateCreateFailed') || 'Failed to create template');
    },
  });
};

/**
 * Hook to update an exam paper template
 */
export const useUpdateExamPaperTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExamPaperTemplate> }) => {
      const updateData = mapExamPaperTemplateDomainToUpdate(data);
      const response = await examPaperTemplatesApi.update(id, updateData);
      return mapExamPaperTemplateApiToDomain(response as ExamPaperApi.ExamPaperTemplate);
    },
    onSuccess: () => {
      showToast.success(t('toast.examPaperTemplateUpdated') || 'Exam paper template updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examPaperTemplateUpdateFailed') || 'Failed to update template');
    },
  });
};

/**
 * Hook to delete an exam paper template
 */
export const useDeleteExamPaperTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await examPaperTemplatesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.examPaperTemplateDeleted') || 'Exam paper template deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['exam-paper-templates'] });
      await queryClient.refetchQueries({ queryKey: ['exam-paper-templates'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examPaperTemplateDeleteFailed') || 'Failed to delete template');
    },
  });
};

/**
 * Hook to duplicate an exam paper template
 */
export const useDuplicateExamPaperTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await examPaperTemplatesApi.duplicate(id);
      return mapExamPaperTemplateApiToDomain(response as ExamPaperApi.ExamPaperTemplate);
    },
    onSuccess: () => {
      showToast.success(t('toast.examPaperTemplateDuplicated') || 'Exam paper template duplicated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-templates'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examPaperTemplateDuplicateFailed') || 'Failed to duplicate template');
    },
  });
};

/**
 * Hook to add a question item to a template
 */
export const useAddExamPaperItem = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: Partial<ExamPaperItem> }) => {
      const insertData = mapExamPaperItemDomainToInsert(data);
      const response = await examPaperTemplatesApi.addItem(templateId, insertData);
      return mapExamPaperItemApiToDomain(response as ExamPaperApi.ExamPaperItem);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionAdded') || 'Question added to template');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionAddFailed') || 'Failed to add question');
    },
  });
};

/**
 * Hook to update an item in a template
 */
export const useUpdateExamPaperItem = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ templateId, itemId, data }: { templateId: string; itemId: string; data: Partial<ExamPaperItem> }) => {
      const updateData = mapExamPaperItemDomainToUpdate(data);
      const response = await examPaperTemplatesApi.updateItem(templateId, itemId, updateData);
      return mapExamPaperItemApiToDomain(response as ExamPaperApi.ExamPaperItem);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionUpdated') || 'Question updated');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionUpdateFailed') || 'Failed to update question');
    },
  });
};

/**
 * Hook to remove an item from a template
 */
export const useRemoveExamPaperItem = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ templateId, itemId }: { templateId: string; itemId: string }) => {
      await examPaperTemplatesApi.removeItem(templateId, itemId);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionRemoved') || 'Question removed from template');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionRemoveFailed') || 'Failed to remove question');
    },
  });
};

/**
 * Hook to reorder items in a template
 */
export const useReorderExamPaperItems = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ templateId, items }: { templateId: string; items: ExamPaperItemReorder[] }) => {
      const apiItems = mapExamPaperItemReorderDomainToApi(items);
      await examPaperTemplatesApi.reorderItems(templateId, apiItems);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionsReordered') || 'Questions reordered');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionsReorderFailed') || 'Failed to reorder questions');
    },
  });
};

/**
 * Hook to fetch exam paper stats for an exam
 */
export const useExamPaperStats = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamPaperStats | null>({
    queryKey: ['exam-paper-stats', examId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId) return null;

      try {
        const response = await examPaperTemplatesApi.examPaperStats(examId);
        return mapExamPaperStatsApiToDomain(response as ExamPaperApi.ExamPaperStats);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useExamPaperStats] Error fetching stats:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

// ========== Preview Hooks ==========

/**
 * Hook to fetch student view preview
 */
export const useExamPaperPreviewStudent = (templateId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamPaperPreview | null>({
    queryKey: ['exam-paper-preview-student', templateId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !templateId) return null;

      try {
        const response = await examPaperPreviewApi.studentView(templateId);
        return mapExamPaperPreviewApiToDomain(response as ExamPaperApi.ExamPaperPreview);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useExamPaperPreviewStudent] Error fetching preview:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!templateId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to fetch teacher view preview (with answers)
 */
export const useExamPaperPreviewTeacher = (templateId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamPaperPreview | null>({
    queryKey: ['exam-paper-preview-teacher', templateId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !templateId) return null;

      try {
        const response = await examPaperPreviewApi.teacherView(templateId);
        return mapExamPaperPreviewApiToDomain(response as ExamPaperApi.ExamPaperPreview);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useExamPaperPreviewTeacher] Error fetching preview:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!templateId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to fetch available templates for an exam subject
 */
export const useAvailableTemplates = (examSubjectId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<AvailableTemplatesResponse | null>({
    queryKey: ['available-templates', examSubjectId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examSubjectId) return null;

      try {
        const response = await examPaperPreviewApi.availableTemplates(examSubjectId);
        return mapAvailableTemplatesResponseApiToDomain(response as ExamPaperApi.AvailableTemplatesResponse);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useAvailableTemplates] Error fetching templates:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!examSubjectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to set a template as default for an exam subject
 */
export const useUpdatePrintStatus = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      printStatus, 
      copiesPrinted, 
      increment = false,
      printNotes 
    }: { 
      templateId: string;
      printStatus?: 'not_printed' | 'printing' | 'printed' | 'cancelled';
      copiesPrinted?: number;
      increment?: boolean;
      printNotes?: string | null;
    }) => {
      return await examPaperTemplatesApi.updatePrintStatus(templateId, {
        print_status: printStatus,
        copies_printed: copiesPrinted,
        increment: increment,
        print_notes: printNotes,
      });
    },
    onSuccess: () => {
      showToast.success(t('examPapers.printStatusUpdated') || 'Print status updated successfully');
      // Invalidate and refetch to get updated data
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-templates'] });
      void queryClient.refetchQueries({ queryKey: ['exam-paper-templates'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('examPapers.printStatusUpdateFailed') || 'Failed to update print status');
    },
  });
};

export const useSetDefaultTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ examSubjectId, templateId }: { examSubjectId: string; templateId: string }) => {
      const response = await examPaperPreviewApi.setDefaultTemplate(examSubjectId, templateId);
      return response;
    },
    onSuccess: () => {
      showToast.success(t('toast.defaultTemplateSet') || 'Default template set successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['available-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-paper-stats'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.defaultTemplateSetFailed') || 'Failed to set default template');
    },
  });
};
