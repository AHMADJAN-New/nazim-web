import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { CameraCaptureDialog, ImageCropDialog } from '@/components/image-capture';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudentPictureUpload } from '@/hooks/useStudentPictureUpload';
import { Camera } from 'lucide-react';

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
    const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [pendingCropImageUrl, setPendingCropImageUrl] = useState<string | null>(null);
    const upload = useStudentPictureUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset preview URL when student changes (to show existing image instead of selected file preview)
    useEffect(() => {
        if (currentFileName && studentId && organizationId) {
            setPreviewUrl(null);
            setImageError(false);
        }
    }, [currentFileName, studentId, organizationId]);

    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Fetch picture with authentication headers and convert to blob URL
    // Only fetch if studentId exists AND currentFileName exists (student has a picture)
    useEffect(() => {
        // Only fetch if student has a picture path (currentFileName is not null/empty)
        const hasPicture = currentFileName && currentFileName.trim() !== '' && studentId && !previewUrl;
        
        if (hasPicture) {
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
            // No picture path, clear image URL and show placeholder
            if (imageUrl && imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
            }
            setImageUrl(null);
            setImageError(false); // Not an error - just no picture
        }
    }, [studentId, currentFileName, previewUrl]);

    const resolvedPreview = useMemo(() => {
        // If user selected a new file, show that preview
        if (previewUrl) return previewUrl;
        // Otherwise, show existing image from blob URL
        if (imageUrl && !imageError) {
            return imageUrl;
        }
        return null;
    }, [previewUrl, imageUrl, imageError]);

    const applyCroppedFile = async (f: File) => {
        setFile(f);
        const reader = new FileReader();
        reader.onload = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(f);
        if (studentId && organizationId) {
            await handleAutoUpload(f);
        } else {
            onFileSelected?.(f);
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        e.target.value = '';

        if (f) {
            const MAX_FILE_SIZE = 5 * 1024 * 1024;
            if (f.size > MAX_FILE_SIZE) {
                const { showToast } = await import('@/lib/toast');
                const fileSizeMB = (f.size / (1024 * 1024)).toFixed(2);
                showToast.error(`File size exceeds maximum allowed size of 5MB. Selected file is ${fileSizeMB}MB.`);
                setFile(null);
                setPreviewUrl(null);
                onFileSelected?.(null);
                return;
            }
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(f.type)) {
                const { showToast } = await import('@/lib/toast');
                showToast.error('The file must be an image (jpg, jpeg, png, gif, or webp).');
                setFile(null);
                setPreviewUrl(null);
                onFileSelected?.(null);
                return;
            }
            const url = URL.createObjectURL(f);
            setPendingCropImageUrl(url);
            setCropDialogOpen(true);
            return;
        }
        setPreviewUrl(null);
        onFileSelected?.(null);
    };

    const handleAutoUpload = async (fileToUpload: File) => {
        if (!fileToUpload || !studentId || !organizationId) return;
        
        try {
            await upload.mutateAsync({ file: fileToUpload, studentId, organizationId, schoolId });
            setFile(null);
            setPreviewUrl(null); // Clear preview so it shows the uploaded image
            setImageError(false);
            
            // Re-fetch the image as a blob URL after upload
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
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to auto-upload picture:', error);
            }
            // Error is handled by the mutation's onError
            // Still notify parent about file selection even if upload fails
            onFileSelected?.(fileToUpload);
        }
    };

    const handleSelectClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleTakePhotoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setCameraDialogOpen(true);
    };

    const handleCameraCapture = useCallback((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        setPendingCropImageUrl(url);
        setCameraDialogOpen(false);
        setCropDialogOpen(true);
    }, []);

    const handleCropComplete = useCallback(
        (croppedFile: File) => {
            if (pendingCropImageUrl && pendingCropImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(pendingCropImageUrl);
            }
            setPendingCropImageUrl(null);
            setCropDialogOpen(false);
            void applyCroppedFile(croppedFile);
        },
        [pendingCropImageUrl, applyCroppedFile]
    );

    const handleCropDialogOpenChange = useCallback((open: boolean) => {
        setCropDialogOpen(open);
        if (!open && pendingCropImageUrl && pendingCropImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pendingCropImageUrl);
            setPendingCropImageUrl(null);
        }
    }, [pendingCropImageUrl]);

    // Determine if button should be disabled
    // For create mode: allow file selection if organizationId exists
    // For edit mode: allow file selection if studentId and organizationId exist
    const canSelect = allowUploadWithoutStudent ? !!organizationId : (!!studentId && !!organizationId);
    const disabled = !canSelect || upload.isPending;

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
            <div className="space-y-2 flex-1">
                {/* Hidden file input with camera capture support */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture // Enable camera on mobile devices (user can choose camera or gallery)
                    onChange={onFileChange}
                    style={{ display: 'none' }}
                />
                
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSelectClick}
                        disabled={disabled}
                        className="w-full sm:w-auto"
                        form=""
                    >
                        {upload.isPending
                            ? (t('events.uploading') || 'Uploading...')
                            : (t('students.selectPicture') || 'Select Picture')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleTakePhotoClick}
                        disabled={disabled}
                        className="w-full sm:w-auto"
                        form=""
                        aria-label={t('imageCapture.takePhoto') || 'Take photo'}
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t('imageCapture.takePhoto') || 'Take photo'}</span>
                    </Button>
                </div>
                <CameraCaptureDialog
                    open={cameraDialogOpen}
                    onOpenChange={setCameraDialogOpen}
                    onCapture={handleCameraCapture}
                />
                <ImageCropDialog
                    open={cropDialogOpen}
                    onOpenChange={handleCropDialogOpenChange}
                    imageUrl={pendingCropImageUrl}
                    aspectRatio={1}
                    onCropComplete={handleCropComplete}
                />
                {/* Show file name or upload status */}
                {upload.isPending && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('events.uploading') || 'Uploading...'}
                    </p>
                )}
                {file && !upload.isPending && !studentId && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {file.name} {t('students.willBeUploadedOnSave') || '(will be uploaded on save)'}
                    </p>
                )}
            </div>
        </div>
    );
}

export default StudentPictureUpload;


