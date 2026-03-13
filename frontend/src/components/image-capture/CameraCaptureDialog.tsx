import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { Camera, Minus, Plus } from 'lucide-react';

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (blob: Blob) => void;
}

const JPEG_QUALITY = 0.9;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const ZOOM_WHEEL_SENSITIVITY = 0.002;

interface CameraDevice {
  deviceId: string;
  label: string;
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureDialogProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(
    async (deviceId?: string): Promise<boolean> => {
      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : isMobile
              ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        return true;
      } catch (err) {
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
            t('imageCapture.noCameraFound') || 'No camera found on this device.'
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
        return false;
      }
    },
    [t]
  );

  const enumerateCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices
      .filter((d) => d.kind === 'videoinput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || t('imageCapture.cameraLabel') || `Camera ${d.deviceId.slice(0, 8)}`,
      }));
    return videoInputs;
  }, [t]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setZoom(1);
      setCameras([]);
      setSelectedCameraId('');
      stopStream();
      return;
    }

    let cancelled = false;
    setError(null);

    const init = async () => {
      const ok = await startStream();
      if (cancelled || !ok) return;
      const list = await enumerateCameras();
      if (cancelled) return;
      setCameras(list);
      const stream = streamRef.current;
      const deviceId =
        stream?.getVideoTracks()[0]?.getSettings?.()?.deviceId;
      if (list.length > 0) {
        setSelectedCameraId(
          deviceId && list.some((c) => c.deviceId === deviceId)
            ? deviceId
            : list[0].deviceId
        );
      }
    };

    init();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream, startStream, enumerateCameras]);

  const handleCameraChange = useCallback(
    async (deviceId: string) => {
      if (!deviceId || deviceId === selectedCameraId) return;
      setIsSwitchingCamera(true);
      stopStream();
      const ok = await startStream(deviceId);
      setIsSwitchingCamera(false);
      if (ok) setSelectedCameraId(deviceId);
    },
    [selectedCameraId, startStream, stopStream]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const delta = -e.deltaY * ZOOM_WHEEL_SENSITIVITY;
      setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z + delta)));
    },
    []
  );

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

  const canZoomIn = zoom < ZOOM_MAX;
  const canZoomOut = zoom > ZOOM_MIN;
  const showCameraSelect = cameras.length >= 2;

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
            <>
              {showCameraSelect && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="camera-select"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('imageCapture.selectCamera') || 'Camera'}
                  </label>
                  <Select
                    value={selectedCameraId || cameras[0]?.deviceId || ''}
                    onValueChange={handleCameraChange}
                    disabled={isSwitchingCamera}
                  >
                    <SelectTrigger id="camera-select" className="w-full">
                      <SelectValue
                        placeholder={
                          t('imageCapture.selectCamera') || 'Select camera'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map((cam) => (
                        <SelectItem
                          key={cam.deviceId}
                          value={cam.deviceId}
                          className="cursor-pointer"
                        >
                          {cam.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div
                ref={containerRef}
                className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted"
                onWheel={handleWheel}
                style={{ touchAction: 'none' }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover [transform:scaleX(-1)]"
                  style={{
                    transform: `scaleX(-1) scale(${zoom})`,
                  }}
                  aria-label={
                    t('imageCapture.cameraPreview') || 'Camera preview'
                  }
                />
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background/90 px-2 py-1 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleZoomOut}
                    disabled={!canZoomOut}
                    aria-label={t('imageCapture.zoomOut') || 'Zoom out'}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleZoomIn}
                    disabled={!canZoomIn}
                    aria-label={t('imageCapture.zoomIn') || 'Zoom in'}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('imageCapture.zoomHint') ||
                  'Use the buttons or scroll on the preview to zoom.'}
              </p>
            </>
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
              disabled={isCapturing || isSwitchingCamera}
              aria-label={
                t('imageCapture.capturePhoto') || 'Capture photo'
              }
            >
              {isCapturing
                ? t('events.uploading') || 'Capturing...'
                : isSwitchingCamera
                  ? t('imageCapture.switchingCamera') || 'Switching...'
                  : t('imageCapture.capturePhoto') || 'Capture'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
