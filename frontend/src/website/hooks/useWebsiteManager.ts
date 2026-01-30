import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  websiteSettingsApi,
  websitePagesApi,
  websitePostsApi,
  websiteEventsApi,
  websiteMediaApi,
  websiteMediaCategoriesApi,
  websiteDomainsApi,
  websiteMenusApi,
  websiteFatwasApi,
  websiteFatwaCategoriesApi,
  websiteFatwaQuestionsApi,
  websiteAnnouncementsApi,
} from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import type * as WebsitePageApi from '@/types/api/websitePage';
import type * as WebsitePostApi from '@/types/api/websitePost';
import type * as WebsiteEventApi from '@/types/api/websiteEvent';
import type * as WebsiteMenuApi from '@/types/api/websiteMenu';
import type * as WebsiteMediaApi from '@/types/api/websiteMedia';
import type * as WebsiteMediaCategoryApi from '@/types/api/websiteMediaCategory';
import type * as WebsiteDomainApi from '@/types/api/websiteDomain';
import type * as WebsiteFatwaApi from '@/types/api/websiteFatwa';
import type { WebsitePage } from '@/types/domain/websitePage';
import type { WebsitePost } from '@/types/domain/websitePost';
import type { WebsiteEvent } from '@/types/domain/websiteEvent';
import type { WebsiteMenu } from '@/types/domain/websiteMenu';
import type { WebsiteMedia } from '@/types/domain/websiteMedia';
import type { WebsiteMediaCategory } from '@/types/domain/websiteMediaCategory';
import type { WebsiteDomain } from '@/types/domain/websiteDomain';
import type { WebsiteFatwa, WebsiteFatwaCategory, WebsiteFatwaQuestion } from '@/types/domain/websiteFatwa';
import { mapWebsitePageApiToDomain, mapWebsitePageDomainToInsert, mapWebsitePageDomainToUpdate } from '@/mappers/websitePageMapper';
import { mapWebsitePostApiToDomain, mapWebsitePostDomainToInsert, mapWebsitePostDomainToUpdate } from '@/mappers/websitePostMapper';
import { mapWebsiteEventApiToDomain, mapWebsiteEventDomainToInsert, mapWebsiteEventDomainToUpdate } from '@/mappers/websiteEventMapper';
import { mapWebsiteMenuApiToDomain, mapWebsiteMenuDomainToInsert, mapWebsiteMenuDomainToUpdate } from '@/mappers/websiteMenuMapper';
import { mapWebsiteMediaApiToDomain, mapWebsiteMediaDomainToInsert, mapWebsiteMediaDomainToUpdate } from '@/mappers/websiteMediaMapper';
import { mapWebsiteMediaCategoryApiToDomain, mapWebsiteMediaCategoryDomainToInsert, mapWebsiteMediaCategoryDomainToUpdate } from '@/mappers/websiteMediaCategoryMapper';
import { mapWebsiteDomainApiToDomain, mapWebsiteDomainDomainToInsert, mapWebsiteDomainDomainToUpdate } from '@/mappers/websiteDomainMapper';
import { mapWebsiteFatwaApiToDomain, mapWebsiteFatwaDomainToInsert, mapWebsiteFatwaDomainToUpdate, mapWebsiteFatwaCategoryApiToDomain, mapWebsiteFatwaCategoryDomainToInsert, mapWebsiteFatwaCategoryDomainToUpdate, mapWebsiteFatwaQuestionApiToDomain, mapWebsiteFatwaQuestionDomainToUpdate } from '@/mappers/websiteFatwaMapper';
import { mapWebsiteAnnouncementApiToDomain, mapWebsiteAnnouncementDomainToInsert, mapWebsiteAnnouncementDomainToUpdate } from '@/mappers/websiteAnnouncementMapper';

// Re-export domain types for convenience
export type { WebsitePage } from '@/types/domain/websitePage';
export type { WebsitePost } from '@/types/domain/websitePost';
export type { WebsiteEvent } from '@/types/domain/websiteEvent';
export type { WebsiteMenu } from '@/types/domain/websiteMenu';
export type { WebsiteMedia } from '@/types/domain/websiteMedia';
export type { WebsiteMediaCategory } from '@/types/domain/websiteMediaCategory';
export type { WebsiteDomain } from '@/types/domain/websiteDomain';
export type { WebsiteFatwa, WebsiteFatwaCategory, WebsiteFatwaQuestion } from '@/types/domain/websiteFatwa';
export type { WebsiteAnnouncement } from '@/types/domain/websiteAnnouncement';

