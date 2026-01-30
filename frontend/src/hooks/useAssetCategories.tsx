import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';

import { queryOptionsNoRefetchOnFocus } from '@/lib/queryClient';
import { assetCategoriesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface AssetCategory {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export const useAssetCategories = () => {
  const { user, profile } = useAuth();

  return useQuery<AssetCategory[]>({
    queryKey: ['asset-categories', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        return [];
      }

      return assetCategoriesApi.list({
        organization_id: profile.organization_id,
      });
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000,
    ...queryOptionsNoRefetchOnFocus,
  });
};

export const useCreateAssetCategory = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      code?: string | null;
      description?: string | null;
      is_active?: boolean;
      display_order?: number;
    }) => {
      return assetCategoriesApi.create({
        ...data,
        organization_id: profile?.organization_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets-dashboard'] });
      showToast.success('toast.assetCategories.created');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.assetCategories.createFailed');
    },
  });
};

export const useUpdateAssetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<AssetCategory>) => {
      return assetCategoriesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets-dashboard'] });
      showToast.success('toast.assetCategories.updated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.assetCategories.updateFailed');
    },
  });
};

export const useDeleteAssetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assetCategoriesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      queryClient.invalidateQueries({ queryKey: ['assets-dashboard'] });
      showToast.success('toast.assetCategories.deleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.assetCategories.deleteFailed');
    },
  });
};
