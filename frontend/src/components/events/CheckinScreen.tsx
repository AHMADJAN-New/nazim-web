import { useState, useRef, useEffect, useCallback } from 'react';
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
import { toast } from 'sonner';
import { eventsApi, eventCheckinApi } from '@/lib/api/client';
import type { Event, CheckinResponse } from '@/types/events';
import { GUEST_TYPE_LABELS } from '@/types/events';

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
  const [previewGuest, setPreviewGuest] = useState<CheckinResponse['guest'] | null>(null);
  const [arrivedIncrement, setArrivedIncrement] = useState(1);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const successSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);

  // Fetch event details
  const { data: event, refetch: refetchEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Lookup mutation
  const lookupMutation = useMutation({
    mutationFn: (code: string) => eventCheckinApi.lookup(eventId, { guest_code: code }),
    onSuccess: (response) => {
      if (response.found && response.guest) {
        setPreviewGuest(response.guest);
        setArrivedIncrement(Math.min(1, response.guest.remaining || 1));
        setState('preview');
      } else {
        playSound('error');
        setLastResult({ success: false, message: 'Guest not found' });
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    },
    onError: (error: Error) => {
      playSound('error');
      setLastResult({ success: false, message: error.message || 'Lookup failed' });
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    },
  });

  // Checkin mutation
  const checkinMutation = useMutation({
    mutationFn: () => eventCheckinApi.checkin(eventId, {
      guest_code: previewGuest?.guest_code,
      arrived_increment: arrivedIncrement,
    }),
    onSuccess: (response) => {
      if (response.success) {
        playSound('success');
        setLastResult({
          success: true,
          message: `${response.guest?.full_name} - ${arrivedIncrement} checked in`,
        });
        setState('success');
        queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        // Reset after 2 seconds
        setTimeout(() => {
          resetState();
        }, 2000);
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

  const playSound = useCallback((type: 'success' | 'error') => {
    if (!soundEnabled) return;
    // Use Web Audio API for instant feedback
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'success') {
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
          oscillator.frequency.value = 1000;
        }, 100);
        setTimeout(() => {
          oscillator.stop();
        }, 200);
      } else {
        oscillator.frequency.value = 300;
        oscillator.type = 'square';
        gainNode.gain.value = 0.2;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
        }, 300);
      }
    } catch (e) {
      // Fallback: no sound
    }
  }, [soundEnabled]);

  const resetState = useCallback(() => {
    setState('idle');
    setPreviewGuest(null);
    setArrivedIncrement(1);
    setManualCode('');
    setLastResult(null);
    inputRef.current?.focus();
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    lookupMutation.mutate(manualCode.trim().toUpperCase());
  };

  const handleConfirmCheckin = () => {
    if (!previewGuest) return;
    checkinMutation.mutate();
  };

  // Auto-focus input
  useEffect(() => {
    if (mode === 'manual' && state === 'idle') {
      inputRef.current?.focus();
    }
  }, [mode, state]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
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
            <Button variant="ghost" size="icon" onClick={() => onBack?.() || navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Check-in</h1>
              {event && (
                <p className="text-sm text-muted-foreground line-clamp-1">{event.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchEvent()}
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
        {/* Idle State - Input Form */}
        {state === 'idle' && (
          <div className="w-full max-w-md space-y-6">
            {/* Mode Tabs */}
            <div className="flex bg-muted p-1 rounded-lg">
              <Button
                variant={mode === 'manual' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => setMode('manual')}
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Manual
              </Button>
              <Button
                variant={mode === 'camera' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => setMode('camera')}
                disabled // Camera mode would need QR scanning library
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

            {/* Last Result */}
            {lastResult && (
              <div className={`text-center p-3 rounded-lg ${
                lastResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {lastResult.message}
              </div>
            )}
          </div>
        )}

        {/* Preview State - Confirm Check-in */}
        {state === 'preview' && previewGuest && (
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={previewGuest.photo_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(previewGuest.full_name)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-semibold">{previewGuest.full_name}</h2>
                <Badge className="mt-2">{GUEST_TYPE_LABELS[previewGuest.guest_type]}</Badge>
                <p className="text-muted-foreground mt-1 font-mono">{previewGuest.guest_code}</p>
              </div>

              {/* Invite Stats */}
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

              {/* Blocked Warning */}
              {previewGuest.status === 'blocked' && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">This guest is blocked</span>
                </div>
              )}

              {/* Increment Selector */}
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
                      onClick={() => setArrivedIncrement(Math.min(previewGuest.remaining, arrivedIncrement + 1))}
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

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={resetState}
                >
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

      {/* Quick Stats Footer */}
      <div className="sticky bottom-0 bg-muted/80 backdrop-blur border-t px-4 py-2">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate(`/events/${eventId}/guests`)}
        >
          <Users className="h-4 w-4 mr-2" />
          View All Guests
        </Button>
      </div>
    </div>
  );
}
