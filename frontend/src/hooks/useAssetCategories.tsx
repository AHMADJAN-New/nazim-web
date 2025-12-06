import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assetCategoriesApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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
    queryKey: ['asset-categories', profile?.organization_id],
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
    refetchOnWindowFocus: false,
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
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category');
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
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
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
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
};

