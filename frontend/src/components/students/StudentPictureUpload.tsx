import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useStudentPictureUpload } from '@/hooks/useStudentPictureUpload';
import { useLanguage } from '@/hooks/useLanguage';

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
    const { t } = useLanguage();
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

    // Fetch picture with authentication headers and convert to blob URL
    useEffect(() => {
        if (studentId && !previewUrl) {
            let currentBlobUrl: string | null = null;
            
            // Fetch image with authentication headers
            const fetchImage = async () => {
                try {
                    const { apiClient } = await import('@/lib/api/client');
                    // Get the token from apiClient
                    const token = apiClient.getToken();
                    // Use relative URL - Vite proxy will handle it
                    const url = `/api/students/${studentId}/picture`;
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'image/*',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    });
                    
                    if (!response.ok) {
                        // 404 is expected if student has no picture - don't treat as error
                        if (response.status === 404) {
                            setImageUrl(null);
                            setImageError(false);
                            return;
                        }
                        throw new Error(`Failed to fetch image: ${response.status}`);
                    }
                    
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    currentBlobUrl = blobUrl;
                    setImageUrl(blobUrl);
                    setImageError(false);
                } catch (error) {
                    // Only log non-404 errors
                    if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404')) {
                        console.error('Failed to fetch student picture:', error);
                    }
                    // Don't set error state for 404 - it just means no picture exists
                    if (error instanceof Error && error.message.includes('404')) {
                        setImageUrl(null);
                        setImageError(false);
                    } else {
                        setImageError(true);
                    }
                }
            };
            
            fetchImage();
            
            // Cleanup blob URL on unmount or when studentId changes
            return () => {
                if (currentBlobUrl) {
                    URL.revokeObjectURL(currentBlobUrl);
                }
            };
        } else {
            if (imageUrl && imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
            }
            setImageUrl(null);
        }
    }, [studentId, previewUrl]);

    const resolvedPreview = useMemo(() => {
        // If user selected a new file, show that preview
        if (previewUrl) return previewUrl;
        // Otherwise, show existing image from blob URL
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
            await upload.mutateAsync({ file, studentId, organizationId, schoolId });
            setFile(null);
            setPreviewUrl(null); // Clear preview so it shows the uploaded image
            setImageError(false);
            
            // Re-fetch the image as a blob URL after upload
            // This ensures the image displays correctly with authentication
            const fetchImage = async () => {
                try {
                    const { apiClient } = await import('@/lib/api/client');
                    const token = apiClient.getToken();
                    const url = `/api/students/${studentId}/picture?t=${Date.now()}`; // Cache busting
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'image/*',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        // Clean up old blob URL if it exists
                        if (imageUrl && imageUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(imageUrl);
                        }
                        setImageUrl(blobUrl);
                        setImageError(false);
                    } else {
                        setImageUrl(null);
                        setImageError(false);
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('Failed to fetch uploaded picture:', error);
                    }
                    setImageError(true);
                }
            };
            
            await fetchImage();
            
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
                    <span className="text-xs text-muted-foreground">{t('students.noImage') || 'No Image'}</span>
                )}
            </div>
            <div className="space-y-2">
                <div>
                    <Label htmlFor="student-picture-input">{t('students.selectPicture') || 'Select Picture'}</Label>
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
                        {upload.isPending ? (t('common.uploading') || 'Uploading...') : (t('students.uploadPicture') || 'Upload Picture')}
                    </Button>
                    {file ? <span className="text-xs text-muted-foreground">{file.name}</span> : null}
                </div>
            </div>
        </div>
    );
}

export default StudentPictureUpload;


