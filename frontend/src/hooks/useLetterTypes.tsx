import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dmsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import type { LetterTypeEntity } from '@/types/dms';

export const useLetterTypes = (activeOnly = false) => {
  const { user, profile } = useAuth();

  return useQuery<LetterTypeEntity[]>({
    queryKey: ['dms', 'letter-types', profile?.organization_id, profile?.default_school_id ?? null, activeOnly],
    queryFn: async () => {
      if (!user || !profile) return [];

      const params: Record<string, any> = {};
      if (activeOnly) {
        params.active = true;
      }

      return await dmsApi.letterTypes.list(params);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateLetterType = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: { key: string; name: string; description?: string; active?: boolean; school_id?: string | null }) => {
      return await dmsApi.letterTypes.create(data);
    },
    onSuccess: () => {
      showToast.success(t('toast.letterTypeCreated') || 'Letter type created successfully');
      void queryClient.invalidateQueries({ queryKey: ['dms', 'letter-types'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.letterTypeCreateFailed') || 'Failed to create letter type');
    },
  });
};

export const useUpdateLetterType = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; key?: string; name?: string; description?: string; active?: boolean; school_id?: string | null }) => {
      return await dmsApi.letterTypes.update(id, data);
    },
    onSuccess: () => {
      showToast.success(t('toast.letterTypeUpdated') || 'Letter type updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['dms', 'letter-types'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.letterTypeUpdateFailed') || 'Failed to update letter type');
    },
  });
};

export const useDeleteLetterType = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await dmsApi.letterTypes.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.letterTypeDeleted') || 'Letter type deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['dms', 'letter-types'] });
      await queryClient.refetchQueries({ queryKey: ['dms', 'letter-types'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.letterTypeDeleteFailed') || 'Failed to delete letter type');
    },
  });
};

