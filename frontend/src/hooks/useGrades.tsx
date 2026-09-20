import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

import { gradesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapGradeApiToDomain, mapGradeDomainToInsert, mapGradeDomainToUpdate } from '@/mappers/gradeMapper';
import type * as GradeApi from '@/types/api/grade';
import type { Grade, GradeFormData } from '@/types/domain/grade';

// Re-export domain types for convenience
export type { Grade, GradeFormData } from '@/types/domain/grade';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const useGrades = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Grade[]>({
    queryKey: ['grades', organizationId || profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile.default_school_id) return [];

      const resolvedOrgId = organizationId || profile.organization_id;
      const apiGrades = await gradesApi.list({
        organization_id: resolvedOrgId || undefined,
        school_id: profile.default_school_id,
      });

      // Map API models to domain models and sort by order (descending)
      return (apiGrades as GradeApi.Grade[])
        .map(mapGradeApiToDomain)
        .sort((a, b) => b.order - a.order);
    },
    enabled: !!user && !!profile?.organization_id && !!profile.default_school_id,
    staleTime: 10 * 60 * 1000, // 10 minutes - grades don't change often
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useGrade = (id: string | undefined) => {
  const { user, profile } = useAuth();

  return useQuery<Grade | null>({
    queryKey: ['grade', profile?.organization_id, profile?.default_school_id ?? null, id],
    queryFn: async () => {
      if (!id) return null;

      const apiGrade = await gradesApi.get(id);
      return mapGradeApiToDomain(apiGrade as GradeApi.Grade);
    },
    enabled: !!user && !!profile?.organization_id && !!profile.default_school_id && !!id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateGrade = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    retry: false,
    mutationFn: async (gradeData: GradeFormData) => {
      if (!user || !profile?.organization_id || !profile.default_school_id) {
        throw new Error('User not authenticated or no organization or school');
      }

      const insertData = mapGradeDomainToInsert(gradeData);
      const createdGrade = await gradesApi.create(insertData);

      return mapGradeApiToDomain(createdGrade as GradeApi.Grade);
    },
    onSuccess: () => {
      // Invalidate and refetch grades list
      queryClient.invalidateQueries({ queryKey: ['grades'] });

      // Show success message
      showToast.success(t('grades.created') || 'Grade created successfully');
    },
    onError: (error: unknown) => {
      showToast.error(getErrorMessage(error, t('grades.createError') || 'Failed to create grade'));
    },
  });
};

export const useUpdateGrade = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    retry: false,
    mutationFn: async ({ id, data }: { id: string; data: Partial<GradeFormData> }) => {
      if (!user || !profile?.organization_id || !profile.default_school_id) {
        throw new Error('User not authenticated or no organization or school');
      }

      const updateData = mapGradeDomainToUpdate(data);
      const updatedGrade = await gradesApi.update(id, updateData);

      return mapGradeApiToDomain(updatedGrade as GradeApi.Grade);
    },
    onSuccess: () => {
      // Invalidate grades list and specific grade
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grade'] });

      showToast.success(t('grades.updated') || 'Grade updated successfully');
    },
    onError: (error: unknown) => {
      showToast.error(getErrorMessage(error, t('grades.updateError') || 'Failed to update grade'));
    },
  });
};

export const useDeleteGrade = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      if (!user || !profile?.organization_id || !profile.default_school_id) {
        throw new Error('User not authenticated or no organization or school');
      }

      await gradesApi.delete(id);
      return id;
    },
    onSuccess: () => {
      // Invalidate grades list and specific grade
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grade'] });

      showToast.success(t('grades.deleted') || 'Grade deleted successfully');
    },
    onError: (error: unknown) => {
      showToast.error(getErrorMessage(error, t('grades.deleteError') || 'Failed to delete grade'));
    },
  });
};
