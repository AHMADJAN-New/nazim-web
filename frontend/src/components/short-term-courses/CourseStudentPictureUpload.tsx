import React, { useEffect, useMemo, useState, useRef } from 'react';

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

    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

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

            // Set file and preview
            setFile(f);
            const reader = new FileReader();
            reader.onload = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(f);

            // Notify parent component about file selection (for create mode)
            onFileSelected?.(f);

            // Auto-upload if we have all required data
            if (courseStudentId && organizationId) {
                if (import.meta.env.DEV) {
                    console.log('[CourseStudentPictureUpload] Auto-uploading selected file');
                }
                await handleAutoUpload(f);
            }
        } else {
            setFile(null);
            setPreviewUrl(null);
            onFileSelected?.(null);
        }
    };

    const handleAutoUpload = async (selectedFile: File) => {
        if (!courseStudentId || !organizationId) {
            if (import.meta.env.DEV) {
                console.warn('[CourseStudentPictureUpload] Cannot auto-upload - missing required data');
            }
            return;
        }

        try {
            if (import.meta.env.DEV) {
                console.log('[CourseStudentPictureUpload] Starting auto-upload...');
            }

            const result = await upload.mutateAsync({
                file: selectedFile,
                courseStudentId,
                organizationId,
                schoolId
            });

            if (import.meta.env.DEV) {
                console.log('[CourseStudentPictureUpload] Auto-upload successful:', result);
            }

            // Clear the file input after successful upload
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setFile(null);
            setPreviewUrl(null);

            // Fetch and display the uploaded image
            await fetchUploadedImage();

        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('[CourseStudentPictureUpload] Auto-upload failed:', error);
            }
            // Error is handled by the mutation's onError
        }
    };

    const fetchUploadedImage = async () => {
        try {
            const { apiClient } = await import('@/lib/api/client');
            const token = apiClient.getToken();
            const url = `/api/course-students/${courseStudentId}/picture?t=${Date.now()}`;

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


    // Button is enabled if we have a courseStudentId (edit mode) or allowUploadWithoutStudent (create mode)
    // Button opens file dialog, upload happens automatically on file selection
    const canSelectFile = allowUploadWithoutStudent ? !!organizationId : !!courseStudentId && !!organizationId;
    const disabled = !canSelectFile || upload.isPending;

    // Debug: Log button state
    if (import.meta.env.DEV) {
        console.log('[CourseStudentPictureUpload] Button state:', {
            canSelectFile,
            disabled,
            hasFile: !!file,
            courseStudentId,
            organizationId,
            schoolId,
            allowUploadWithoutStudent,
            isPending: upload.isPending,
        });
    }

    const handleUploadClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Prevent form submission
        e.preventDefault();
        e.stopPropagation();

        if (import.meta.env.DEV) {
            console.log('[CourseStudentPictureUpload] Upload button clicked - opening file dialog');
        }

        // Trigger file input click to open file dialog
        if (fileInputRef.current) {
            fileInputRef.current.click();
        } else {
            if (import.meta.env.DEV) {
                console.error('[CourseStudentPictureUpload] File input ref not available');
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
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    style={{ display: 'none' }}
                />

                {/* Upload button that triggers file dialog */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'contents' }}>
                        <button
                            type="button"
                            onClick={handleUploadClick}
                            disabled={disabled}
                            className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            form="" // Explicitly detach from any form
                        >
                            {upload.isPending ? (t('common.uploading') || 'Uploading...') : (t('students.selectPicture') || 'Select Picture')}
                        </button>
                    </div>
                    {upload.isPending && (
                        <span className="text-xs text-muted-foreground">Uploading...</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CourseStudentPictureUpload;

