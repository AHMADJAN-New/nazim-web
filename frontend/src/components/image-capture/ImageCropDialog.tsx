import React, { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { getCroppedImg } from '@/lib/imageCrop';
import { showToast } from '@/lib/toast';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const CROP_QUALITY = 0.9;

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  aspectRatio?: number;
  maxSizeBytes?: number;
  onCropComplete: (croppedFile: File) => void;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  aspectRatio = 1,
  maxSizeBytes = MAX_FILE_SIZE_BYTES,
  onCropComplete,
}: ImageCropDialogProps) {
  const { t } = useLanguage();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open]);

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
    },
    []
  );

  const handleDone = useCallback(async () => {
    if (!imageUrl || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels, CROP_QUALITY);
      if (blob.size > maxSizeBytes) {
        showToast.error(
          t('imageCapture.fileTooLarge') ||
            `Image exceeds maximum size of ${Math.round(maxSizeBytes / (1024 * 1024))}MB. Please crop to a smaller area or use a lower resolution image.`
        );
        setIsProcessing(false);
        return;
      }
      const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
      onCropComplete(file);
      onOpenChange(false);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[ImageCropDialog] getCroppedImg failed:', err);
      }
      showToast.error(
        t('imageCapture.cropFailed') || 'Failed to crop image. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, croppedAreaPixels, maxSizeBytes, onCropComplete, onOpenChange, t]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('imageCapture.cropImage') || 'Crop image'}
          </DialogTitle>
          <DialogDescription>
            {t('imageCapture.cropDescription') || 'Adjust the crop area, then click Done.'}
          </DialogDescription>
        </DialogHeader>
        {imageUrl && (
          <div className="relative h-[min(60vh,400px)] w-full rounded-lg bg-muted">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropCompleteCallback}
              style={{
                containerStyle: { borderRadius: 8 },
                cropAreaStyle: { borderRadius: 8 },
              }}
            />
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={handleDone}
            disabled={!croppedAreaPixels || isProcessing}
            aria-label={t('imageCapture.done') || 'Done'}
          >
            {isProcessing
              ? t('events.uploading') || 'Processing...'
              : t('imageCapture.done') || 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