export const useWebsiteSettings = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['website-settings', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return null;
      return websiteSettingsApi.get();
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useUpdateWebsiteSettings = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: websiteSettingsApi.update,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ['website-settings', profile?.organization_id, profile?.default_school_id ?? null],
    }),
  });
};

export const useWebsitePages = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsitePage[]>({
    queryKey: ['website-pages', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiPages = await websitePagesApi.list();
      return (apiPages as WebsitePageApi.WebsitePage[]).map(mapWebsitePageApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsitePage = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsitePage>) => {
      const insertData = mapWebsitePageDomainToInsert(data);
      const apiPage = await websitePagesApi.create(insertData);
      return mapWebsitePageApiToDomain(apiPage as WebsitePageApi.WebsitePage);
    },
    onSuccess: () => {
      showToast.success(t('toast.pageCreated') || 'Page created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-pages'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.pageCreateFailed') || 'Failed to create page');
    },
  });
};

export const useUpdateWebsitePage = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsitePage> & { id: string }) => {
      const updateData = mapWebsitePageDomainToUpdate(updates);
      const apiPage = await websitePagesApi.update(id, updateData);
      return mapWebsitePageApiToDomain(apiPage as WebsitePageApi.WebsitePage);
    },
    onSuccess: () => {
      showToast.success(t('toast.pageUpdated') || 'Page updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-pages'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.pageUpdateFailed') || 'Failed to update page');
    },
  });
};

export const useDeleteWebsitePage = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websitePagesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.pageDeleted') || 'Page deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-pages'] });
      await queryClient.refetchQueries({ queryKey: ['website-pages'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.pageDeleteFailed') || 'Failed to delete page');
    },
  });
};

export const useWebsitePosts = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsitePost[]>({
    queryKey: ['website-posts', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiPosts = await websitePostsApi.list();
      return (apiPosts as WebsitePostApi.WebsitePost[]).map(mapWebsitePostApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsitePost = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsitePost>) => {
      const insertData = mapWebsitePostDomainToInsert(data);
      const apiPost = await websitePostsApi.create(insertData);
      return mapWebsitePostApiToDomain(apiPost as WebsitePostApi.WebsitePost);
    },
    onSuccess: () => {
      showToast.success(t('toast.postCreated') || 'Post created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-posts'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.postCreateFailed') || 'Failed to create post');
    },
  });
};

export const useUpdateWebsitePost = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsitePost> & { id: string }) => {
      const updateData = mapWebsitePostDomainToUpdate(updates);
      const apiPost = await websitePostsApi.update(id, updateData);
      return mapWebsitePostApiToDomain(apiPost as WebsitePostApi.WebsitePost);
    },
    onSuccess: () => {
      showToast.success(t('toast.postUpdated') || 'Post updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-posts'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.postUpdateFailed') || 'Failed to update post');
    },
  });
};

export const useDeleteWebsitePost = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websitePostsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.postDeleted') || 'Post deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-posts'] });
      await queryClient.refetchQueries({ queryKey: ['website-posts'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.postDeleteFailed') || 'Failed to delete post');
    },
  });
};

export const useWebsiteEvents = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteEvent[]>({
    queryKey: ['website-events', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiEvents = await websiteEventsApi.list();
      return (apiEvents as WebsiteEventApi.WebsiteEvent[]).map(mapWebsiteEventApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteEvent = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteEvent>) => {
      const insertData = mapWebsiteEventDomainToInsert(data);
      const apiEvent = await websiteEventsApi.create(insertData);
      return mapWebsiteEventApiToDomain(apiEvent as WebsiteEventApi.WebsiteEvent);
    },
    onSuccess: () => {
      showToast.success(t('toast.eventCreated') || 'Event created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-events'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.eventCreateFailed') || 'Failed to create event');
    },
  });
};

export const useUpdateWebsiteEvent = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteEvent> & { id: string }) => {
      const updateData = mapWebsiteEventDomainToUpdate(updates);
      const apiEvent = await websiteEventsApi.update(id, updateData);
      return mapWebsiteEventApiToDomain(apiEvent as WebsiteEventApi.WebsiteEvent);
    },
    onSuccess: () => {
      showToast.success(t('toast.eventUpdated') || 'Event updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-events'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.eventUpdateFailed') || 'Failed to update event');
    },
  });
};

