import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { Camera } from 'lucide-react';

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (blob: Blob) => void;
}

const JPEG_QUALITY = 0.9;

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureDialogProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setError(null);
      stopStream();
      return;
    }

    let cancelled = false;
    setError(null);

    const startCamera = async () => {
      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints: MediaStreamConstraints = {
          video: isMobile ? { facingMode: 'user' } : { width: 1280, height: 720 },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (cancelled) return;
        const e = err as Error;
        const name = (e as { name?: string }).name;
        const text = (e.message || '').toLowerCase();
        if (
          name === 'NotAllowedError' ||
          name === 'PermissionDeniedError' ||
          text.includes('permission') ||
          text.includes('not allowed')
        ) {
          setError(
            t('imageCapture.cameraAccessDenied') ||
              'Camera permission is required. Please allow camera access.'
          );
        } else if (
          name === 'NotFoundError' ||
          text.includes('no camera') ||
          text.includes('not found')
        ) {
          setError(
            t('imageCapture.noCameraFound') ||
              'No camera found on this device.'
          );
        } else if (
          name === 'NotReadableError' ||
          text.includes('in use') ||
          text.includes('could not start')
        ) {
          setError(
            t('imageCapture.cameraInUse') ||
              'Camera is already in use. Close other apps and try again.'
          );
        } else {
          setError(
            t('imageCapture.cameraError') ||
              `Failed to start camera: ${e.message || 'Unknown error'}`
          );
        }
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream, t]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || !video.videoWidth) return;
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsCapturing(false);
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          setIsCapturing(false);
          if (blob) {
            stopStream();
            onCapture(blob);
            onOpenChange(false);
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    } catch {
      setIsCapturing(false);
    }
  }, [onCapture, onOpenChange, stopStream]);

  const handleClose = useCallback(() => {
    stopStream();
    onOpenChange(false);
  }, [onOpenChange, stopStream]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-lg"
        aria-describedby={error ? 'camera-capture-error' : undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {t('imageCapture.takePhoto') || 'Take photo'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error ? (
            <div
              id="camera-capture-error"
              className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center"
              role="alert"
            >
              <Camera className="mb-2 h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('imageCapture.cameraHint') ||
                  'Use "Select Picture" to choose a file instead.'}
              </p>
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover [transform:scaleX(-1)]"
                aria-label={t('imageCapture.cameraPreview') || 'Camera preview'}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          {!error && (
            <Button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing}
              aria-label={t('imageCapture.capturePhoto') || 'Capture photo'}
            >
              {isCapturing
                ? t('events.uploading') || 'Capturing...'
                : t('imageCapture.capturePhoto') || 'Capture'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
