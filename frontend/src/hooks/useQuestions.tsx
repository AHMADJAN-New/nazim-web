import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import { useAuth } from './useAuth';
import { questionsApi } from '@/lib/api/client';
import type * as QuestionApi from '@/types/api/question';
import type {
  Question,
  QuestionFilters,
  QuestionPaginatedResponse,
  QuestionType,
  QuestionDifficulty,
} from '@/types/domain/question';
import {
  mapQuestionApiToDomain,
  mapQuestionDomainToInsert,
  mapQuestionDomainToUpdate,
  mapQuestionFiltersDomainToApi,
  mapQuestionPaginatedResponseApiToDomain,
} from '@/mappers/questionMapper';

// Re-export domain types for convenience
export type { Question, QuestionFilters, QuestionOption, QuestionType, QuestionDifficulty } from '@/types/domain/question';
export { QUESTION_TYPES, QUESTION_DIFFICULTIES } from '@/types/domain/question';

/**
 * Hook to fetch questions with filters and pagination
 */
export const useQuestions = (filters?: QuestionFilters) => {
  const { user, profile } = useAuth();

  return useQuery<QuestionPaginatedResponse>({
    queryKey: ['questions', profile?.organization_id, filters],
    queryFn: async () => {
      if (!user || !profile) {
        return { currentPage: 1, data: [], total: 0, lastPage: 1, perPage: 50, from: 0, to: 0 };
      }

      try {
        const apiFilters = filters ? mapQuestionFiltersDomainToApi(filters) : {};
        const response = await questionsApi.list(apiFilters);
        return mapQuestionPaginatedResponseApiToDomain(response as QuestionApi.QuestionPaginatedResponse);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useQuestions] Error fetching questions:', error);
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
 * Hook to fetch a single question
 */
export const useQuestion = (questionId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Question | null>({
    queryKey: ['question', questionId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !questionId) return null;

      try {
        const apiQuestion = await questionsApi.get(questionId);
        return mapQuestionApiToDomain(apiQuestion as QuestionApi.Question);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useQuestion] Error fetching question:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!questionId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to create a new question
 */
export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<Question>) => {
      const insertData = mapQuestionDomainToInsert(data);
      const response = await questionsApi.create(insertData);
      return mapQuestionApiToDomain(response as QuestionApi.Question);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionCreated') || 'Question created successfully');
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionCreateFailed') || 'Failed to create question');
    },
  });
};

/**
 * Hook to update a question
 */
export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Question> }) => {
      const updateData = mapQuestionDomainToUpdate(data);
      const response = await questionsApi.update(id, updateData);
      return mapQuestionApiToDomain(response as QuestionApi.Question);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionUpdated') || 'Question updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
      void queryClient.invalidateQueries({ queryKey: ['question'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionUpdateFailed') || 'Failed to update question');
    },
  });
};

/**
 * Hook to delete a question
 */
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await questionsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.questionDeleted') || 'Question deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['questions'] });
      await queryClient.refetchQueries({ queryKey: ['questions'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionDeleteFailed') || 'Failed to delete question');
    },
  });
};

/**
 * Hook to duplicate a question
 */
export const useDuplicateQuestion = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await questionsApi.duplicate(id);
      return mapQuestionApiToDomain(response as QuestionApi.Question);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionDuplicated') || 'Question duplicated successfully');
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionDuplicateFailed') || 'Failed to duplicate question');
    },
  });
};

/**
 * Hook to bulk update questions (activate/deactivate)
 */
export const useBulkUpdateQuestions = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: { questionIds: string[]; isActive: boolean }) => {
      await questionsApi.bulkUpdate({
        question_ids: data.questionIds,
        is_active: data.isActive,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.questionsUpdated') || 'Questions updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.questionsUpdateFailed') || 'Failed to update questions');
    },
  });
};