export const useDeleteWebsiteEvent = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteEventsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.eventDeleted') || 'Event deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-events'] });
      await queryClient.refetchQueries({ queryKey: ['website-events'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.eventDeleteFailed') || 'Failed to delete event');
    },
  });
};

export const useWebsiteMediaCategories = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteMediaCategory[]>({
    queryKey: ['website-media-categories', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiCategories = await websiteMediaCategoriesApi.list();
      return (apiCategories as WebsiteMediaCategoryApi.WebsiteMediaCategory[]).map(mapWebsiteMediaCategoryApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteMediaCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteMediaCategory>) => {
      const insertData = mapWebsiteMediaCategoryDomainToInsert(data);
      const apiCategory = await websiteMediaCategoriesApi.create(insertData);
      return mapWebsiteMediaCategoryApiToDomain(apiCategory as WebsiteMediaCategoryApi.WebsiteMediaCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.mediaCategoryCreated') || 'Media category created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-media-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.mediaCategoryCreateFailed') || 'Failed to create media category');
    },
  });
};

export const useUpdateWebsiteMediaCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteMediaCategory> & { id: string }) => {
      const updateData = mapWebsiteMediaCategoryDomainToUpdate(updates);
      const apiCategory = await websiteMediaCategoriesApi.update(id, updateData);
      return mapWebsiteMediaCategoryApiToDomain(apiCategory as WebsiteMediaCategoryApi.WebsiteMediaCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.mediaCategoryUpdated') || 'Media category updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-media-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.mediaCategoryUpdateFailed') || 'Failed to update media category');
    },
  });
};

export const useDeleteWebsiteMediaCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteMediaCategoriesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.mediaCategoryDeleted') || 'Media category deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-media-categories'] });
      await queryClient.refetchQueries({ queryKey: ['website-media-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.mediaCategoryDeleteFailed') || 'Failed to delete media category');
    },
  });
};

export const useWebsiteMedia = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteMedia[]>({
    queryKey: ['website-media', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiMedia = await websiteMediaApi.list();
      return (apiMedia as WebsiteMediaApi.WebsiteMedia[]).map(mapWebsiteMediaApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteMedia = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteMedia>) => {
      const insertData = mapWebsiteMediaDomainToInsert(data);
      const apiMedia = await websiteMediaApi.create(insertData);
      return mapWebsiteMediaApiToDomain(apiMedia as WebsiteMediaApi.WebsiteMedia);
    },
    onSuccess: () => {
      showToast.success(t('toast.mediaCreated') || 'Media created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-media'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.mediaCreateFailed') || 'Failed to create media');
    },
  });
};

export const useUpdateWebsiteMedia = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteMedia> & { id: string }) => {
      const updateData = mapWebsiteMediaDomainToUpdate(updates);
      const apiMedia = await websiteMediaApi.update(id, updateData);
      return mapWebsiteMediaApiToDomain(apiMedia as WebsiteMediaApi.WebsiteMedia);
    },
    onSuccess: () => {
      showToast.success(t('toast.mediaUpdated') || 'Media updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-media'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.mediaUpdateFailed') || 'Failed to update media');
    },
  });
};

export const useDeleteWebsiteMedia = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteMediaApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.mediaDeleted') || 'Media deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-media'] });
      await queryClient.refetchQueries({ queryKey: ['website-media'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.mediaDeleteFailed') || 'Failed to delete media');
    },
  });
};

export const useWebsiteDomains = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteDomain[]>({
    queryKey: ['website-domains', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiDomains = await websiteDomainsApi.list();
      return (apiDomains as WebsiteDomainApi.WebsiteDomain[]).map(mapWebsiteDomainApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteDomain = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteDomain>) => {
      const insertData = mapWebsiteDomainDomainToInsert(data);
      const apiDomain = await websiteDomainsApi.create(insertData);
      return mapWebsiteDomainApiToDomain(apiDomain as WebsiteDomainApi.WebsiteDomain);
    },
    onSuccess: () => {
      showToast.success(t('toast.domainCreated') || 'Domain created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-domains'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.domainCreateFailed') || 'Failed to create domain');
    },
  });
};

export const useUpdateWebsiteDomain = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteDomain> & { id: string }) => {
      const updateData = mapWebsiteDomainDomainToUpdate(updates);
      const apiDomain = await websiteDomainsApi.update(id, updateData);
      return mapWebsiteDomainApiToDomain(apiDomain as WebsiteDomainApi.WebsiteDomain);
    },
    onSuccess: () => {
      showToast.success(t('toast.domainUpdated') || 'Domain updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-domains'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.domainUpdateFailed') || 'Failed to update domain');
    },
  });
};

