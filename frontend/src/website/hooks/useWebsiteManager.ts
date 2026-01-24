import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  websiteSettingsApi,
  websitePagesApi,
  websitePostsApi,
  websiteEventsApi,
  websiteMediaApi,
  websiteDomainsApi,
  websiteMenusApi,
} from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';

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

  return useQuery({
    queryKey: ['website-pages', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      return websitePagesApi.list();
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useCreateWebsitePage = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: websitePagesApi.create,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ['website-pages', profile?.organization_id, profile?.default_school_id ?? null],
    }),
  });
};

export const useWebsitePosts = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['website-posts', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      return websitePostsApi.list();
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useWebsiteEvents = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['website-events', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      return websiteEventsApi.list();
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useWebsiteMedia = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['website-media', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      return websiteMediaApi.list();
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useWebsiteDomains = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['website-domains', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      return websiteDomainsApi.list();
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
  });
};

export const useWebsiteMenus = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['website-menus', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) return [];
      return websiteMenusApi.list();
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
  });
};
