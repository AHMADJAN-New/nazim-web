import { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Keyboard,
  X,
  Check,
  AlertCircle,
  Minus,
  Plus,
  RefreshCw,
  Users,
  ArrowLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { eventsApi, eventCheckinApi } from '@/lib/api/client';
import type { CheckinResponse } from '@/types/events';
import { GUEST_TYPE_LABELS } from '@/types/events';
import { Html5Qrcode } from 'html5-qrcode';

// If you already have a cn helper, use it. Otherwise remove cn usage and keep simple className strings.
import { cn } from '@/lib/utils';

interface CheckinScreenProps {
  eventId: string;
  onBack?: () => void;
}

type ScanMode = 'camera' | 'manual';
type CheckinState = 'idle' | 'preview' | 'success' | 'error';

export function CheckinScreen({ eventId, onBack }: CheckinScreenProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<ScanMode>('manual');
  const [manualCode, setManualCode] = useState('');
  const [state, setState] = useState<CheckinState>('idle');
  const [previewGuest, setPreviewGuest] = useState<{
    id: string;
    guest_code: string;
    full_name: string;
    guest_type: string;
    invite_count: number;
    arrived_count: number;
    remaining: number;
    status: string;
    photo_url?: string | null;
  } | null>(null);
  const [previewGuestPhotoUrl, setPreviewGuestPhotoUrl] = useState<string | null>(null);
  const [arrivedIncrement, setArrivedIncrement] = useState(1);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  // Scanner refs/state
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Camera support on mount - be more permissive, let the actual start attempt determine support
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSupport = () => {
      // Check for basic MediaDevices API support
      // On mobile, even if getUserMedia isn't directly available, facingMode constraints might work
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasLegacyGetUserMedia = !!(
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia
      );

      // If we have either modern or legacy API, assume support (actual check happens in startScanner)
      const supported = hasMediaDevices || hasLegacyGetUserMedia;
      
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] Camera support check on mount', {
          hasMediaDevices,
          hasLegacyGetUserMedia,
          supported,
          userAgent: navigator.userAgent,
        });
      }
      
      setCameraSupported(supported);
    };
    checkSupport();
  }, []);

  // Fetch event details with auto-refresh (every 10 seconds for real-time updates)
  const { data: event, refetch: refetchEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId),
    refetchInterval: 10000, // Refresh every 10 seconds for real-time check-in updates
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true, // Refresh when network reconnects
  });

  const playSound = useCallback(
    (type: 'success' | 'error') => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioCtx) return;

        const audioContext = new AudioCtx();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'success') {
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.3;
          oscillator.start();
          setTimeout(() => (oscillator.frequency.value = 1000), 100);
          setTimeout(() => oscillator.stop(), 200);
        } else {
          oscillator.frequency.value = 300;
          oscillator.type = 'square';
          gainNode.gain.value = 0.2;
          oscillator.start();
          setTimeout(() => oscillator.stop(), 300);
        }
      } catch {
        // no-op
      }
    },
    [soundEnabled]
  );

  const resetState = useCallback(() => {
    if (previewGuestPhotoUrl) URL.revokeObjectURL(previewGuestPhotoUrl);
    setState('idle');
    setPreviewGuest(null);
    setPreviewGuestPhotoUrl(null);
    setArrivedIncrement(1);
    setManualCode('');
    setLastResult(null);
    inputRef.current?.focus();
  }, [previewGuestPhotoUrl]);

  useEffect(() => {
    return () => {
      if (previewGuestPhotoUrl) URL.revokeObjectURL(previewGuestPhotoUrl);
    };
  }, [previewGuestPhotoUrl]);

  // --- MUTATIONS -------------------------------------------------------------

  const lookupMutation = useMutation({
    mutationFn: (code: string) => {
      const isQRToken = code.length > 20 && /^[A-Za-z0-9+/=]+$/.test(code);
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] lookupMutation: Starting lookup', {
          codeLength: code.length,
          isQRToken,
          code: isQRToken ? code.substring(0, 20) + '...' : code,
        });
      }
      if (isQRToken) {
        return eventCheckinApi.lookup(eventId, { qr_token: code });
      }
      return eventCheckinApi.lookup(eventId, { guest_code: code.toUpperCase() });
    },
    onSuccess: async (response) => {
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] lookupMutation: Success', {
          found: response.found,
          hasGuest: !!response.guest,
          guestId: response.guest?.id,
          guestCode: response.guest?.guest_code,
        });
      }
      if (response.found && response.guest) {
        // Calculate remaining from invite_count and arrived_count
        const remaining = (response.guest.invite_count || 0) - (response.guest.arrived_count || 0);
        setPreviewGuest({
          id: response.guest.id,
          guest_code: response.guest.guest_code,
          full_name: response.guest.full_name,
          guest_type: response.guest.guest_type,
          invite_count: response.guest.invite_count,
          arrived_count: response.guest.arrived_count,
          remaining,
          status: response.guest.status,
          photo_url: response.guest.photo_url,
        });
        setArrivedIncrement(Math.min(1, Math.max(0, remaining)));
        
        // Stop scanner and switch to manual mode when showing preview to avoid black screen
        if (mode === 'camera' && isScanning) {
          await stopScanner();
          setMode('manual');
        }
        
        setState('preview');

        if (response.guest.id) {
          try {
            const { apiClient } = await import('@/lib/api/client');
            const token = apiClient.getToken();
            const url = `/api/guests/${response.guest.id}/photo`;

            const photoResponse = await fetch(url, {
              method: 'GET',
              headers: {
                Accept: 'image/*',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              credentials: 'include',
            });

            if (photoResponse.ok) {
              const blob = await photoResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              setPreviewGuestPhotoUrl(blobUrl);
            }
          } catch (error) {
            if (import.meta.env.DEV) console.error('Error fetching guest photo:', error);
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('[CheckinScreen] lookupMutation: Guest not found', { error: response.error });
        }
        playSound('error');
        setLastResult({ success: false, message: response.error || 'Guest not found' });
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        console.error('[CheckinScreen] lookupMutation: Error', {
          message: error.message,
          error,
        });
      }
      playSound('error');
      setLastResult({ success: false, message: error.message || 'Lookup failed' });
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    },
  });

  const checkinMutation = useMutation({
    mutationFn: () =>
      eventCheckinApi.checkin(eventId, {
        guest_code: previewGuest?.guest_code,
        arrived_increment: arrivedIncrement,
      }),
    onSuccess: async (response) => {
      if (response.success) {
        playSound('success');
        setLastResult({
          success: true,
          message: `${response.guest?.full_name} - ${arrivedIncrement} checked in`,
        });
        setState('success');
        
        // Immediately refetch event data and guests list to show updated counts
        await queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        await queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
        await queryClient.refetchQueries({ queryKey: ['event', eventId] });
        await queryClient.refetchQueries({ queryKey: ['event-guests', eventId] });

        setTimeout(() => resetState(), 2000);
      } else {
        playSound('error');
        setLastResult({ success: false, message: response.error || 'Check-in failed' });
        setState('error');
        setTimeout(() => setState('preview'), 3000);
      }
    },
    onError: (error: Error) => {
      playSound('error');
      setLastResult({ success: false, message: error.message || 'Check-in failed' });
      setState('error');
      setTimeout(() => setState('preview'), 3000);
    },
  });

  // --- SCANNER ---------------------------------------------------------------

  const isCameraSupportedFn = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const getUserMedia =
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;
      return !!getUserMedia;
    }
    return true;
  }, []);

  const stopScanner = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('[CheckinScreen] stopScanner called', { hasScanner: !!qrScannerRef.current, isScanning });
    }

    const scanner = qrScannerRef.current;
    if (!scanner) {
      setIsScanning(false);
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] stopScanner: No scanner instance to stop');
      }
      return;
    }

    try {
      // stop() can throw if already stopped
      await scanner.stop();
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] stopScanner: Scanner stopped successfully');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[CheckinScreen] stopScanner: Error stopping scanner (may already be stopped):', error);
      }
      // ignore - scanner may already be stopped
    }

    try {
      await scanner.clear();
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] stopScanner: Scanner cleared successfully');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[CheckinScreen] stopScanner: Error clearing scanner (may already be cleared):', error);
      }
      // ignore - scanner may already be cleared
    }

    qrScannerRef.current = null;
    setIsScanning(false);
    
    if (import.meta.env.DEV) {
      console.log('[CheckinScreen] stopScanner: Complete - scanner ref cleared, isScanning set to false');
    }
    
    // DO NOT manipulate container visibility here - it's controlled by mode === 'camera'
  }, []);

  const handleQRScan = useCallback(
    (scannedText: string) => {
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] handleQRScan: QR code scanned', { 
          textLength: scannedText.length, 
          isQRToken: scannedText.length > 20 
        });
      }

      // Stop immediately to prevent multiple scans
      stopScanner();

      if (scannedText.length > 20) {
        if (import.meta.env.DEV) {
          console.log('[CheckinScreen] handleQRScan: Treating as QR token, calling lookupMutation');
        }
        lookupMutation.mutate(scannedText);
      } else {
        if (import.meta.env.DEV) {
          console.log('[CheckinScreen] handleQRScan: Treating as guest code, calling lookupMutation');
        }
        lookupMutation.mutate(scannedText.toUpperCase());
      }
    },
    [stopScanner, lookupMutation]
  );

  const startScanner = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('[CheckinScreen] startScanner called', {
        isScanning,
        hasContainer: !!scannerContainerRef.current,
        containerId: scannerContainerRef.current?.id,
        mode,
        isSecureContext: window.isSecureContext,
        protocol: location.protocol,
        hostname: location.hostname,
      });
    }

    // HARD REQUIREMENT 1: Secure context check (required for iOS/phones)
    // Allow HTTPS protocol or localhost/127.0.0.1 for development
    // Also allow local network IPs when using HTTPS (for testing on phones)
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(location.hostname);
    const isHTTPS = location.protocol === 'https:';
    const isSecure = window.isSecureContext || isHTTPS || isLocalhost;

    if (!isSecure && !isLocalhost) {
      if (import.meta.env.DEV) {
        console.error('[CheckinScreen] startScanner: Not secure context', {
          hostname: location.hostname,
          protocol: location.protocol,
          isSecureContext: window.isSecureContext,
          isHTTPS,
          isLocalhost,
          isLocalNetwork,
        });
      }
      setLastResult({
        success: false,
        message: 'Camera requires HTTPS. Open the site via https:// (or use localhost during development).',
      });
      setState('error');
      setTimeout(() => {
        setState('idle');
        setMode('manual');
      }, 5000);
      return;
    }

    // HARD REQUIREMENT 2: Container must exist (should always be true since it's always mounted)
    if (!scannerContainerRef.current) {
      if (import.meta.env.DEV) {
        console.error('[CheckinScreen] startScanner: Container ref is null!');
      }
      setLastResult({ success: false, message: 'Scanner container not ready. Please try again.' });
      setState('error');
      setTimeout(() => {
        setState('idle');
        setMode('manual');
      }, 3000);
      return;
    }

    // Check if container is actually visible in DOM
    const container = scannerContainerRef.current;
    const isVisible = container.offsetParent !== null && !container.classList.contains('hidden');
    if (import.meta.env.DEV) {
      console.log('[CheckinScreen] startScanner: Container visibility check', {
        offsetParent: !!container.offsetParent,
        hasHiddenClass: container.classList.contains('hidden'),
        display: window.getComputedStyle(container).display,
        isVisible,
      });
    }

    if (!isVisible) {
      if (import.meta.env.DEV) {
        console.warn('[CheckinScreen] startScanner: Container is not visible! Waiting for visibility...');
      }
      // Wait a bit for DOM to update after flushSync
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Check again
      const stillNotVisible = scannerContainerRef.current?.offsetParent === null || 
                              scannerContainerRef.current?.classList.contains('hidden');
      if (stillNotVisible) {
        if (import.meta.env.DEV) {
          console.error('[CheckinScreen] startScanner: Container still not visible after wait!', {
            offsetParent: !!scannerContainerRef.current?.offsetParent,
            hasHiddenClass: scannerContainerRef.current?.classList.contains('hidden'),
            mode,
          });
        }
        setLastResult({ success: false, message: 'Scanner container not visible. Please try again.' });
        setState('error');
        setTimeout(() => {
          setState('idle');
          setMode('manual');
        }, 3000);
        return;
      }
    }

    // HARD REQUIREMENT 3: Camera API support check
    const cameraSupported = isCameraSupportedFn();
    if (import.meta.env.DEV) {
      console.log('[CheckinScreen] startScanner: Camera API support check', { cameraSupported });
    }
    if (!cameraSupported) {
      setIsScanning(false);
      setLastResult({
        success: false,
        message:
          'Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
      });
      setState('error');
      setTimeout(() => {
        setState('idle');
        setMode('manual');
      }, 5000);
      return;
    }

    // HARD REQUIREMENT 4: Prevent double start
    if (isScanning) {
      if (import.meta.env.DEV) {
        console.warn('[CheckinScreen] startScanner: Scanner already running, ignoring duplicate start');
      }
      return;
    }

    // HARD REQUIREMENT 5: Stop any previous instance first (deterministic cleanup)
    if (import.meta.env.DEV) {
      console.log('[CheckinScreen] startScanner: Stopping any previous scanner instance');
    }
    await stopScanner();

    try {
      const containerId = scannerContainerRef.current.id;
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] startScanner: Creating Html5Qrcode instance', { containerId });
      }
      
      const scanner = new Html5Qrcode(containerId);
      qrScannerRef.current = scanner;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] startScanner: Device detection', { isMobile, userAgent: navigator.userAgent });
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // On mobile: try environment (rear) camera first, fallback to user (front) camera
      if (isMobile) {
        if (import.meta.env.DEV) {
          console.log('[CheckinScreen] startScanner: Mobile device - trying environment (rear) camera');
        }
        try {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (import.meta.env.DEV) {
                console.log('[CheckinScreen] startScanner: QR code decoded successfully', { decodedText });
              }
              handleQRScan(decodedText);
            },
            (errorMessage) => {
              // Only log significant errors, not frequent scanning errors
              if (import.meta.env.DEV && (
                errorMessage.includes('NotAllowedError') || 
                errorMessage.includes('NotFoundError') ||
                errorMessage.includes('NotReadableError')
              )) {
                console.warn('[CheckinScreen] startScanner: Scanner error callback', { errorMessage });
              }
            }
          );
          setIsScanning(true);
          if (import.meta.env.DEV) {
            console.log('[CheckinScreen] startScanner: Successfully started with environment camera');
          }
          return;
        } catch (envError: any) {
          if (import.meta.env.DEV) {
            console.warn('[CheckinScreen] startScanner: Environment camera failed, trying user (front) camera', {
              error: envError?.message || envError,
              errorName: envError?.name,
            });
          }
          // Fallback to user (front) camera if environment fails
          try {
            await scanner.start(
              { facingMode: 'user' },
              config,
              (decodedText) => {
                if (import.meta.env.DEV) {
                  console.log('[CheckinScreen] startScanner: QR code decoded successfully (user camera)', { decodedText });
                }
                handleQRScan(decodedText);
              },
              (errorMessage) => {
                if (import.meta.env.DEV && (
                  errorMessage.includes('NotAllowedError') || 
                  errorMessage.includes('NotFoundError') ||
                  errorMessage.includes('NotReadableError')
                )) {
                  console.warn('[CheckinScreen] startScanner: Scanner error callback (user camera)', { errorMessage });
                }
              }
            );
            setIsScanning(true);
            if (import.meta.env.DEV) {
              console.log('[CheckinScreen] startScanner: Successfully started with user camera');
            }
            return;
          } catch (userError: any) {
            if (import.meta.env.DEV) {
              console.error('[CheckinScreen] startScanner: Both camera modes failed', {
                envError: envError?.message || envError,
                userError: userError?.message || userError,
              });
            }
            // Both failed, throw the original error
            throw envError;
          }
        }
      }

      // On desktop: try to enumerate cameras, fallback to facingMode if needed
      if (import.meta.env.DEV) {
        console.log('[CheckinScreen] startScanner: Desktop device - enumerating cameras');
      }
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (import.meta.env.DEV) {
          console.log('[CheckinScreen] startScanner: Cameras enumerated', { count: cameras?.length, cameras: cameras?.map(c => ({ id: c.id, label: c.label })) });
        }
        if (!cameras || cameras.length === 0) {
          if (import.meta.env.DEV) {
            console.log('[CheckinScreen] startScanner: No cameras found, trying facingMode');
          }
          // No cameras found, try facingMode
          await scanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (import.meta.env.DEV) {
                console.log('[CheckinScreen] startScanner: QR code decoded successfully (facingMode)', { decodedText });
              }
              handleQRScan(decodedText);
            },
            (errorMessage) => {
              if (import.meta.env.DEV && (
                errorMessage.includes('NotAllowedError') || 
                errorMessage.includes('NotFoundError') ||
                errorMessage.includes('NotReadableError')
              )) {
                console.warn('[CheckinScreen] startScanner: Scanner error callback (facingMode)', { errorMessage });
              }
            }
          );
          setIsScanning(true);
          if (import.meta.env.DEV) {
            console.log('[CheckinScreen] startScanner: Successfully started with facingMode');
          }
          return;
        }

        // Find rear/back camera, fallback to first available
        const backCamera = cameras.find((c) =>
          (c.label || '').toLowerCase().match(/back|rear|environment/)
        );
        const cameraId = backCamera?.id || cameras[0].id;
        if (import.meta.env.DEV) {
          console.log('[CheckinScreen] startScanner: Selected camera', { 
            cameraId, 
            label: backCamera?.label || cameras[0].label,
            isBackCamera: !!backCamera,
          });
        }

        await scanner.start(
          cameraId,
          config,
          (decodedText) => {
            if (import.meta.env.DEV) {
              console.log('[CheckinScreen] startScanner: QR code decoded successfully (camera ID)', { decodedText });
            }
            handleQRScan(decodedText);
          },
          (errorMessage) => {
            if (import.meta.env.DEV && (
              errorMessage.includes('NotAllowedError') || 
              errorMessage.includes('NotFoundError') ||
              errorMessage.includes('NotReadableError')
            )) {
              console.warn('[CheckinScreen] startScanner: Scanner error callback (camera ID)', { errorMessage });
            }
          }
        );
        setIsScanning(true);
        if (import.meta.env.DEV) {
          console.log('[CheckinScreen] startScanner: Successfully started with camera ID');
        }
      } catch (enumError: any) {
        if (import.meta.env.DEV) {
          console.warn('[CheckinScreen] startScanner: Camera enumeration failed, trying facingMode fallback', {
            error: enumError?.message || enumError,
            errorName: enumError?.name,
          });
        }
        // Enumeration failed, try facingMode fallback
        try {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (import.meta.env.DEV) {
                console.log('[CheckinScreen] startScanner: QR code decoded successfully (facingMode fallback)', { decodedText });
              }
              handleQRScan(decodedText);
            },
            (errorMessage) => {
              if (import.meta.env.DEV && (
                errorMessage.includes('NotAllowedError') || 
                errorMessage.includes('NotFoundError') ||
                errorMessage.includes('NotReadableError')
              )) {
                console.warn('[CheckinScreen] startScanner: Scanner error callback (facingMode fallback)', { errorMessage });
              }
            }
          );
          setIsScanning(true);
          if (import.meta.env.DEV) {
            console.log('[CheckinScreen] startScanner: Successfully started with facingMode fallback');
          }
        } catch (facingModeError: any) {
          // If facingMode also fails, it might be a "no camera" error - throw it to be handled by outer catch
          if (import.meta.env.DEV) {
            console.error('[CheckinScreen] startScanner: facingMode fallback also failed', {
              error: facingModeError?.message || facingModeError,
              errorName: facingModeError?.name,
            });
          }
          throw facingModeError;
        }
      }
    } catch (error: any) {
      // Cleanup on error
      if (import.meta.env.DEV) {
        console.error('[CheckinScreen] startScanner: Error starting scanner', {
          error: error?.message || error,
          errorName: error?.name,
          errorStack: error?.stack,
          fullError: error,
        });
      }
      
      setIsScanning(false);
      qrScannerRef.current = null;

      const errorText = error?.message || error?.toString?.() || '';
      const errorName = error?.name || '';
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // Parse error types
      const isPermissionError =
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorText.includes('NotAllowedError') ||
        errorText.includes('PermissionDeniedError') ||
        errorText.toLowerCase().includes('permission denied') ||
        errorText.toLowerCase().includes('not allowed');

      const isNotFoundError =
        errorName === 'NotFoundError' ||
        errorName === 'DevicesNotFoundError' ||
        errorText.includes('NotFoundError') ||
        errorText.includes('DevicesNotFoundError') ||
        errorText.toLowerCase().includes('no camera') ||
        errorText.toLowerCase().includes('no device');

      const isInUseError =
        errorName === 'NotReadableError' ||
        errorName === 'TrackStartError' ||
        errorText.includes('NotReadableError') ||
        errorText.includes('TrackStartError') ||
        errorText.toLowerCase().includes('already in use') ||
        errorText.toLowerCase().includes('could not start');

      // Build error message with helpful hints
      let message = 'Failed to start camera. Please check your browser settings and try again.';
      
      if (isPermissionError) {
        message = 'Camera permission is required. Please allow camera access and try again.';
        if (isMobile) {
          message += ' If you opened this inside an in-app browser, open in Safari/Chrome directly.';
        }
      } else if (isNotFoundError) {
        message = 'No camera found on this device. Please use a device with a camera or switch to manual entry.';
      } else if (isInUseError) {
        message = 'Camera is already in use. Close other apps using it and try again.';
      } else if (errorText && errorText.length < 200) {
        // Check if error indicates no camera
        if (errorText.toLowerCase().includes('no camera') || 
            errorText.toLowerCase().includes('no device') ||
            errorText.toLowerCase().includes('devicesnotfound')) {
          message = 'No camera found on this device. Please use a device with a camera or switch to manual entry.';
        } else {
          message = `Failed to start camera: ${errorText}`;
          if (isMobile) {
            message += ' If you opened this inside an in-app browser, open in Safari/Chrome directly.';
          }
        }
      } else if (isMobile) {
        message += ' If you opened this inside an in-app browser, open in Safari/Chrome directly.';
      }

      setLastResult({ success: false, message });
      setState('error');
      setTimeout(() => {
        setState('idle');
        setMode('manual');
      }, 5000);
    }
  }, [handleQRScan, isCameraSupportedFn, isScanning, stopScanner]);

  // Stop scanner when switching away from camera mode
  useEffect(() => {
    if (mode !== 'camera') {
      stopScanner();
    }
  }, [mode, stopScanner]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Auto-focus input in manual mode
  useEffect(() => {
    if (mode === 'manual' && state === 'idle') {
      inputRef.current?.focus();
    }
  }, [mode, state]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    lookupMutation.mutate(manualCode.trim().toUpperCase());
  };

  const handleConfirmCheckin = () => {
    if (!previewGuest) return;
    checkinMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  navigate(-1);
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Check-in</h1>
              {event && <p className="text-sm text-muted-foreground line-clamp-1">{event.title}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await refetchEvent();
                await queryClient.invalidateQueries({ queryKey: ['event', eventId] });
                await queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
                await queryClient.invalidateQueries({ queryKey: ['event-stats', eventId] });
                await queryClient.invalidateQueries({ queryKey: ['event-guest'] });
                await queryClient.refetchQueries({ queryKey: ['event', eventId] });
                await queryClient.refetchQueries({ queryKey: ['event-guests', eventId] });
              }}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {event && (
          <div className="flex items-center justify-center gap-6 mt-3 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{event.total_arrived || 0}</div>
              <div className="text-xs text-muted-foreground">Arrived</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{event.total_invited || 0}</div>
              <div className="text-xs text-muted-foreground">Invited</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {(event.total_invited || 0) - (event.total_arrived || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* IMPORTANT: Scanner container is ALWAYS mounted so the ref is never null on phones.
            We only show it when mode === 'camera'. */}
        <div
          id={`qr-reader-${eventId}`}
          ref={(el) => {
            scannerContainerRef.current = el;
            if (import.meta.env.DEV && el) {
              console.log('[CheckinScreen] Scanner container ref callback', {
                id: el.id,
                mode,
                isVisible: el.offsetParent !== null && !el.classList.contains('hidden'),
                hasHiddenClass: el.classList.contains('hidden'),
                display: window.getComputedStyle(el).display,
                offsetParent: !!el.offsetParent,
              });
            }
          }}
          className={cn(
            'w-full max-w-md rounded-lg overflow-hidden bg-black transition-all',
            mode === 'camera' && state !== 'preview' ? 'block' : 'hidden'
          )}
          style={{ minHeight: '320px', position: 'relative' }}
        />

        {/* Idle State */}
        {state === 'idle' && (
          <div className="w-full max-w-md space-y-6">
            {/* Mode Tabs */}
            <div className="flex bg-muted p-1 rounded-lg">
              <Button
                variant={mode === 'manual' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={async () => {
                  setMode('manual');
                  await stopScanner();
                }}
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Manual
              </Button>

              <Button
                variant={mode === 'camera' ? 'default' : 'ghost'}
                className="flex-1"
                // Don't disable button - let startScanner handle the error and show message
                // This allows phones to attempt camera access even if initial check was false
                disabled={false}
                onClick={async (e) => {
                  e.preventDefault();

                  if (mode === 'camera') {
                    setMode('manual');
                    await stopScanner();
                    return;
                  }

                  // CRITICAL: Use flushSync to ensure mode change renders BEFORE starting scanner
                  // This ensures the container is visible when Html5Qrcode initializes (required for mobile)
                  if (import.meta.env.DEV) {
                    console.log('[CheckinScreen] Scan QR button clicked - switching to camera mode');
                  }
                  
                  flushSync(() => {
                    setMode('camera');
                  });

                  if (import.meta.env.DEV) {
                    console.log('[CheckinScreen] Mode changed to camera, container should now be visible');
                    // Verify container is visible
                    setTimeout(() => {
                      const container = scannerContainerRef.current;
                      if (container) {
                        console.log('[CheckinScreen] Container state after mode change', {
                          offsetParent: !!container.offsetParent,
                          hasHiddenClass: container.classList.contains('hidden'),
                          display: window.getComputedStyle(container).display,
                          isVisible: container.offsetParent !== null && !container.classList.contains('hidden'),
                        });
                      }
                    }, 50);
                  }

                  // Small delay to ensure DOM has updated after flushSync
                  await new Promise(resolve => setTimeout(resolve, 50));

                  // Start scanner on direct user click (required for iOS)
                  await startScanner();
                }}
                title="Scan QR code with camera"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan QR
              </Button>
            </div>

            {/* Manual Entry */}
            {mode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <Input
                  ref={inputRef}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter guest code"
                  className="h-16 text-2xl text-center font-mono tracking-widest"
                  autoComplete="off"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-lg"
                  disabled={!manualCode.trim() || lookupMutation.isPending}
                >
                  {lookupMutation.isPending ? 'Looking up...' : 'Find Guest'}
                </Button>
              </form>
            )}

            {/* Camera UI */}
            {mode === 'camera' && (
              <div className="space-y-4">
                {!isScanning && (
                  <div className="text-center p-6 bg-muted rounded-lg border-2 border-dashed">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">Camera is ready</p>
                    <p className="text-xs text-muted-foreground mb-4">Tap below to request camera access</p>
                    <Button
                      onClick={async (e) => {
                        e.preventDefault();
                        await startScanner();
                      }}
                      size="lg"
                      className="w-full"
                      disabled={false}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Request Camera Access
                    </Button>
                  </div>
                )}

                {isScanning && (
                  <>
                    <p className="text-sm text-center text-muted-foreground">Point camera at QR code to scan</p>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={async () => {
                        setMode('manual');
                        await stopScanner();
                      }}
                    >
                      <Keyboard className="h-4 w-4 mr-2" />
                      Switch to Manual Entry
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Last Result */}
            {lastResult && (
              <div
                className={cn(
                  'text-center p-3 rounded-lg',
                  lastResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                )}
              >
                {lastResult.message}
              </div>
            )}
          </div>
        )}

        {/* Preview State */}
        {state === 'preview' && previewGuest && (
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              {/* Large Guest Photo */}
              <div className="flex flex-col items-center text-center mb-6">
                {previewGuestPhotoUrl ? (
                  <div className="relative mb-4">
                    <img
                      src={previewGuestPhotoUrl}
                      alt={previewGuest.full_name}
                      className="w-48 h-48 rounded-full object-cover border-4 border-primary shadow-lg"
                    />
                  </div>
                ) : (
                  <Avatar className="h-48 w-48 mb-4 border-4 border-primary shadow-lg">
                    <AvatarFallback className="text-5xl bg-primary/10 text-primary">
                      {getInitials(previewGuest.full_name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <h2 className="text-3xl font-bold mt-2">{previewGuest.full_name}</h2>
                <Badge className="mt-3 text-sm px-3 py-1">{GUEST_TYPE_LABELS[previewGuest.guest_type]}</Badge>
                <p className="text-muted-foreground mt-2 font-mono text-lg">{previewGuest.guest_code}</p>
              </div>

              <div className="flex justify-center gap-6 mb-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{previewGuest.arrived_count}</div>
                  <div className="text-sm text-muted-foreground">Arrived</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{previewGuest.invite_count}</div>
                  <div className="text-sm text-muted-foreground">Invited</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{previewGuest.remaining}</div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </div>
              </div>

              {previewGuest.status === 'blocked' && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">This guest is blocked</span>
                </div>
              )}

              {previewGuest.remaining > 0 && previewGuest.status !== 'blocked' && (
                <>
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setArrivedIncrement(Math.max(1, arrivedIncrement - 1))}
                      disabled={arrivedIncrement <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-4xl font-bold w-16 text-center">{arrivedIncrement}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setArrivedIncrement(Math.min(previewGuest.remaining, arrivedIncrement + 1))
                      }
                      disabled={arrivedIncrement >= previewGuest.remaining}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    How many people are checking in?
                  </p>
                </>
              )}

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={resetState}>
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </Button>

                {previewGuest.remaining > 0 && previewGuest.status !== 'blocked' && (
                  <Button
                    size="lg"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleConfirmCheckin}
                    disabled={checkinMutation.isPending}
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {checkinMutation.isPending ? 'Processing...' : 'Check In'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {state === 'success' && previewGuest && (
          <div className="text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Check className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-green-600">Checked In!</h2>
            <p className="text-lg mt-2">{previewGuest.full_name}</p>
            <p className="text-muted-foreground">+{arrivedIncrement} guest(s)</p>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-red-600">Error</h2>
            <p className="text-muted-foreground mt-2">{lastResult?.message}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-muted/80 backdrop-blur border-t px-4 py-2">
        <Button variant="ghost" className="w-full" onClick={() => navigate(`/events/${eventId}/guests`)}>
          <Users className="h-4 w-4 mr-2" />
          View All Guests
        </Button>
      </div>
    </div>
  );
}
