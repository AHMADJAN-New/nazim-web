import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCourseStudentPictureUpload } from '@/hooks/useCourseStudentPictureUpload';
import { useLanguage } from '@/hooks/useLanguage';

interface CourseStudentPictureUploadProps {
    courseStudentId?: string;
    organizationId?: string;
    schoolId?: string | null;
    currentFileName?: string | null; // file name stored in course_students.picture_path
    onFileSelected?: (file: File | null) => void; // Callback for create mode
    allowUploadWithoutStudent?: boolean; // Allow file selection even without courseStudentId (for create mode)
}

export function CourseStudentPictureUpload({
    courseStudentId,
    organizationId,
    schoolId,
    currentFileName,
    onFileSelected,
    allowUploadWithoutStudent = false,
}: CourseStudentPictureUploadProps) {
    const { t } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const upload = useCourseStudentPictureUpload();

    // Reset preview URL when student changes (to show existing image instead of selected file preview)
    useEffect(() => {
        if (currentFileName && courseStudentId && organizationId) {
            setPreviewUrl(null);
            setImageError(false);
        }
    }, [currentFileName, courseStudentId, organizationId]);

    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Fetch picture with authentication headers and convert to blob URL
    // Only fetch if we have a courseStudentId AND (currentFileName exists OR we just uploaded)
    useEffect(() => {
        // Only fetch if we have a courseStudentId and no local preview, and a known picture file name.
        const hasFileName = currentFileName && currentFileName.trim() !== '';
        const shouldFetch = courseStudentId && !previewUrl && hasFileName;
        
        if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureUpload] Fetch check:', {
                courseStudentId,
                currentFileName,
                hasFileName,
                shouldFetch,
                previewUrl,
            });
        }
        
        if (shouldFetch) {
            let currentBlobUrl: string | null = null;
            
            // Fetch image with authentication headers
            const fetchImage = async () => {
                try {
                    const { apiClient } = await import('@/lib/api/client');
                    // Get the token from apiClient
                    const token = apiClient.getToken();
                    const version = currentFileName ? `?v=${encodeURIComponent(currentFileName)}` : '';
                    // Use relative URL - Vite proxy will handle it
                    const url = `/api/course-students/${courseStudentId}/picture${version}`;
                    
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
                            if (import.meta.env.DEV) {
                                console.log('[CourseStudentPictureUpload] Picture not found (404) for student:', courseStudentId);
                            }
                            setImageUrl(null);
                            setImageError(false);
                            return;
                        }
                        throw new Error(`Failed to fetch image: ${response.status}`);
                    }
                    
                    const blob = await response.blob();
                    if (import.meta.env.DEV) {
                        console.log('[CourseStudentPictureUpload] Picture fetched successfully:', blob.type, blob.size, 'bytes');
                    }
                    const blobUrl = URL.createObjectURL(blob);
                    currentBlobUrl = blobUrl;
                    setImageUrl(blobUrl);
                    setImageError(false);
                } catch (error) {
                    // Only log non-404 errors
                    if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404')) {
                        console.error('Failed to fetch course student picture:', error);
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
            
            // Cleanup blob URL on unmount or when courseStudentId changes
            return () => {
                if (currentBlobUrl) {
                    URL.revokeObjectURL(currentBlobUrl);
                }
            };
        } else {
            // No picture path, clear image URL and show placeholder
            if (imageUrl && imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
            }
            setImageUrl(null);
            setImageError(false); // Not an error - just no picture
        }
    }, [courseStudentId, currentFileName, previewUrl]);

    const resolvedPreview = useMemo(() => {
        // If user selected a new file, show that preview
        if (previewUrl) return previewUrl;
        // Otherwise, show existing image from blob URL
        if (imageUrl && !imageError) {
            return imageUrl;
        }
        return null;
    }, [previewUrl, imageUrl, imageError]);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        
        if (f) {
            // Validate file size (max 5MB = 5120 KB, matching backend validation)
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
            if (f.size > MAX_FILE_SIZE) {
                const { showToast } = await import('@/lib/toast');
                const fileSizeMB = (f.size / (1024 * 1024)).toFixed(2);
                showToast.error(`File size exceeds maximum allowed size of 5MB. Selected file is ${fileSizeMB}MB.`);
                e.target.value = ''; // Clear the input
                setFile(null);
                setPreviewUrl(null);
                onFileSelected?.(null);
                return;
            }
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(f.type)) {
                const { showToast } = await import('@/lib/toast');
                showToast.error('The file must be an image (jpg, jpeg, png, gif, or webp).');
                e.target.value = ''; // Clear the input
                setFile(null);
                setPreviewUrl(null);
                onFileSelected?.(null);
                return;
            }
        }
        
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
        if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureUpload] onUpload called', {
                hasFile: !!file,
                courseStudentId,
                organizationId,
                schoolId,
                fileName: file?.name,
                fileSize: file?.size,
            });
        }
        
        if (!file || !courseStudentId || !organizationId) {
            if (import.meta.env.DEV) {
                console.warn('[CourseStudentPictureUpload] Cannot upload - missing required data', {
                    hasFile: !!file,
                    courseStudentId,
                    organizationId,
                });
            }
            return;
        }
        
        try {
            if (import.meta.env.DEV) {
                console.log('[CourseStudentPictureUpload] Starting upload mutation...');
            }
            
            const result = await upload.mutateAsync({ file, courseStudentId, organizationId, schoolId });
            
            if (import.meta.env.DEV) {
                console.log('[CourseStudentPictureUpload] Upload successful, result:', result);
            }
            
            setFile(null);
            setPreviewUrl(null); // Clear preview so it shows the uploaded image
            setImageError(false);
            
            // Re-fetch the image as a blob URL after upload
            // This ensures the image displays correctly with authentication
            const fetchImage = async () => {
                try {
                    const { apiClient } = await import('@/lib/api/client');
                    const token = apiClient.getToken();
                    const url = `/api/course-students/${courseStudentId}/picture?t=${Date.now()}`; // Cache busting
                    
                    if (import.meta.env.DEV) {
                        console.log('[CourseStudentPictureUpload] Fetching uploaded picture from:', url);
                    }
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'image/*',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    });
                    
                    if (import.meta.env.DEV) {
                        console.log('[CourseStudentPictureUpload] Fetch response status:', response.status);
                    }
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        // Clean up old blob URL if it exists
                        if (imageUrl && imageUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(imageUrl);
                        }
                        setImageUrl(blobUrl);
                        setImageError(false);
                        
                        if (import.meta.env.DEV) {
                            console.log('[CourseStudentPictureUpload] Picture fetched and displayed');
                        }
                    } else {
                        if (import.meta.env.DEV) {
                            console.warn('[CourseStudentPictureUpload] Failed to fetch uploaded picture, status:', response.status);
                        }
                        setImageUrl(null);
                        setImageError(false);
                    }
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error('[CourseStudentPictureUpload] Failed to fetch uploaded picture:', error);
                    }
                    setImageError(true);
                }
            };
            
            await fetchImage();
            
            // Clear the file input
            const input = document.getElementById('course-student-picture-input') as HTMLInputElement;
            if (input) input.value = '';
            // The query invalidation in the hook will trigger a refetch and update currentFileName
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('[CourseStudentPictureUpload] Upload failed:', error);
            }
            // Error is handled by the mutation's onError
        }
    };

    // For create mode: allow file selection but disable upload until student is created
    // For edit mode: require courseStudentId to upload
    const canUpload = allowUploadWithoutStudent ? (!!file && !!organizationId) : (!!file && !!courseStudentId && !!organizationId);
    const disabled = !canUpload || upload.isPending;

    // Debug: Log button state
    if (import.meta.env.DEV) {
        console.log('[CourseStudentPictureUpload] Button state:', {
            canUpload,
            disabled,
            hasFile: !!file,
            courseStudentId,
            organizationId,
            schoolId,
            allowUploadWithoutStudent,
            isPending: upload.isPending,
        });
    }

    // Add click handler wrapper to ensure it's called
    const handleUploadClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureUpload] Button clicked!', {
                disabled,
                canUpload,
                hasFile: !!file,
                courseStudentId,
                organizationId,
            });
        }
        
        if (!disabled) {
            onUpload();
        } else {
            if (import.meta.env.DEV) {
                console.warn('[CourseStudentPictureUpload] Button click ignored - button is disabled');
            }
        }
    };

    return (
        <div className="flex items-start gap-4">
            <div
                className="w-[150px] h-[150px] border rounded flex items-center justify-center bg-muted overflow-hidden"
                aria-label="Course student picture preview"
            >
                {resolvedPreview ? (
                    <img
                        src={resolvedPreview}
                        alt="Course Student"
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
                    <Label htmlFor="course-student-picture-input">{t('students.selectPicture') || 'Select Picture'}</Label>
                    <input
                        id="course-student-picture-input"
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                        className="block text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={handleUploadClick} disabled={disabled}>
                        {upload.isPending ? (t('common.uploading') || 'Uploading...') : (t('students.uploadPicture') || 'Upload Picture')}
                    </Button>
                    {file ? <span className="text-xs text-muted-foreground">{file.name}</span> : null}
                </div>
            </div>
        </div>
    );
}

export default CourseStudentPictureUpload;

