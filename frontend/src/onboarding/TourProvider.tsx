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
  
  // Restore tour state after navigation (if tour was active)
  useEffect(() => {
    if (!runnerRef.current || !hasActiveTourState()) return;
    
    const activeState = getActiveTourState();
    if (!activeState) return;
    
    // Check if tour is already running
    if (runnerRef.current.getIsRunning()) {
      if (import.meta.env.DEV) {
        console.log('[TourProvider] Skipping restore - tour already running');
      }
      return;
    }
    
    // Restore tour from saved state
    const restoreTour = async () => {
      // Reduced wait time - just enough for page to render
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Double-check tour is still not running (might have been started by route handler)
      if (runnerRef.current && !runnerRef.current.getIsRunning() && activeState) {
        // Resume tour from the saved step
        await runnerRef.current.start(activeState.tourId, activeState.stepId);
      }
    };
    
    restoreTour();
  }, [location.pathname]); // Restore when route changes
  
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
    
    // Wait for profile to load (if profile is null, wait a bit more)
    const checkAndStart = () => {
      const context = createTourContext();
      const eligible = getEligibleTours(context);
      
      if (import.meta.env.DEV) {
        console.log('[TourProvider] Auto-start check:', {
          autoStart,
          toursCount: tours.length,
          eligibleCount: eligible.length,
          eligibleTours: eligible.map(t => t.id),
          profile: profile ? 'loaded' : 'null',
          has_completed_onboarding: profile?.has_completed_onboarding,
        });
      }
      
      if (eligible.length > 0) {
        // Delay to allow app to render and profile to load
        setTimeout(() => {
          if (runnerRef.current && !runnerRef.current.getIsRunning()) {
            if (import.meta.env.DEV) {
              console.log('[TourProvider] Starting tour:', eligible[0].id);
            }
            runnerRef.current.start(eligible[0].id);
          } else if (import.meta.env.DEV) {
            console.log('[TourProvider] Skipping start - tour already running');
          }
        }, 1500);
      } else if (import.meta.env.DEV) {
        console.log('[TourProvider] No eligible tours found');
      }
    };
    
    // Always check and start (profile can be null, which is fine for eligibility check)
    // Wait a bit to ensure everything is loaded
    const timeout = setTimeout(checkAndStart, profile === null ? 2000 : 1000);
    return () => clearTimeout(timeout);
  }, [autoStart, tours, profile, createTourContext]);
  
  // Start a tour
  const startTour = useCallback(async (tourId: string, fromStep?: string): Promise<void> => {
    if (!runnerRef.current) return;
    await runnerRef.current.start(tourId, fromStep);
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
 */
export function useTour(): TourProviderContextValue {
  const context = useContext(TourProviderContext);
  
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
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

