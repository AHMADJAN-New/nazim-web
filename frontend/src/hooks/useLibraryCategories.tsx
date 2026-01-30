import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';

import { queryOptionsNoRefetchOnFocus } from '@/lib/queryClient';
import { libraryCategoriesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { LibraryCategory } from '@/types/domain/library';


export const useLibraryCategories = () => {
  const { user, profile } = useAuth();

  return useQuery<LibraryCategory[]>({
    queryKey: ['library-categories', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) return [];

      return libraryCategoriesApi.list({
        organization_id: profile.organization_id,
      });
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000,
    ...queryOptionsNoRefetchOnFocus,
  });
};

export const useCreateLibraryCategory = () => {
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
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return libraryCategoriesApi.create({
        ...data,
        organization_id: profile.organization_id,
      });
    },
    onSuccess: async () => {
      showToast.success('toast.libraryCategories.created');
      await queryClient.invalidateQueries({ queryKey: ['library-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['library-books'] });
      await queryClient.invalidateQueries({ queryKey: ['library-loans'] });
      await queryClient.invalidateQueries({ queryKey: ['library-due-soon'] });
      await queryClient.refetchQueries({ queryKey: ['library-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.libraryCategories.createFailed');
    },
  });
};

export const useUpdateLibraryCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LibraryCategory> }) => {
      return libraryCategoriesApi.update(id, data);
    },
    onSuccess: async () => {
      showToast.success('toast.libraryCategories.updated');
      await queryClient.invalidateQueries({ queryKey: ['library-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['library-books'] });
      await queryClient.invalidateQueries({ queryKey: ['library-loans'] });
      await queryClient.invalidateQueries({ queryKey: ['library-due-soon'] });
      await queryClient.refetchQueries({ queryKey: ['library-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.libraryCategories.updateFailed');
    },
  });
};

export const useDeleteLibraryCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await libraryCategoriesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success('toast.libraryCategories.deleted');
      await queryClient.invalidateQueries({ queryKey: ['library-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['library-books'] });
      await queryClient.invalidateQueries({ queryKey: ['library-loans'] });
      await queryClient.invalidateQueries({ queryKey: ['library-due-soon'] });
      await queryClient.refetchQueries({ queryKey: ['library-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.libraryCategories.deleteFailed');
    },
  });
};
