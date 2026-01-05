/**
 * Onboarding Tour System - Tour Provider
 * 
 * React context provider for the tour system.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { TourContextState, TourProviderContextValue, TourDefinition, TourContext } from './types';
import { TourRunner } from './TourRunner';
import { registerTour, getTour, getEligibleTours, getAllTours } from './TourRegistry';
import { 
  isTourCompleted as localStorageIsTourCompleted, 
  getTourVersion as localStorageGetTourVersion, 
  resetTour as localStorageResetTour 
} from './storage';
import { isTourCompleted, getTourVersion, resetTour } from './storageApi';
import { isRTL, getCurrentLanguage } from './rtl';
import { getActiveTourState, hasActiveTourState } from './sessionStorage';
import { isTourDismissed } from './dismissedTours';

// Import tour styles
import './styles.css';

/**
 * Default context state
 */
const defaultState: TourContextState = {
  activeTourId: null,
  isRunning: false,
  currentStepId: null,
  currentStepIndex: 0,
  totalSteps: 0,
};

/**
 * Context
 */
const TourProviderContext = createContext<TourProviderContextValue | null>(null);

/**
 * Tour Provider Props
 */
interface TourProviderProps {
  children: React.ReactNode;
  /** Tours to register on mount */
  tours?: TourDefinition[];
  /** Auto-start first eligible tour on mount */
  autoStart?: boolean;
  /** User profile data for eligibility checks */
  profile?: {
    has_completed_onboarding?: boolean;
    has_completed_tour?: boolean;
    [key: string]: unknown;
  } | null;
  /** Callback when tour starts */
  onTourStart?: (tourId: string) => void;
  /** Callback when tour completes */
  onTourComplete?: (tourId: string) => void;
  /** Callback when tour is cancelled */
  onTourCancel?: (tourId: string) => void;
}

/**
 * Tour Provider Component
 */
