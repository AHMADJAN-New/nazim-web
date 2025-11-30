import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useStudentPictureUpload } from '@/hooks/useStudentPictureUpload';
import { supabase } from '@/integrations/supabase/client';

interface StudentPictureUploadProps {
    studentId?: string;
    organizationId?: string;
    schoolId?: string | null;
    currentFileName?: string | null; // file name stored in students.picture_path
    onFileSelected?: (file: File | null) => void; // Callback for create mode
    allowUploadWithoutStudent?: boolean; // Allow file selection even without studentId (for create mode)
}

export function StudentPictureUpload({
    studentId,
    organizationId,
    schoolId,
    currentFileName,
    onFileSelected,
    allowUploadWithoutStudent = false,
}: StudentPictureUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const upload = useStudentPictureUpload();

    // Reset preview URL when student changes (to show existing image instead of selected file preview)
    useEffect(() => {
        if (currentFileName && studentId && organizationId) {
            setPreviewUrl(null);
            setImageError(false);
        }
    }, [currentFileName, studentId, organizationId]);

    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Fetch signed URL for existing image (bucket is private)
    useEffect(() => {
        if (currentFileName && studentId && organizationId && !previewUrl) {
            const schoolPath = schoolId ? `${schoolId}/` : '';
            const path = `${organizationId}/${schoolPath}${studentId}/picture/${currentFileName}`;
            
            supabase.storage
                .from('student-files')
                .createSignedUrl(path, 3600)
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error creating signed URL:', error);
                        setImageError(true);
                        setImageUrl(null);
                    } else if (data) {
                        setImageUrl(data.signedUrl);
                        setImageError(false);
                    }
                });
        } else {
            setImageUrl(null);
        }
    }, [currentFileName, studentId, organizationId, schoolId, previewUrl]);

    const resolvedPreview = useMemo(() => {
        // If user selected a new file, show that preview
        if (previewUrl) return previewUrl;
        // Otherwise, show existing image from storage (signed URL)
        if (imageUrl && !imageError) {
            return imageUrl;
        }
        return null;
    }, [previewUrl, imageUrl, imageError]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setFile(f);
        if (f) {
            const reader = new FileReader();
            reader.onload = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreviewUrl(null);
        }
        // Notify parent component about file selection (for create mode)
        onFileSelected?.(f);
    };

    const onUpload = async () => {
        if (!file || !studentId || !organizationId) return;
        try {
            const result = await upload.mutateAsync({ file, studentId, organizationId, schoolId });
            setFile(null);
            setPreviewUrl(null); // Clear preview so it shows the uploaded image
            setImageError(false);
            
            // Use the signed URL returned from the upload hook immediately
            if (result?.signedUrl) {
                setImageUrl(result.signedUrl);
            }
            
            // Clear the file input
            const input = document.getElementById('student-picture-input') as HTMLInputElement;
            if (input) input.value = '';
            // The query invalidation in the hook will trigger a refetch and update currentFileName
        } catch (error) {
            console.error('Failed to upload picture:', error);
            // Error is handled by the mutation's onError
        }
    };

    // For create mode: allow file selection but disable upload until student is created
    // For edit mode: require studentId to upload
    const canUpload = allowUploadWithoutStudent ? (!!file && !!organizationId) : (!!file && !!studentId && !!organizationId);
    const disabled = !canUpload || upload.isPending;

    return (
        <div className="flex items-start gap-4">
            <div
                className="w-[150px] h-[150px] border rounded flex items-center justify-center bg-muted overflow-hidden"
                aria-label="Student picture preview"
            >
                {resolvedPreview ? (
                    <img
                        src={resolvedPreview}
                        alt="Student"
                        className="object-cover w-full h-full"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                    />
                ) : (
                    <span className="text-xs text-muted-foreground">No Image</span>
                )}
            </div>
            <div className="space-y-2">
                <div>
                    <Label htmlFor="student-picture-input">Select Picture</Label>
                    <input
                        id="student-picture-input"
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                        className="block text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={onUpload} disabled={disabled}>
                        {upload.isPending ? 'Uploading...' : 'Upload Picture'}
                    </Button>
                    {file ? <span className="text-xs text-muted-foreground">{file.name}</span> : null}
                </div>
            </div>
        </div>
    );
}

export default StudentPictureUpload;


