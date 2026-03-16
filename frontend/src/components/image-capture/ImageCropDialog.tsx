import React, { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Minus, Plus } from 'lucide-react';

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
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

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

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }, []);

  const canZoomIn = zoom < ZOOM_MAX;
  const canZoomOut = zoom > ZOOM_MIN;

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
          <div className="space-y-3">
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
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleZoomOut}
                disabled={!canZoomOut}
                aria-label={t('imageCapture.zoomOut') || 'Zoom out'}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[3.5rem] text-center text-sm tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleZoomIn}
                disabled={!canZoomIn}
                aria-label={t('imageCapture.zoomIn') || 'Zoom in'}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {t('imageCapture.zoomHint') ||
                'Use the buttons or scroll on the image to zoom.'}
            </p>
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
