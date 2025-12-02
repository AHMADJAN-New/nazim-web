import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

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
            const formData = new FormData();
            formData.append('file', file);

            // Don't set Content-Type header - browser will set it automatically with boundary for FormData
            const response = await apiClient.post(`/students/${studentId}/picture`, formData);

            // Invalidate student queries to refresh the data
            void queryClient.invalidateQueries({ queryKey: ['students'] });

            // Return picture URL and path
            const pictureUrl = `/api/students/${studentId}/picture`;
            return {
                pictureUrl,
                picturePath: response.picture_path,
            };
        },
        onSuccess: () => {
            toast.success('Picture uploaded successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to upload picture');
        },
    });
};


