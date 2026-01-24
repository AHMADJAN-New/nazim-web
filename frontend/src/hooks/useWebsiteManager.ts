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

export const useWebsiteSettings = () => {
  return useQuery({
    queryKey: ['website-settings'],
    queryFn: () => websiteSettingsApi.get(),
  });
};

export const useUpdateWebsiteSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: websiteSettingsApi.update,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['website-settings'] }),
  });
};

export const useWebsitePages = () => {
  return useQuery({
    queryKey: ['website-pages'],
    queryFn: () => websitePagesApi.list(),
  });
};

export const useCreateWebsitePage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: websitePagesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['website-pages'] }),
  });
};

export const useWebsitePosts = () => {
  return useQuery({
    queryKey: ['website-posts'],
    queryFn: () => websitePostsApi.list(),
  });
};

export const useWebsiteEvents = () => {
  return useQuery({
    queryKey: ['website-events'],
    queryFn: () => websiteEventsApi.list(),
  });
};

export const useWebsiteMedia = () => {
  return useQuery({
    queryKey: ['website-media'],
    queryFn: () => websiteMediaApi.list(),
  });
};

export const useWebsiteDomains = () => {
  return useQuery({
    queryKey: ['website-domains'],
    queryFn: () => websiteDomainsApi.list(),
  });
};

export const useWebsiteMenus = () => {
  return useQuery({
    queryKey: ['website-menus'],
    queryFn: () => websiteMenusApi.list(),
  });
};
