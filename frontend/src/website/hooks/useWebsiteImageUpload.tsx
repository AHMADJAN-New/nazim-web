import { useMutation } from '@tanstack/react-query';
import { websiteMediaApi } from '@/lib/api/client';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

export interface WebsiteImageUploadResult {
  url: string;
  path: string;
  mediaId: string;
}

export const useWebsiteImageUpload = () => {
  const { t } = useLanguage();

  return useMutation<WebsiteImageUploadResult, Error, File>({
    mutationFn: async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 10MB');
      }

      const response = await websiteMediaApi.uploadImage(file);
      return {
        url: response.url,
        path: response.path,
        mediaId: response.media_id,
      };
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.imageUploadFailed') || 'Failed to upload image');
    },
  });
};

