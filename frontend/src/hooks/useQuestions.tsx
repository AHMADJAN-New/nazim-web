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
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';
import { useEffect } from 'react';

// Re-export domain types for convenience
export type { Question, QuestionFilters, QuestionOption, QuestionType, QuestionDifficulty } from '@/types/domain/question';
export { QUESTION_TYPES, QUESTION_DIFFICULTIES } from '@/types/domain/question';

/**
 * Hook to fetch questions with filters and pagination
 * Supports both paginated and non-paginated modes
 */
export const useQuestions = (filters?: QuestionFilters, usePaginated?: boolean) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<QuestionPaginatedResponse | PaginatedResponse<QuestionApi.Question>>({
    queryKey: ['questions', profile?.organization_id, profile?.default_school_id ?? null, filters, usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
    queryFn: async () => {
      if (!user || !profile) {
        if (usePaginated) {
          return { data: [], meta: { current_page: 1, from: null, last_page: 1, per_page: 25, to: null, total: 0 } };
        }
        return { currentPage: 1, data: [], total: 0, lastPage: 1, perPage: 50, from: 0, to: 0 };
      }

      try {
        const apiFilters = filters ? mapQuestionFiltersDomainToApi(filters) : {};
        
        // Add pagination params if using pagination
        if (usePaginated) {
          apiFilters.page = page;
          apiFilters.per_page = pageSize;
        }
        
        const response = await questionsApi.list(apiFilters);
        
        // Laravel always returns paginated response, check if it has pagination structure
        if (response && typeof response === 'object' && 'data' in response && 'current_page' in response) {
          // Laravel's paginated response has data and meta fields at the same level
          const paginatedResponse = response as any;
          // Map API models to domain models
          const questions = (paginatedResponse.data as QuestionApi.Question[]).map(mapQuestionApiToDomain);
          
          if (usePaginated) {
            // Extract meta from Laravel's response structure
            const meta: PaginationMeta = {
              current_page: paginatedResponse.current_page,
              from: paginatedResponse.from,
              last_page: paginatedResponse.last_page,
              per_page: paginatedResponse.per_page,
              to: paginatedResponse.to,
              total: paginatedResponse.total,
              path: paginatedResponse.path,
              first_page_url: paginatedResponse.first_page_url,
              last_page_url: paginatedResponse.last_page_url,
              next_page_url: paginatedResponse.next_page_url,
              prev_page_url: paginatedResponse.prev_page_url,
            };
            return { data: questions, meta } as PaginatedResponse<QuestionApi.Question>;
          } else {
            // Non-paginated mode: return legacy format but with all questions from all pages
            // For now, just return the first page (if we need all questions, we'd need to fetch all pages)
            return {
              currentPage: paginatedResponse.current_page,
              data: questions,
              total: paginatedResponse.total,
              lastPage: paginatedResponse.last_page,
              perPage: paginatedResponse.per_page,
              from: paginatedResponse.from ?? 0,
              to: paginatedResponse.to ?? 0,
            } as QuestionPaginatedResponse;
          }
        }

        // Fallback: try legacy format
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

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<QuestionApi.Question>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<QuestionApi.Question> | undefined;
    return {
      data: paginatedData?.data || [],
      isLoading,
      error,
      pagination: paginatedData?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
    };
  }

  // Legacy non-paginated format
  const legacyData = data as QuestionPaginatedResponse | undefined;
  return {
    data: legacyData?.data || [],
    isLoading,
    error,
    pagination: legacyData ? {
      current_page: legacyData.currentPage,
      from: legacyData.from,
      last_page: legacyData.lastPage,
      per_page: legacyData.perPage,
      to: legacyData.to,
      total: legacyData.total,
    } : null,
  };
};

/**
 * Hook to fetch a single question
 */
export const useQuestion = (questionId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Question | null>({
    queryKey: ['question', questionId, profile?.organization_id, profile?.default_school_id ?? null],
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