export function TourProvider({
  children,
  tours = [],
  autoStart = false,
  profile = null,
  onTourStart,
  onTourComplete,
  onTourCancel,
}: TourProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [state, setState] = useState<TourContextState>(defaultState);
  const runnerRef = useRef<TourRunner | null>(null);
  const registeredRef = useRef(false);
  const autoStartTimerRef = useRef<number | null>(null);
  const latestStateRef = useRef<TourContextState>(defaultState);
  const hasAutoStartedRef = useRef(false);
  
  // Create tour runner
  useEffect(() => {
    runnerRef.current = new TourRunner({
      navigate,
      onStart: (tourId) => {
        setState((prev) => ({
          ...prev,
          activeTourId: tourId,
          isRunning: true,
        }));
        onTourStart?.(tourId);
      },
      onComplete: (tourId) => {
        setState(defaultState);
        onTourComplete?.(tourId);
      },
      onCancel: (tourId) => {
        setState(defaultState);
        onTourCancel?.(tourId);
      },
      onStepChange: (stepId, stepIndex, totalSteps) => {
        setState((prev) => ({
          ...prev,
          currentStepId: stepId,
          currentStepIndex: stepIndex,
          totalSteps,
        }));
      },
    });
    
    return () => {
      runnerRef.current?.destroy();
      runnerRef.current = null;
    };
  }, [navigate, onTourStart, onTourComplete, onTourCancel]);
  
  // Update navigate function when it changes
  useEffect(() => {
    runnerRef.current?.setNavigate(navigate);
  }, [navigate]);

  // Keep a ref to the latest state to avoid re-running effects just to read state
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);
  
  // Reset stuck tour state on mount (if tour is marked as running but Shepherd tour is null)
  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.resetStuckState();
      // Also check and clean up dismissed tours
      const actuallyRunning = runnerRef.current.getIsRunning();
      if (import.meta.env.DEV && !actuallyRunning) {
        console.log('[TourProvider] Cleaned up stale tour state on mount');
      }
    }
  }, []);
  
  // Restore tour state after navigation (if tour was active)
  useEffect(() => {
    if (!runnerRef.current || !hasActiveTourState()) return;
    
    const activeState = getActiveTourState();
    if (!activeState) return;
    
    // Check if tour is already running (this will clean up dismissed tours)
    const actuallyRunning = runnerRef.current.getIsRunning();
    if (actuallyRunning) {
      if (import.meta.env.DEV) {
        console.log('[TourProvider] Skipping restore - tour already running');
      }
      return;
    }
    
    // Check state as well (double-check)
    // But also check if the active tour is dismissed (stale state)
    if (state.isRunning || state.activeTourId) {
      if (state.activeTourId && isTourDismissed(state.activeTourId)) {
        // Stale state - tour is dismissed but marked as running
        if (import.meta.env.DEV) {
          console.log('[TourProvider] Stale state detected - tour dismissed but marked as running, cleaning up');
        }
        // Don't return - allow restore to proceed (stale state will be cleaned up)
      } else {
        if (import.meta.env.DEV) {
          console.log('[TourProvider] Skipping restore - tour already running in state');
        }
        return;
      }
    }
    
    // Restore tour from saved state
    const restoreTour = async () => {
      // Reduced wait time - just enough for page to render
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Triple-check tour is still not running (might have been started by route handler or auto-start)
      if (runnerRef.current && 
          !runnerRef.current.getIsRunning() && 
          !latestStateRef.current.isRunning && 
          !latestStateRef.current.activeTourId &&
          activeState) {
        // Resume tour from the saved step
        await runnerRef.current.start(activeState.tourId, activeState.stepId);
      } else if (import.meta.env.DEV) {
        console.log('[TourProvider] Skipping restore - tour started during wait');
      }
    };
    
    restoreTour();
  }, [location.pathname]); // Restore when route changes; internal checks use refs
  
  // Create tour context for eligibility checks (must be defined before useEffects that use it)
  const createTourContext = useCallback((): TourContext => ({
    isTourCompleted: (tourId: string) => {
      // Use sync version for eligibility checks (localStorage)
      // CRITICAL: Only check localStorage, not database, for immediate eligibility
      const isCompleted = localStorageIsTourCompleted(tourId);
      
      if (import.meta.env.DEV && tourId === 'initialSetup') {
        console.log('[TourContext] isTourCompleted check:', {
          tourId,
          isCompleted,
          profileHasCompleted: profile?.has_completed_onboarding,
        });
      }
      
      return isCompleted;
    },
    getTourVersion: (tourId: string) => {
      // Use sync version for eligibility checks (localStorage)
      return localStorageGetTourVersion(tourId);
    },
    isAuthenticated: true, // Assume authenticated if provider is rendered
    currentRoute: location.pathname,
    language: getCurrentLanguage(),
    isRTL: isRTL(),
    profile: profile ? {
      hasCompletedOnboarding: profile.has_completed_onboarding,
      onboardingCompletedAt: profile.onboarding_completed_at as string | null | undefined,
    } : undefined,
  }), [location.pathname, profile]);
  
  // Register tours
  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;
    
    tours.forEach((tour) => {
      registerTour(tour);
    });
  }, [tours]);
  
  // Auto-start if enabled (wait for profile to be available)
  useEffect(() => {
    if (!autoStart || tours.length === 0) return;

    // Clear any previous scheduled auto-start (StrictMode / re-renders)
    if (autoStartTimerRef.current) {
      window.clearTimeout(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
    }

    const delayMs = profile === null ? 2000 : 1000;
    autoStartTimerRef.current = window.setTimeout(async () => {
      // Auto-start should run at most once per mount
      if (hasAutoStartedRef.current) return;

      // If a tour is already persisted as active, let the restore effect handle it
      if (hasActiveTourState()) {
        if (import.meta.env.DEV) {
          console.log('[TourProvider] Skipping auto-start - active tour in sessionStorage');
        }
        return;
      }

      const context = createTourContext();
      const eligible = getEligibleTours(context);

      if (import.meta.env.DEV) {
        console.log('[TourProvider] Auto-start check:', {
          autoStart,
          toursCount: tours.length,
          eligibleCount: eligible.length,
          eligibleTours: eligible.map((t) => t.id),
          profile: profile ? 'loaded' : 'null',
          has_completed_onboarding: profile?.has_completed_onboarding,
        });
      }

      if (!runnerRef.current) return;
      const s = latestStateRef.current;
      if (runnerRef.current.getIsRunning() || s.isRunning || s.activeTourId) {
        if (import.meta.env.DEV) {
          console.log('[TourProvider] Skipping auto-start - tour already running');
        }
        return;
      }

      if (eligible.length > 0) {
        if (import.meta.env.DEV) {
          console.log('[TourProvider] Starting tour:', eligible[0].id);
        }
        // Auto-start should respect dismissal (force=false)
        const started = await runnerRef.current.start(eligible[0].id, undefined, { force: false });
        if (started) {
          hasAutoStartedRef.current = true;
        }
      } else if (import.meta.env.DEV) {
        console.log('[TourProvider] No eligible tours found');
      }
    }, delayMs);

    return () => {
      if (autoStartTimerRef.current) {
        window.clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, [autoStart, tours, profile, createTourContext]);
  
  // Start a tour
  // Manual starts (from UI) should work even if tour is dismissed (auto-undismiss)
  const startTour = useCallback(async (tourId: string, fromStep?: string, force: boolean = true): Promise<void> => {
    if (!runnerRef.current) return;
    await runnerRef.current.start(tourId, fromStep, { force });
  }, []);
  
  // Resume a tour
  const resumeTour = useCallback(async (tourId: string): Promise<void> => {
    if (!runnerRef.current) return;
    await runnerRef.current.resume(tourId);
  }, []);
  
  // Stop the current tour
  const stopTour = useCallback((): void => {
    runnerRef.current?.stop();
  }, []);
  
  // Reset tour (async - uses database with localStorage fallback)
  const resetTourAsync = useCallback(async (tourId: string): Promise<void> => {
    await resetTour(tourId);
    localStorageResetTour(tourId); // Also clear localStorage
  }, []);
  
  // Check if tour is completed (sync - uses localStorage for immediate checks)
  const checkTourCompletedSync = useCallback((tourId: string): boolean => {
    return localStorageIsTourCompleted(tourId);
  }, []);
  
  // Get available tours
  const getAvailableTours = useCallback((): TourDefinition[] => {
    const context = createTourContext();
    return getEligibleTours(context);
  }, [createTourContext]);
  
  // Context value
  const contextValue = useMemo<TourProviderContextValue>(() => ({
    state,
    startTour,
    resumeTour,
    stopTour,
    resetTour: resetTourAsync,
    isTourCompleted: checkTourCompletedSync, // Use sync version for context
    getAvailableTours,
  }), [state, startTour, resumeTour, stopTour, resetTourAsync, checkTourCompletedSync, getAvailableTours]);
  
  return (
    <TourProviderContext.Provider value={contextValue}>
      {children}
    </TourProviderContext.Provider>
  );
}

/**
 * Hook to use the tour context
 * Returns a safe default if context is not available (for components that render before provider is ready)
 */
export function useTour(): TourProviderContextValue {
  const context = useContext(TourProviderContext);
  
  if (!context) {
    // Return safe default instead of throwing - allows components to render
    // Tour functionality will be disabled until provider is available
    if (import.meta.env.DEV) {
      console.warn('[useTour] TourProvider context not available - returning safe default');
    }
    
    return {
      state: defaultState,
      startTour: async () => {
        if (import.meta.env.DEV) {
          console.warn('[useTour] startTour called but TourProvider not available');
        }
      },
      resumeTour: async () => {
        if (import.meta.env.DEV) {
          console.warn('[useTour] resumeTour called but TourProvider not available');
        }
      },
      stopTour: () => {
        if (import.meta.env.DEV) {
          console.warn('[useTour] stopTour called but TourProvider not available');
        }
      },
      resetTour: async () => {
        if (import.meta.env.DEV) {
          console.warn('[useTour] resetTour called but TourProvider not available');
        }
      },
      isTourCompleted: () => false,
      getAvailableTours: () => [],
    };
  }
  
  return context;
}

/**
 * Hook to check if a specific tour is completed
 */
export function useTourCompleted(tourId: string): boolean {
  const { isTourCompleted } = useTour();
  return isTourCompleted(tourId);
}

/**
 * Hook to get available tours
 */
export function useAvailableTours(): TourDefinition[] {
  const { getAvailableTours } = useTour();
  return useMemo(() => getAvailableTours(), [getAvailableTours]);
}

/**
 * Hook to get tour state
 */
export function useTourState(): TourContextState {
  const { state } = useTour();
  return state;
}

// Re-export registerTour for manual registration
export { registerTour };

