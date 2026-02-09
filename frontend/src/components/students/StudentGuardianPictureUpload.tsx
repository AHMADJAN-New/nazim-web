import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { CameraCaptureDialog, ImageCropDialog } from '@/components/image-capture';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudentGuardianPictureUpload } from '@/hooks/useStudentGuardianPictureUpload';
import { Camera } from 'lucide-react';

interface StudentGuardianPictureUploadProps {
  studentId?: string;
  organizationId?: string;
  schoolId?: string | null;
  currentGuardianPicturePath?: string | null;
  onFileSelected?: (file: File | null) => void;
  allowUploadWithoutStudent?: boolean;
}

export function StudentGuardianPictureUpload({
  studentId,
  organizationId,
  schoolId,
  currentGuardianPicturePath,
  onFileSelected,
  allowUploadWithoutStudent = false,
}: StudentGuardianPictureUploadProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingCropImageUrl, setPendingCropImageUrl] = useState<string | null>(null);
  const upload = useStudentGuardianPictureUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentGuardianPicturePath && studentId && organizationId) {
      setPreviewUrl(null);
      setImageError(false);
    }
  }, [currentGuardianPicturePath, studentId, organizationId]);

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const hasPicture =
      currentGuardianPicturePath &&
      currentGuardianPicturePath.trim() !== '' &&
      studentId &&
      !previewUrl;

    if (hasPicture) {
      let currentBlobUrl: string | null = null;

      const fetchImage = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const token = apiClient.getToken();
          const url = `/api/students/${studentId}/guardian-picture`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'image/*',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });

          if (!response.ok) {
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
          if (
            import.meta.env.DEV &&
            error instanceof Error &&
            !error.message.includes('404')
          ) {
            console.error('Failed to fetch guardian picture:', error);
          }
          if (error instanceof Error && error.message.includes('404')) {
            setImageUrl(null);
            setImageError(false);
          } else {
            setImageError(true);
          }
        }
      };

      fetchImage();

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
      setImageError(false);
    }
  }, [studentId, currentGuardianPicturePath, previewUrl]);

  const resolvedPreview = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (imageUrl && !imageError) return imageUrl;
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
        showToast.error(
          `File size exceeds maximum allowed size of 5MB. Selected file is ${fileSizeMB}MB.`
        );
        setFile(null);
        setPreviewUrl(null);
        onFileSelected?.(null);
        return;
      }
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedTypes.includes(f.type)) {
        const { showToast } = await import('@/lib/toast');
        showToast.error(
          'The file must be an image (jpg, jpeg, png, gif, or webp).'
        );
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
      await upload.mutateAsync({
        file: fileToUpload,
        studentId,
        organizationId,
        schoolId,
      });
      setFile(null);
      setPreviewUrl(null);
      setImageError(false);

      const fetchImage = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const token = apiClient.getToken();
          const url = `/api/students/${studentId}/guardian-picture?t=${Date.now()}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'image/*',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });

          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
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
            console.error('Failed to fetch uploaded guardian picture:', error);
          }
          setImageError(true);
        }
      };

      await fetchImage();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to auto-upload guardian picture:', error);
      }
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
      if (
        pendingCropImageUrl &&
        pendingCropImageUrl.startsWith('blob:')
      ) {
        URL.revokeObjectURL(pendingCropImageUrl);
      }
      setPendingCropImageUrl(null);
      setCropDialogOpen(false);
      void applyCroppedFile(croppedFile);
    },
    [pendingCropImageUrl, applyCroppedFile]
  );

  const handleCropDialogOpenChange = useCallback(
    (open: boolean) => {
      setCropDialogOpen(open);
      if (
        !open &&
        pendingCropImageUrl &&
        pendingCropImageUrl.startsWith('blob:')
      ) {
        URL.revokeObjectURL(pendingCropImageUrl);
        setPendingCropImageUrl(null);
      }
    },
    [pendingCropImageUrl]
  );

  const canSelect = allowUploadWithoutStudent
    ? !!organizationId
    : !!studentId && !!organizationId;
  const disabled = !canSelect || upload.isPending;

  const guardianPhotoLabel =
    t('students.guardianPhoto') || t('students.guardianPicturePath') || 'Guardian Photo';

  return (
    <div className="flex items-start gap-4">
      <div
        className="w-[150px] h-[150px] border rounded flex items-center justify-center bg-muted overflow-hidden"
        aria-label={guardianPhotoLabel}
      >
        {resolvedPreview ? (
          <img
            src={resolvedPreview}
            alt={guardianPhotoLabel}
            className="object-cover w-full h-full"
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {t('students.noImage') || 'No Image'}
          </span>
        )}
      </div>
      <div className="space-y-2 flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture
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
              ? t('events.uploading') || 'Uploading...'
              : t('students.selectPicture') || 'Select Picture'}
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
            <span className="hidden sm:inline">
              {t('imageCapture.takePhoto') || 'Take photo'}
            </span>
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
        {upload.isPending && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('events.uploading') || 'Uploading...'}
          </p>
        )}
        {file && !upload.isPending && !studentId && (
          <p className="text-xs text-muted-foreground mt-1">
            {file.name}{' '}
            {t('students.willBeUploadedOnSave') || '(will be uploaded on save)'}
          </p>
        )}
      </div>
    </div>
  );
}

export default StudentGuardianPictureUpload;
