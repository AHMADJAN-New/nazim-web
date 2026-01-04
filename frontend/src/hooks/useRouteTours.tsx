/**
 * Hook for route-based tour triggering
 * 
 * Automatically triggers tours when user visits a route that has assigned tours.
 * Only triggers if no tour is currently running and tour hasn't been dismissed.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTour } from '@/onboarding';
import { userToursApi } from '@/lib/api/userTours';
import { useAuth } from './useAuth';
import { isTourDismissed } from '@/onboarding/dismissedTours';

/**
 * Hook to automatically trigger tours for the current route
 */
export function useRouteTours() {
  const location = useLocation();
  const { startTour, state } = useTour();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Don't trigger if a tour is already running - check both state and active tour state
    if (state.isRunning || state.activeTourId) {
      if (import.meta.env.DEV) {
        console.log('[useRouteTours] Skipping - tour already running:', state.activeTourId);
      }
      return;
    }

    // Also check sessionStorage for active tour
    try {
      const { hasActiveTourState } = require('@/onboarding/sessionStorage');
      if (hasActiveTourState && hasActiveTourState()) {
        if (import.meta.env.DEV) {
          console.log('[useRouteTours] Skipping - active tour in sessionStorage');
        }
        return;
      }
    } catch (error) {
      // Ignore if module not available
    }

    const checkAndTriggerTours = async () => {
      try {
        // Double-check tour is still not running before making API call
        if (state.isRunning || state.activeTourId) {
          return;
        }

        // Get tours assigned for this route
        const tours = await userToursApi.toursForRoute(location.pathname);
        
        // Filter to only incomplete and non-dismissed tours
        const eligibleTours = tours.filter(t => {
          if (t.is_completed) return false;
          if (isTourDismissed(t.tour_id)) return false;
          return true;
        });
        
        if (eligibleTours.length > 0) {
          // Final check before starting
          if (state.isRunning || state.activeTourId) {
            if (import.meta.env.DEV) {
              console.log('[useRouteTours] Skipping - tour started during API call');
            }
            return;
          }

          // Trigger the first eligible tour
          const tourToStart = eligibleTours[0];
          
          // Small delay to ensure page is rendered
          setTimeout(() => {
            // Final check before starting tour
            if (!state.isRunning && !state.activeTourId) {
              startTour(tourToStart.tour_id, tourToStart.last_step_id || undefined);
            }
          }, 300);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[useRouteTours] Failed to check route tours:', error);
        }
      }
    };

    // Check for tours after a short delay (to allow page to render)
    const timeout = setTimeout(checkAndTriggerTours, 200);
    
    return () => clearTimeout(timeout);
  }, [location.pathname, user, startTour, state.isRunning, state.activeTourId]);
}

