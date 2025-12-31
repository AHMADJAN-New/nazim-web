import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import type * as IdCardTemplateApi from '@/types/api/idCardTemplate';
import type { IdCardTemplate, IdCardLayoutConfig } from '@/types/domain/idCardTemplate';
import { mapIdCardTemplateApiToDomain, mapIdCardTemplateDomainToInsert, mapIdCardTemplateDomainToUpdate } from '@/mappers/idCardTemplateMapper';
import { idCardTemplatesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';

// Re-export domain types for convenience
export type { IdCardTemplate, IdCardLayoutConfig } from '@/types/domain/idCardTemplate';

export const useIdCardTemplates = (activeOnly?: boolean, filters?: { school_id?: string }) => {
  const { user, profile } = useAuth();

  return useQuery<IdCardTemplate[]>({
    queryKey: ['id-card-templates', activeOnly, filters],
    queryFn: async () => {
      if (!user || !profile) return [];

      const params: any = {};
      if (activeOnly) params.active_only = 'true';
      if (filters?.school_id) params.school_id = filters.school_id;

      const templates = await idCardTemplatesApi.list(params);
      return (templates as IdCardTemplateApi.IdCardTemplate[]).map(mapIdCardTemplateApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: 30 * 1000, // 30 seconds (reduced from 5 minutes)
    refetchOnWindowFocus: true, // Enable refetch on window focus
  });
};

export const useIdCardTemplate = (templateId: string) => {
  const { user, profile } = useAuth();

  return useQuery<IdCardTemplate | null>({
    queryKey: ['id-card-templates', templateId],
    queryFn: async () => {
      if (!user || !profile || !templateId) return null;

      const template = await idCardTemplatesApi.get(templateId);
      return mapIdCardTemplateApiToDomain(template as IdCardTemplateApi.IdCardTemplate);
    },
    enabled: !!user && !!profile && !!templateId,
    staleTime: 30 * 1000, // 30 seconds (reduced from 5 minutes)
    refetchOnWindowFocus: true, // Enable refetch on window focus
  });
};

export const useCreateIdCardTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string | null;
      background_image_front?: File | null;
      background_image_back?: File | null;
      layout_config_front?: IdCardLayoutConfig;
      layout_config_back?: IdCardLayoutConfig;
      card_size?: string;
      school_id?: string | null;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.background_image_front) formData.append('background_image_front', data.background_image_front);
      if (data.background_image_back) formData.append('background_image_back', data.background_image_back);
      if (data.layout_config_front) formData.append('layout_config_front', JSON.stringify(data.layout_config_front));
      if (data.layout_config_back) formData.append('layout_config_back', JSON.stringify(data.layout_config_back));
      if (data.card_size) formData.append('card_size', data.card_size);
      if (data.school_id) formData.append('school_id', data.school_id);
      if (data.is_default !== undefined) formData.append('is_default', data.is_default ? '1' : '0');
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

      const template = await idCardTemplatesApi.create(formData);
      return mapIdCardTemplateApiToDomain(template as IdCardTemplateApi.IdCardTemplate);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardTemplateCreated') || 'ID card template created successfully');
      void queryClient.invalidateQueries({ queryKey: ['id-card-templates'] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || (t('toast.idCardTemplateCreateFailed') || 'Failed to create ID card template');
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[useCreateIdCardTemplate] Error:', error);
      }
    },
  });
};

export const useUpdateIdCardTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        name?: string;
        description?: string | null;
        background_image_front?: File | null;
        background_image_back?: File | null;
        layout_config_front?: IdCardLayoutConfig;
        layout_config_back?: IdCardLayoutConfig;
        card_size?: string;
        school_id?: string | null;
        is_default?: boolean;
        is_active?: boolean;
      };
    }) => {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.description !== undefined) formData.append('description', data.description || '');
      if (data.background_image_front) formData.append('background_image_front', data.background_image_front);
      if (data.background_image_back) formData.append('background_image_back', data.background_image_back);
      if (data.layout_config_front) formData.append('layout_config_front', JSON.stringify(data.layout_config_front));
      if (data.layout_config_back) formData.append('layout_config_back', JSON.stringify(data.layout_config_back));
      if (data.card_size) formData.append('card_size', data.card_size);
      if (data.school_id !== undefined) formData.append('school_id', data.school_id || '');
      if (data.is_default !== undefined) formData.append('is_default', data.is_default ? '1' : '0');
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

      const template = await idCardTemplatesApi.update(id, formData);
      return mapIdCardTemplateApiToDomain(template as IdCardTemplateApi.IdCardTemplate);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardTemplateUpdated') || 'ID card template updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['id-card-templates'] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || (t('toast.idCardTemplateUpdateFailed') || 'Failed to update ID card template');
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[useUpdateIdCardTemplate] Error:', error);
      }
    },
  });
};

export const useDeleteIdCardTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await idCardTemplatesApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.idCardTemplateDeleted') || 'ID card template deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['id-card-templates'] });
      await queryClient.refetchQueries({ queryKey: ['id-card-templates'] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || (t('toast.idCardTemplateDeleteFailed') || 'Failed to delete ID card template');
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[useDeleteIdCardTemplate] Error:', error);
      }
    },
  });
};

export const useSetDefaultIdCardTemplate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const template = await idCardTemplatesApi.setDefault(id);
      return mapIdCardTemplateApiToDomain(template as IdCardTemplateApi.IdCardTemplate);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardTemplateSetDefault') || 'Default ID card template set successfully');
      void queryClient.invalidateQueries({ queryKey: ['id-card-templates'] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || (t('toast.idCardTemplateSetDefaultFailed') || 'Failed to set default ID card template');
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[useSetDefaultIdCardTemplate] Error:', error);
      }
    },
  });
};

export const getIdCardBackgroundUrl = (id: string, side: 'front' | 'back'): string => {
  return idCardTemplatesApi.getBackgroundUrl(id, side);
};

