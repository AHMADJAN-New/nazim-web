import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

import { examTypesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import {
  mapExamTypeApiToDomain,
  mapExamTypeDomainToInsert,
  mapExamTypeDomainToUpdate,
} from '@/mappers/examTypeMapper';
import type * as ExamTypeApi from '@/types/api/examType';
import type { ExamType, ExamTypeInsert, ExamTypeUpdate } from '@/types/domain/examType';

// Re-export domain types for convenience
export type { ExamType, ExamTypeInsert, ExamTypeUpdate } from '@/types/domain/examType';

export const useExamTypes = (filters?: { is_active?: boolean }) => {
  const { user, profile } = useAuth();

  return useQuery<ExamType[]>({
    queryKey: ['exam-types', profile?.organization_id, profile?.default_school_id ?? null, filters],
    queryFn: async () => {
      if (!user || !profile) {
        if (import.meta.env.DEV) {
          console.log('[useExamTypes] No user or profile');
        }
        return [];
      }

      const apiTypes = await examTypesApi.list({
        organization_id: profile.organization_id,
        is_active: filters?.is_active,
      });

      return (apiTypes as ExamTypeApi.ExamType[]).map(mapExamTypeApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useExamType = (id?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamType>({
    queryKey: ['exam-type', id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!id) throw new Error('Missing exam type id');
      const apiType = await examTypesApi.get(id);
      return mapExamTypeApiToDomain(apiType as ExamTypeApi.ExamType);
    },
    enabled: !!user && !!profile && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateExamType = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: ExamTypeInsert) => {
      const insertData = mapExamTypeDomainToInsert(data);
      const apiType = await examTypesApi.create(insertData);
      return mapExamTypeApiToDomain(apiType as ExamTypeApi.ExamType);
    },
    onSuccess: () => {
      showToast.success(t('toast.examTypes.created') || 'Exam type created successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-types'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.examTypes.createFailed') || 'Failed to create exam type');
    },
  });
};

export const useUpdateExamType = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExamTypeUpdate }) => {
      const updateData = mapExamTypeDomainToUpdate(data);
      const apiType = await examTypesApi.update(id, updateData);
      return mapExamTypeApiToDomain(apiType as ExamTypeApi.ExamType);
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.examTypes.updated') || 'Exam type updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-type', variables.id] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.examTypes.updateFailed') || 'Failed to update exam type');
    },
  });
};

export const useDeleteExamType = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await examTypesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.examTypes.deleted') || 'Exam type deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      await queryClient.refetchQueries({ queryKey: ['exam-types'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.examTypes.deleteFailed') || 'Failed to delete exam type');
    },
  });
};
