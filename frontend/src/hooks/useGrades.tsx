import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { gradesApi } from '@/lib/api/client';
import type * as GradeApi from '@/types/api/grade';
import type { Grade, GradeFormData } from '@/types/domain/grade';
import { mapGradeApiToDomain, mapGradeDomainToInsert, mapGradeDomainToUpdate } from '@/mappers/gradeMapper';

// Re-export domain types for convenience
export type { Grade, GradeFormData } from '@/types/domain/grade';

export const useGrades = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Grade[]>({
    queryKey: ['grades', organizationId || profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];

      const resolvedOrgId = organizationId || profile.organization_id;
      const apiGrades = await gradesApi.list({
        organization_id: resolvedOrgId || undefined,
      });

      // Map API models to domain models and sort by order (descending)
      return (apiGrades as GradeApi.Grade[])
        .map(mapGradeApiToDomain)
        .sort((a, b) => b.order - a.order);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000, // 10 minutes - grades don't change often
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useGrade = (id: string | undefined) => {
  const { user, profile } = useAuth();

  return useQuery<Grade | null>({
    queryKey: ['grade', id],
    queryFn: async () => {
      if (!id) return null;

      const apiGrade = await gradesApi.get(id);
      return mapGradeApiToDomain(apiGrade as GradeApi.Grade);
    },
    enabled: !!user && !!profile && !!id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateGrade = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (gradeData: GradeFormData) => {
      if (!user || !profile?.organization_id) {
        throw new Error('User not authenticated or no organization');
      }

      const insertData = mapGradeDomainToInsert(gradeData);
      const createdGrade = await gradesApi.create(insertData);

      return mapGradeApiToDomain(createdGrade as GradeApi.Grade);
    },
    onSuccess: (createdGrade) => {
      // Invalidate and refetch grades list
      queryClient.invalidateQueries({ queryKey: ['grades'] });

      // Show success message
      showToast({
        title: t?.('grades.created') || 'Grade created successfully',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showToast({
        title: t?.('grades.createError') || 'Failed to create grade',
        description: error.message || 'An error occurred',
        type: 'error',
      });
    },
  });
};

export const useUpdateGrade = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GradeFormData> }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const updateData = mapGradeDomainToUpdate(data);
      const updatedGrade = await gradesApi.update(id, updateData);

      return mapGradeApiToDomain(updatedGrade as GradeApi.Grade);
    },
    onSuccess: (updatedGrade) => {
      // Invalidate grades list and specific grade
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grade', updatedGrade.id] });

      showToast({
        title: t?.('grades.updated') || 'Grade updated successfully',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showToast({
        title: t?.('grades.updateError') || 'Failed to update grade',
        description: error.message || 'An error occurred',
        type: 'error',
      });
    },
  });
};

export const useDeleteGrade = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      await gradesApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      // Invalidate grades list and specific grade
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grade', deletedId] });

      showToast({
        title: t?.('grades.deleted') || 'Grade deleted successfully',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showToast({
        title: t?.('grades.deleteError') || 'Failed to delete grade',
        description: error.message || 'An error occurred',
        type: 'error',
      });
    },
  });
};
