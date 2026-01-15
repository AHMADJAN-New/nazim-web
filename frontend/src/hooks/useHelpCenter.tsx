import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

import { helpCenterCategoriesApi, helpCenterArticlesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type * as HelpCenterApi from '@/types/api/helpCenter';

type HelpCenterCategoryWithRecursive = HelpCenterApi.HelpCenterCategory & {
  // Backend returns children_recursive (snake_case) but UI wants a stable camelCase alias.
  childrenRecursive?: HelpCenterCategoryWithRecursive[];
  children_recursive?: HelpCenterCategoryWithRecursive[];
  article_count?: number;
  article_count_aggregate?: number;
};

function mapCategoryRecursive(cat: any): HelpCenterCategoryWithRecursive {
  const children = Array.isArray(cat?.children_recursive)
    ? cat.children_recursive
    : Array.isArray(cat?.childrenRecursive)
      ? cat.childrenRecursive
      : Array.isArray(cat?.children)
        ? cat.children
        : [];

  const mappedChildren = children.map(mapCategoryRecursive);

  return {
    ...(cat as HelpCenterApi.HelpCenterCategory),
    childrenRecursive: mappedChildren,
    children_recursive: mappedChildren,
    article_count: typeof cat?.article_count === 'number' ? cat.article_count : cat?.article_count ? Number(cat.article_count) : 0,
    article_count_aggregate:
      typeof cat?.article_count_aggregate === 'number'
        ? cat.article_count_aggregate
        : cat?.article_count_aggregate
          ? Number(cat.article_count_aggregate)
          : undefined,
  };
}


// Re-export types for convenience
export type { HelpCenterCategory, HelpCenterArticle } from '@/types/api/helpCenter';

// Hook to fetch all help center categories
export const useHelpCenterCategories = (params?: { is_active?: boolean; parent_id?: string | null }) => {
  const { user, profile } = useAuth();

  return useQuery<HelpCenterCategoryWithRecursive[]>({
    queryKey: ['help-center-categories', profile?.organization_id, params?.is_active, params?.parent_id],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) return [];

      const apiCategories = await helpCenterCategoriesApi.list(params);
      const arr = Array.isArray(apiCategories) ? apiCategories : [];
      return arr.map(mapCategoryRecursive);
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook to fetch a single category
export const useHelpCenterCategory = (id: string | null) => {
  const { user, profile } = useAuth();

  return useQuery<HelpCenterApi.HelpCenterCategory | null>({
    queryKey: ['help-center-category', id, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id || !id) return null;

      const apiCategory = await helpCenterCategoriesApi.get(id);
      return apiCategory as HelpCenterApi.HelpCenterCategory;
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook to fetch help center articles
export const useHelpCenterArticles = (params?: {
  is_published?: boolean;
  category_id?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  search?: string;
  order_by?: 'order' | 'views' | 'recent';
  order_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  limit?: number;
}) => {
  const { user, profile } = useAuth();

  return useQuery<HelpCenterApi.HelpCenterArticle[]>({
    queryKey: [
      'help-center-articles',
      profile?.organization_id,
      params?.is_published,
      params?.category_id,
      params?.is_featured,
      params?.is_pinned,
      params?.search,
      params?.order_by,
      params?.order_dir,
      params?.page,
      params?.per_page,
      params?.limit,
    ],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) return [];

      const apiArticles = await helpCenterArticlesApi.list(params);
      return (apiArticles as HelpCenterApi.HelpCenterArticle[]);
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 2 * 60 * 1000, // 2 minutes (articles may change more frequently)
    refetchOnWindowFocus: false,
  });
};

// Hook to fetch a single article
export const useHelpCenterArticle = (id: string | null) => {
  const { user, profile } = useAuth();

  return useQuery<HelpCenterApi.HelpCenterArticle | null>({
    queryKey: ['help-center-article', id, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id || !id) return null;

      const apiArticle = await helpCenterArticlesApi.get(id);
      return apiArticle as HelpCenterApi.HelpCenterArticle;
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Hook to fetch featured articles
export const useFeaturedArticles = (limit?: number) => {
  const { user, profile } = useAuth();

  return useQuery<HelpCenterApi.HelpCenterArticle[]>({
    queryKey: ['help-center-featured-articles', profile?.organization_id, limit],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) return [];

      const apiArticles = await helpCenterArticlesApi.featured({ limit });
      return (apiArticles as HelpCenterApi.HelpCenterArticle[]);
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook to fetch popular articles
export const usePopularArticles = (limit?: number) => {
  const { user, profile } = useAuth();

  return useQuery<HelpCenterApi.HelpCenterArticle[]>({
    queryKey: ['help-center-popular-articles', profile?.organization_id, limit],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id) return [];

      const apiArticles = await helpCenterArticlesApi.popular({ limit });
      return (apiArticles as HelpCenterApi.HelpCenterArticle[]);
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Mutation hooks for categories
export const useCreateHelpCenterCategory = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: HelpCenterApi.HelpCenterCategoryInsert) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await helpCenterCategoriesApi.create({
        ...data,
        organization_id: profile.organization_id,
      });
    },
    onSuccess: () => {
      showToast.success(t('library.categoryCreated') || 'Category created successfully');
      void queryClient.invalidateQueries({ queryKey: ['help-center-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryCreateFailed') || 'Failed to create category');
    },
  });
};

export const useUpdateHelpCenterCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<HelpCenterApi.HelpCenterCategoryUpdate>) => {
      return await helpCenterCategoriesApi.update(id, updates);
    },
    onSuccess: () => {
      showToast.success(t('library.categoryUpdated') || 'Category updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['help-center-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryUpdateFailed') || 'Failed to update category');
    },
  });
};

export const useDeleteHelpCenterCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await helpCenterCategoriesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('library.categoryDeleted') || 'Category deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['help-center-categories'] });
      await queryClient.refetchQueries({ queryKey: ['help-center-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryDeleteFailed') || 'Failed to delete category');
    },
  });
};

// Mutation hooks for articles
export const useCreateHelpCenterArticle = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: HelpCenterApi.HelpCenterArticleInsert) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await helpCenterArticlesApi.create({
        ...data,
        organization_id: profile.organization_id,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.articleCreated') || 'Article created successfully');
      void queryClient.invalidateQueries({ queryKey: ['help-center-articles'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.articleCreateFailed') || 'Failed to create article');
    },
  });
};

export const useUpdateHelpCenterArticle = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<HelpCenterApi.HelpCenterArticleUpdate>) => {
      return await helpCenterArticlesApi.update(id, updates);
    },
    onSuccess: () => {
      showToast.success(t('toast.articleUpdated') || 'Article updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['help-center-articles'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.articleUpdateFailed') || 'Failed to update article');
    },
  });
};

export const useDeleteHelpCenterArticle = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await helpCenterArticlesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.articleDeleted') || 'Article deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['help-center-articles'] });
      await queryClient.refetchQueries({ queryKey: ['help-center-articles'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.articleDeleteFailed') || 'Failed to delete article');
    },
  });
};

// Hook to mark article as helpful
export const useMarkArticleHelpful = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await helpCenterArticlesApi.markHelpful(id);
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ['help-center-article', id] });
    },
  });
};

// Hook to mark article as not helpful
export const useMarkArticleNotHelpful = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await helpCenterArticlesApi.markNotHelpful(id);
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ['help-center-article', id] });
    },
  });
};



