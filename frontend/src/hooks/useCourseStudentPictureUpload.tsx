import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { apiClient } from '@/lib/api/client';

export interface UploadCourseStudentPictureArgs {
    courseStudentId: string;
    organizationId: string;
    schoolId?: string | null;
    file: File;
}

export const useCourseStudentPictureUpload = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ courseStudentId, organizationId, schoolId, file }: UploadCourseStudentPictureArgs) => {
            // DEBUG: Log picture upload
            if (import.meta.env.DEV) {
                console.log('[Course Student Picture Upload] Starting upload', {
                    courseStudentId,
                    organizationId,
                    schoolId,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                });
            }

            const formData = new FormData();
            formData.append('file', file);

            // Don't set Content-Type header - browser will set it automatically with boundary for FormData
            const endpoint = `/course-students/${courseStudentId}/picture`;
            
            if (import.meta.env.DEV) {
                console.log('[Course Student Picture Upload] Calling API endpoint:', endpoint);
            }
            
            let response;
            try {
                response = await apiClient.post(endpoint, formData);
                
                if (import.meta.env.DEV) {
                    console.log('[Course Student Picture Upload] API call successful, response:', response);
                }
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.error('[Course Student Picture Upload] API call failed:', error);
                    console.error('[Course Student Picture Upload] Error details:', {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                }
                throw error;
            }

            // DEBUG: Log success
            if (import.meta.env.DEV) {
                console.log('[Course Student Picture Upload] Upload successful', {
                    courseStudentId,
                    picturePath: response.picture_path,
                });
            }

            // Return picture URL and path
            const pictureUrl = `/api/course-students/${courseStudentId}/picture`;
            return {
                pictureUrl,
                picturePath: response.picture_path,
            };
        },
        onSuccess: async (data, variables) => {
            showToast.success('toast.pictureUploaded');
            // Invalidate and refetch course student queries to refresh the data immediately
            await queryClient.invalidateQueries({ queryKey: ['course-students'] });
            await queryClient.refetchQueries({ queryKey: ['course-students'] });
            // Also invalidate the specific student query if it exists
            await queryClient.invalidateQueries({ queryKey: ['course-student', variables.courseStudentId] });
        },
        onError: (error: Error) => {
            // DEBUG: Log error
            if (import.meta.env.DEV) {
                console.error('[Course Student Picture Upload] Upload failed', error);
            }
            showToast.error(error.message || 'toast.pictureUploadFailed');
        },
    });
};

