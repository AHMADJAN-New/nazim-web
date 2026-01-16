import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/useLanguage';
import { platformApi } from '../lib/platformApi';
import { showToast } from '@/lib/toast';
import {
  mapLicenseKeyApiToDomain,
  mapDesktopLicenseApiToDomain,
  mapGenerateKeyPairRequestDomainToApi,
  mapSignLicenseRequestDomainToApi,
  mapVerifyLicenseRequestDomainToApi,
  mapUpdateKeyRequestDomainToApi,
  mapSignedLicenseResponseApiToDomain,
  mapVerifyLicenseResponseApiToDomain,
} from '@/mappers/desktopLicenseMapper';
import type * as DesktopLicenseApi from '@/types/api/desktopLicense';
import type {
  LicenseKey,
  DesktopLicense,
  GenerateKeyPairRequest,
  SignLicenseRequest,
  VerifyLicenseRequest,
  UpdateKeyRequest,
  SignedLicenseResponse,
  VerifyLicenseResponse,
} from '@/types/domain/desktopLicense';

// Re-export domain types for convenience
export type { LicenseKey, DesktopLicense, LicenseEdition } from '@/types/domain/desktopLicense';

/**
 * List all license keys
 */
export const useLicenseKeys = (enabled: boolean = true) => {
  return useQuery<LicenseKey[]>({
    queryKey: ['platform-desktop-license-keys'],
    queryFn: async () => {
      const response = await platformApi.desktopLicenses.keys.list();
      return (response.data as DesktopLicenseApi.LicenseKey[]).map(mapLicenseKeyApiToDomain);
    },
    enabled: enabled === true, // Explicitly convert to boolean
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if disabled
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: false, // Don't retry on 403 errors
    retryOnMount: false, // Don't retry on mount
  });
};

/**
 * Get a single license key
 */
export const useLicenseKey = (id: string | null) => {
  return useQuery<LicenseKey | null>({
    queryKey: ['platform-desktop-license-key', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await platformApi.desktopLicenses.keys.get(id);
      return mapLicenseKeyApiToDomain(response.data as DesktopLicenseApi.LicenseKey);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Generate a new key pair
 */
export const useGenerateKeyPair = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: GenerateKeyPairRequest) => {
      const apiData = mapGenerateKeyPairRequestDomainToApi(data);
      const response = await platformApi.desktopLicenses.keys.generate(apiData);
      return mapLicenseKeyApiToDomain(response.data as DesktopLicenseApi.LicenseKey);
    },
    onSuccess: () => {
      showToast.success(t('toast.keyPairGenerated') || 'Key pair generated successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-desktop-license-keys'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.keyPairGenerationFailed') || 'Failed to generate key pair'));
    },
  });
};

/**
 * Update a license key
 */
export const useUpdateKey = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & UpdateKeyRequest) => {
      const apiData = mapUpdateKeyRequestDomainToApi(data);
      const response = await platformApi.desktopLicenses.keys.update(id, apiData);
      return mapLicenseKeyApiToDomain(response.data as DesktopLicenseApi.LicenseKey);
    },
    onSuccess: () => {
      showToast.success(t('toast.keyUpdated') || 'Key updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-desktop-license-keys'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.keyUpdateFailed') || 'Failed to update key'));
    },
  });
};

/**
 * Delete a license key
 */
export const useDeleteKey = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await platformApi.desktopLicenses.keys.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.keyDeleted') || 'Key deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['platform-desktop-license-keys'] });
      await queryClient.refetchQueries({ queryKey: ['platform-desktop-license-keys'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.keyDeleteFailed') || 'Failed to delete key'));
    },
  });
};

/**
 * Sign a license
 */
export const useSignLicense = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: SignLicenseRequest) => {
      const apiData = mapSignLicenseRequestDomainToApi(data);
      const response = await platformApi.desktopLicenses.sign(apiData);
      return mapSignedLicenseResponseApiToDomain(response.data as DesktopLicenseApi.SignedLicenseResponse);
    },
    onSuccess: () => {
      showToast.success(t('toast.licenseSigned') || 'License signed successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.licenseSignFailed') || 'Failed to sign license'));
    },
  });
};

/**
 * Verify a license
 */
export const useVerifyLicense = () => {
  return useMutation({
    mutationFn: async (data: VerifyLicenseRequest) => {
      const apiData = mapVerifyLicenseRequestDomainToApi(data);
      const response = await platformApi.desktopLicenses.verify(apiData);
      return mapVerifyLicenseResponseApiToDomain(response.data as DesktopLicenseApi.VerifyLicenseResponse);
    },
  });
};

/**
 * List all desktop licenses
 */
export const useDesktopLicenses = (enabled: boolean = true) => {
  return useQuery<DesktopLicense[]>({
    queryKey: ['platform-desktop-licenses'],
    queryFn: async () => {
      const response = await platformApi.desktopLicenses.list();
      return (response.data as DesktopLicenseApi.DesktopLicense[]).map(mapDesktopLicenseApiToDomain);
    },
    enabled: enabled === true, // Explicitly convert to boolean
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if disabled
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: false, // Don't retry on 403 errors
    retryOnMount: false, // Don't retry on mount
  });
};

/**
 * Get a single desktop license
 */
export const useDesktopLicense = (id: string | null) => {
  return useQuery<DesktopLicense | null>({
    queryKey: ['platform-desktop-license', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await platformApi.desktopLicenses.get(id);
      return mapDesktopLicenseApiToDomain(response.data as DesktopLicenseApi.DesktopLicense);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Download a license file
 */
export const useDownloadLicense = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      // The download function in platformApi handles the file download automatically
      await platformApi.desktopLicenses.download(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.licenseDownloaded') || 'License downloaded successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.licenseDownloadFailed') || 'Failed to download license'));
    },
  });
};

/**
 * Delete a desktop license
 */
export const useDeleteLicense = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await platformApi.desktopLicenses.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.licenseDeleted') || 'License deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['platform-desktop-licenses'] });
      await queryClient.refetchQueries({ queryKey: ['platform-desktop-licenses'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || (t('toast.licenseDeleteFailed') || 'Failed to delete license'));
    },
  });
};

