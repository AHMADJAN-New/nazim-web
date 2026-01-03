import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface UploadStudentPictureArgs {
    studentId: string;
    organizationId: string;
    schoolId?: string | null;
    file: File;
}

export const useStudentPictureUpload = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ studentId, organizationId, schoolId, file }: UploadStudentPictureArgs) => {
            // DEBUG: Log picture upload
            if (import.meta.env.DEV) {
                console.log('[Picture Upload] Starting upload', {
                    studentId,
                    organizationId,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                });
            }

            const formData = new FormData();
            formData.append('file', file);

            // Don't set Content-Type header - browser will set it automatically with boundary for FormData
            const response = await apiClient.post(`/students/${studentId}/picture`, formData);

            // DEBUG: Log success
            if (import.meta.env.DEV) {
                console.log('[Picture Upload] Upload successful', {
                    studentId,
                    picturePath: response.picture_path,
                });
            }

            // Return picture URL and path
            const pictureUrl = `/api/students/${studentId}/picture`;
            return {
                pictureUrl,
                picturePath: response.picture_path,
            };
        },
        onSuccess: async () => {
            showToast.success('toast.pictureUploaded');
            // Invalidate and refetch student queries to refresh the data immediately
            await queryClient.invalidateQueries({ queryKey: ['students'] });
            await queryClient.refetchQueries({ queryKey: ['students'] });
        },
        onError: (error: Error) => {
            // DEBUG: Log error
            if (import.meta.env.DEV) {
                console.error('[Picture Upload] Upload failed', error);
            }
            showToast.error(error.message || 'toast.pictureUploadFailed');
        },
    });
};


