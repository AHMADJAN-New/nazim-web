import { useMutation } from '@tanstack/react-query';
import { websiteMediaApi } from '@/lib/api/client';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

export interface WebsiteImageUploadResult {
  url: string;
  path: string;
  mediaId: string;
}

/** Optional categoryId stores the image under website/media/categories/{id}/items/ */
export const useWebsiteImageUpload = (categoryId?: string | null) => {
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

      const response = await websiteMediaApi.uploadImage(file, categoryId);
      return {
        url: response.url,
        path: response.path,
        mediaId: response.media_id,
      };
    },
    onError: (error: Error) => {
      const msg = error.message || '';
      const status = (error as { status?: number }).status;
      const isImageValidation =
        status === 422 ||
        /file.*must be an image|must be an image|select an image|given data was invalid/i.test(msg);
      const message = isImageValidation
        ? (t('toast.fileMustBeImage') || 'Please select an image file (JPEG, PNG, GIF, WebP, BMP, or SVG).')
        : (msg || t('toast.imageUploadFailed') || 'Failed to upload image');
      showToast.error(message);
    },
  });
};

