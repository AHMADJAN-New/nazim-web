import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
            // Build path: {organization_id}/{school_id}/{student_id}/picture/{filename}
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const schoolPath = schoolId ? `${schoolId}/` : '';
            const filePath = `${organizationId}/${schoolPath}${studentId}/picture/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('student-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            // Update student record with picture_path (store just fileName to keep path logic centralized)
            const { error: updateError } = await (supabase as any)
                .from('students')
                .update({ picture_path: fileName })
                .eq('id', studentId);

            if (updateError) {
                throw new Error(updateError.message);
            }

            // Get signed URL for the uploaded file (bucket is private)
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('student-files')
                .createSignedUrl(filePath, 3600);

            if (signedUrlError) {
                console.error('Error creating signed URL after upload:', signedUrlError);
            }

            // Invalidate student queries to refresh the data
            void queryClient.invalidateQueries({ queryKey: ['students'] });

            // Return signed URL and fileName for immediate use
            return {
                signedUrl: signedUrlData?.signedUrl || null,
                fileName,
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


