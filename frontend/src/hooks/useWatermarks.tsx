import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { useProfile } from './useProfiles';

import { watermarksApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapWatermarkApiToDomain, mapWatermarkDomainToInsert, mapWatermarkDomainToUpdate } from '@/mappers/watermarkMapper';
import type * as WatermarkApi from '@/types/api/watermark';
import type { Watermark, CreateWatermarkData, UpdateWatermarkData } from '@/types/domain/watermark';

// Re-export domain types for convenience
export type { Watermark, CreateWatermarkData, UpdateWatermarkData } from '@/types/domain/watermark';

export const useWatermarks = (brandingId: string | null | undefined) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useQuery<Watermark[]>({
    queryKey: ['watermarks', brandingId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !brandingId) return [];

      // Fetch watermarks from Laravel API
      const apiWatermarks = await watermarksApi.list({
        branding_id: brandingId,
      });

      // Map API models to domain models
      return (apiWatermarks as WatermarkApi.Watermark[]).map(mapWatermarkApiToDomain);
    },
    enabled: !!user && !!profile && !!brandingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useWatermark = (watermarkId: string | null | undefined) => {
  const { user, profile } = useAuth();

  return useQuery<Watermark>({
    queryKey: ['watermark', watermarkId, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !watermarkId) {
        throw new Error('Watermark ID is required');
      }

      // Fetch watermark from Laravel API
      const apiWatermark = await watermarksApi.get(watermarkId);
      return mapWatermarkApiToDomain(apiWatermark as WatermarkApi.Watermark);
    },
    enabled: !!user && !!profile && !!watermarkId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateWatermark = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: CreateWatermarkData) => {
      // Convert domain to API payload
      const insertData = mapWatermarkDomainToInsert(data);
      const apiWatermark = await watermarksApi.create(insertData);
      return mapWatermarkApiToDomain(apiWatermark as WatermarkApi.Watermark);
    },
    onSuccess: (watermark) => {
      showToast.success(t('toast.watermarkCreated') || 'Watermark created successfully');
      void queryClient.invalidateQueries({ queryKey: ['watermarks', watermark.brandingId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.watermarkCreateFailed') || 'Failed to create watermark');
    },
  });
};

export const useUpdateWatermark = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateWatermarkData & { id: string }) => {
      // Get current watermark to get brandingId
      const currentWatermark = await watermarksApi.get(id);
      const brandingId = (currentWatermark as WatermarkApi.Watermark).branding_id;

      // Convert domain to API payload
      const updateData = mapWatermarkDomainToUpdate(updates);
      const apiWatermark = await watermarksApi.update(id, updateData);
      return mapWatermarkApiToDomain(apiWatermark as WatermarkApi.Watermark);
    },
    onSuccess: (watermark) => {
      showToast.success(t('toast.watermarkUpdated') || 'Watermark updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['watermarks', watermark.brandingId] });
      void queryClient.invalidateQueries({ queryKey: ['watermark', watermark.id] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.watermarkUpdateFailed') || 'Failed to update watermark');
    },
  });
};

export const useDeleteWatermark = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, brandingId }: { id: string; brandingId: string }) => {
      await watermarksApi.delete(id);
      return { id, brandingId };
    },
    onSuccess: async ({ brandingId }) => {
      showToast.success(t('toast.watermarkDeleted') || 'Watermark deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['watermarks', brandingId] });
      await queryClient.refetchQueries({ queryKey: ['watermarks', brandingId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.watermarkDeleteFailed') || 'Failed to delete watermark');
    },
  });
};

