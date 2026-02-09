import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface UploadStudentGuardianPictureArgs {
  studentId: string;
  organizationId: string;
  schoolId?: string | null;
  file: File;
}

export const useStudentGuardianPictureUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      organizationId,
      schoolId,
      file,
    }: UploadStudentGuardianPictureArgs) => {
      if (import.meta.env.DEV) {
        console.log('[Guardian Picture Upload] Starting upload', {
          studentId,
          organizationId,
          fileName: file.name,
          fileSize: file.size,
        });
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(
        `/students/${studentId}/guardian-picture`,
        formData
      );

      if (import.meta.env.DEV) {
        console.log('[Guardian Picture Upload] Upload successful', {
          studentId,
          guardianPicturePath: (response as { guardian_picture_path?: string })
            ?.guardian_picture_path,
        });
      }

      return {
        guardianPicturePath: (response as { guardian_picture_path?: string })
          ?.guardian_picture_path,
      };
    },
    onSuccess: async (_data, variables) => {
      showToast.success('toast.pictureUploaded');
      await queryClient.invalidateQueries({ queryKey: ['students'] });
      await queryClient.refetchQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        console.error('[Guardian Picture Upload] Upload failed', error);
      }
      showToast.error(error.message || 'toast.pictureUploadFailed');
    },
  });
};
