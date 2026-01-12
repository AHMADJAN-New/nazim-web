import React, { useEffect, useMemo, useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUploadStaffPicture } from '@/hooks/useStaff';
import { useLanguage } from '@/hooks/useLanguage';
import { Camera, User, X } from 'lucide-react';

interface StaffPictureUploadProps {
    staffId?: string;
    currentPictureUrl?: string | null; // picture_url from staff record
    onFileSelected?: (file: File | null) => void; // Callback for create mode
    allowUploadWithoutStaff?: boolean; // Allow file selection even without staffId (for create mode)
}

export function StaffPictureUpload({
    staffId,
    currentPictureUrl,
    onFileSelected,
    allowUploadWithoutStaff = false,
}: StaffPictureUploadProps) {
    const { t } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const upload = useUploadStaffPicture();

    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset preview URL when staff changes (to show existing image instead of selected file preview)
    useEffect(() => {
        if (currentPictureUrl && staffId) {
            setPreviewUrl(null);
            setImageError(false);
        }
    }, [currentPictureUrl, staffId]);

    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Fetch picture with authentication headers and convert to blob URL
    // Only fetch if we have a staffId AND (currentPictureUrl exists OR we just uploaded)
    useEffect(() => {
        // Only fetch if we have a staffId and no local preview, and a known picture URL.
        const hasPictureUrl = currentPictureUrl && currentPictureUrl.trim() !== '';
        const shouldFetch = staffId && !previewUrl && hasPictureUrl;
        
        if (shouldFetch) {
            let currentBlobUrl: string | null = null;
            
            // Fetch image with authentication headers
            const fetchImage = async () => {
                try {
                    const { apiClient } = await import('@/lib/api/client');
                    const token = apiClient.getToken();
                    const url = `/api/staff/${staffId}/picture`;
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'image/*',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    });
                    
                    if (!response.ok) {
                        // 404 is expected if staff has no picture - don't treat as error
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
                        console.error('Failed to fetch staff picture:', error);
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
            
            // Cleanup blob URL on unmount or when staffId changes
            return () => {
                if (currentBlobUrl) {
                    URL.revokeObjectURL(currentBlobUrl);
                }
            };
        } else {
            // No picture URL, clear image URL and show placeholder
            if (imageUrl && imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
            }
            setImageUrl(null);
            setImageError(false); // Not an error - just no picture
        }
    }, [staffId, currentPictureUrl, previewUrl]);

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
            if (staffId) {
                await handleAutoUpload(f);
            }
        } else {
            setFile(null);
            setPreviewUrl(null);
            onFileSelected?.(null);
        }
    };

    const handleAutoUpload = async (selectedFile: File) => {
        if (!staffId) {
            return;
        }

        try {
            await upload.mutateAsync({
                staffId,
                file: selectedFile,
            });

            // Clear the file input after successful upload
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setFile(null);
            setPreviewUrl(null);

            // Fetch and display the uploaded image
            await fetchUploadedImage();

        } catch (error) {
            // Error is handled by the mutation's onError
        }
    };

    const fetchUploadedImage = async () => {
        if (!staffId) return;
        
        try {
            const { apiClient } = await import('@/lib/api/client');
            const token = apiClient.getToken();
            const url = `/api/staff/${staffId}/picture?t=${Date.now()}`;

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

    const handleRemovePicture = () => {
        setFile(null);
        setPreviewUrl(null);
        onFileSelected?.(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Button is enabled if we have a staffId (edit mode) or allowUploadWithoutStaff (create mode)
    const canSelectFile = allowUploadWithoutStaff ? true : !!staffId;
    const disabled = !canSelectFile || upload.isPending;

    const handleUploadClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Prevent form submission
        e.preventDefault();
        e.stopPropagation();

        // Trigger file input click to open file dialog
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="space-y-3">
            <Label>{t('staff.photo') || 'Profile Picture'}</Label>
            <div className="flex items-start gap-4">
                <div
                    className="relative w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden group"
                    aria-label="Staff picture preview"
                >
                    {resolvedPreview ? (
                        <>
                            <img
                                src={resolvedPreview}
                                alt="Staff"
                                className="object-cover w-full h-full"
                                onError={() => setImageError(true)}
                                onLoad={() => setImageError(false)}
                            />
                            {previewUrl && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={handleRemovePicture}
                                        className="h-8 w-8 rounded-full p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <User className="w-12 h-12" />
                            <span className="text-xs">{t('students.noImage') || 'No Image'}</span>
                        </div>
                    )}
                </div>
                <div className="space-y-2 flex-1">
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleUploadClick}
                            disabled={disabled}
                            className="w-full sm:w-auto"
                            form="" // Explicitly detach from any form
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            {upload.isPending 
                                ? (t('events.uploading') || 'Uploading...') 
                                : (t('students.selectPicture') || 'Select Picture')
                            }
                        </Button>
                    </div>
                    {upload.isPending && (
                        <p className="text-xs text-muted-foreground">{t('events.uploading') || 'Uploading...'}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        {t('staff.pictureHelper') || 'Upload a profile picture (max 5MB, jpg, png, gif, webp)'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default StaffPictureUpload;