export const useDeleteWebsiteDomain = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteDomainsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.domainDeleted') || 'Domain deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-domains'] });
      await queryClient.refetchQueries({ queryKey: ['website-domains'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.domainDeleteFailed') || 'Failed to delete domain');
    },
  });
};

export const useWebsiteMenus = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteMenu[]>({
    queryKey: ['website-menus', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiMenus = await websiteMenusApi.list();
      return (apiMenus as WebsiteMenuApi.WebsiteMenu[]).map(mapWebsiteMenuApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteMenu = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteMenu>) => {
      const insertData = mapWebsiteMenuDomainToInsert(data);
      const apiMenu = await websiteMenusApi.create(insertData);
      return mapWebsiteMenuApiToDomain(apiMenu as WebsiteMenuApi.WebsiteMenu);
    },
    onSuccess: () => {
      showToast.success(t('toast.menuCreated') || 'Menu item created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-menus'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.menuCreateFailed') || 'Failed to create menu item');
    },
  });
};

export const useUpdateWebsiteMenu = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteMenu> & { id: string }) => {
      const updateData = mapWebsiteMenuDomainToUpdate(updates);
      const apiMenu = await websiteMenusApi.update(id, updateData);
      return mapWebsiteMenuApiToDomain(apiMenu as WebsiteMenuApi.WebsiteMenu);
    },
    onSuccess: () => {
      showToast.success(t('toast.menuUpdated') || 'Menu item updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-menus'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.menuUpdateFailed') || 'Failed to update menu item');
    },
  });
};

export const useDeleteWebsiteMenu = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteMenusApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.menuDeleted') || 'Menu item deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-menus'] });
      await queryClient.refetchQueries({ queryKey: ['website-menus'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.menuDeleteFailed') || 'Failed to delete menu item');
    },
  });
};

// Fatwa Hooks
export const useWebsiteFatwas = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteFatwa[]>({
    queryKey: ['website-fatwas', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiFatwas = await websiteFatwasApi.list();
      return (apiFatwas as WebsiteFatwaApi.WebsiteFatwa[]).map(mapWebsiteFatwaApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteFatwa = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteFatwa>) => {
      const insertData = mapWebsiteFatwaDomainToInsert(data);
      const apiFatwa = await websiteFatwasApi.create(insertData);
      return mapWebsiteFatwaApiToDomain(apiFatwa as WebsiteFatwaApi.WebsiteFatwa);
    },
    onSuccess: () => {
      showToast.success(t('toast.fatwaCreated') || 'Fatwa created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-fatwas'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.fatwaCreateFailed') || 'Failed to create fatwa');
    },
  });
};

export const useUpdateWebsiteFatwa = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteFatwa> & { id: string }) => {
      const updateData = mapWebsiteFatwaDomainToUpdate(updates);
      const apiFatwa = await websiteFatwasApi.update(id, updateData);
      return mapWebsiteFatwaApiToDomain(apiFatwa as WebsiteFatwaApi.WebsiteFatwa);
    },
    onSuccess: () => {
      showToast.success(t('toast.fatwaUpdated') || 'Fatwa updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-fatwas'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.fatwaUpdateFailed') || 'Failed to update fatwa');
    },
  });
};

export const useDeleteWebsiteFatwa = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteFatwasApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.fatwaDeleted') || 'Fatwa deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-fatwas'] });
      await queryClient.refetchQueries({ queryKey: ['website-fatwas'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.fatwaDeleteFailed') || 'Failed to delete fatwa');
    },
  });
};

// Fatwa Category Hooks
export const useWebsiteFatwaCategories = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteFatwaCategory[]>({
    queryKey: ['website-fatwa-categories', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiCategories = await websiteFatwaCategoriesApi.list();
      return (apiCategories as WebsiteFatwaApi.WebsiteFatwaCategory[]).map(mapWebsiteFatwaCategoryApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteFatwaCategory = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteFatwaCategory>) => {
      const insertData = mapWebsiteFatwaCategoryDomainToInsert(data);
      const apiCategory = await websiteFatwaCategoriesApi.create(insertData);
      return mapWebsiteFatwaCategoryApiToDomain(apiCategory as WebsiteFatwaApi.WebsiteFatwaCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.categoryCreated') || 'Category created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-fatwa-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryCreateFailed') || 'Failed to create category');
    },
  });
};

export const useUpdateWebsiteFatwaCategory = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteFatwaCategory> & { id: string }) => {
      const updateData = mapWebsiteFatwaCategoryDomainToUpdate(updates);
      const apiCategory = await websiteFatwaCategoriesApi.update(id, updateData);
      return mapWebsiteFatwaCategoryApiToDomain(apiCategory as WebsiteFatwaApi.WebsiteFatwaCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.categoryUpdated') || 'Category updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-fatwa-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryUpdateFailed') || 'Failed to update category');
    },
  });
};

export const useDeleteWebsiteFatwaCategory = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteFatwaCategoriesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.categoryDeleted') || 'Category deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-fatwa-categories'] });
      await queryClient.refetchQueries({ queryKey: ['website-fatwa-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryDeleteFailed') || 'Failed to delete category');
    },
  });
};

// Fatwa Question Hooks
export const useWebsiteFatwaQuestions = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteFatwaQuestion[]>({
    queryKey: ['website-fatwa-questions', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiQuestions = await websiteFatwaQuestionsApi.list();
      return (apiQuestions as WebsiteFatwaApi.WebsiteFatwaQuestion[]).map(mapWebsiteFatwaQuestionApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateWebsiteFatwaQuestion = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteFatwaQuestion> & { id: string }) => {
      const updateData = mapWebsiteFatwaQuestionDomainToUpdate(updates);
      const apiQuestion = await websiteFatwaQuestionsApi.update(id, updateData);
      return mapWebsiteFatwaQuestionApiToDomain(apiQuestion as WebsiteFatwaApi.WebsiteFatwaQuestion);
    },
    onSuccess: () => {
      showToast.success(t('toast.questionUpdated') || 'Question updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-fatwa-questions'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.questionUpdateFailed') || 'Failed to update question');
    },
  });
};

// Announcement Hooks
export const useWebsiteAnnouncements = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<WebsiteAnnouncement[]>({
    queryKey: ['website-announcements', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      const apiAnnouncements = await websiteAnnouncementsApi.list();
      return (apiAnnouncements as WebsiteAnnouncementApi.WebsiteAnnouncement[]).map(mapWebsiteAnnouncementApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWebsiteAnnouncement = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: Partial<WebsiteAnnouncement>) => {
      const insertData = mapWebsiteAnnouncementDomainToInsert(data);
      const apiAnnouncement = await websiteAnnouncementsApi.create(insertData);
      return mapWebsiteAnnouncementApiToDomain(apiAnnouncement as WebsiteAnnouncementApi.WebsiteAnnouncement);
    },
    onSuccess: () => {
      showToast.success(t('toast.announcementCreated') || 'Announcement created successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-announcements'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.announcementCreateFailed') || 'Failed to create announcement');
    },
  });
};

export const useUpdateWebsiteAnnouncement = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebsiteAnnouncement> & { id: string }) => {
      const updateData = mapWebsiteAnnouncementDomainToUpdate(updates);
      const apiAnnouncement = await websiteAnnouncementsApi.update(id, updateData);
      return mapWebsiteAnnouncementApiToDomain(apiAnnouncement as WebsiteAnnouncementApi.WebsiteAnnouncement);
    },
    onSuccess: () => {
      showToast.success(t('toast.announcementUpdated') || 'Announcement updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['website-announcements'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.announcementUpdateFailed') || 'Failed to update announcement');
    },
  });
};

export const useDeleteWebsiteAnnouncement = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await websiteAnnouncementsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.announcementDeleted') || 'Announcement deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['website-announcements'] });
      await queryClient.refetchQueries({ queryKey: ['website-announcements'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.announcementDeleteFailed') || 'Failed to delete announcement');
    },
  });
};
