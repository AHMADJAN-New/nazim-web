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
import { hasActiveTourState, clearActiveTourState } from '@/onboarding/sessionStorage';

/**
 * Hook to automatically trigger tours for the current route
 */
export function useRouteTours() {
  const location = useLocation();
  const { startTour, state } = useTour();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Don't trigger if a tour is actually running
    // Check if the active tour is dismissed - if so, it's stale state
    if (state.isRunning || state.activeTourId) {
      // Check if the active tour is dismissed - if so, it's stale state
      // isTourDismissed is already imported at the top
      if (state.activeTourId && isTourDismissed(state.activeTourId)) {
        // Stale state - tour is dismissed but marked as running
        if (import.meta.env.DEV) {
          console.log('[useRouteTours] Stale state detected - tour dismissed but marked as running:', state.activeTourId);
        }
        // Don't return - allow tour to start (the stale state will be cleaned up)
      } else {
        if (import.meta.env.DEV) {
          console.log('[useRouteTours] Skipping - tour already running:', state.activeTourId);
        }
        return;
      }
    }

    // Also check sessionStorage for active tour
    // But verify it's actually running - if not, clear stale state
    if (hasActiveTourState()) {
      // Check if tour is actually running
      if (state.isRunning || state.activeTourId) {
        if (import.meta.env.DEV) {
          console.log('[useRouteTours] Skipping - active tour in sessionStorage and state');
        }
        return;
      }
      
      // Stale state - clear it and continue
      if (import.meta.env.DEV) {
        console.log('[useRouteTours] Clearing stale sessionStorage state');
      }
      clearActiveTourState();
      
      // Also clean up any orphaned elements
      const allElements = document.querySelectorAll('.shepherd-element, .shepherd-modal-overlay-container');
      if (allElements.length > 0) {
        allElements.forEach((el) => el.remove());
        document.body.classList.remove('shepherd-active');
        document.documentElement.classList.remove('shepherd-active');
      }
    }

    const checkAndTriggerTours = async () => {
      try {
        // Double-check tour is still not running before making API call
        if (state.isRunning || state.activeTourId) {
          return;
        }

        // Get tours assigned for this route
        // Gracefully handle database errors - if table doesn't exist, just skip
        let tours: any[] = [];
        try {
          tours = await userToursApi.toursForRoute(location.pathname);
        } catch (error: any) {
          // If it's a database error (table doesn't exist), just log and continue
          // The tour can still start via auto-start or manual trigger
          if (error?.message?.includes('does not exist') || error?.message?.includes('Undefined table')) {
            if (import.meta.env.DEV) {
              console.warn('[useRouteTours] Database table not found - tours will use localStorage fallback:', error.message);
            }
            // Return early - don't prevent tour from starting via other means
            return;
          }
          // For other errors, log but don't prevent tour from starting
          if (import.meta.env.DEV) {
            console.warn('[useRouteTours] Failed to check route tours:', error);
          }
          return;
        }
        
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
        // Catch-all for any unexpected errors - don't prevent tour from starting
        if (import.meta.env.DEV) {
          console.warn('[useRouteTours] Unexpected error:', error);
        }
      }
    };

    // Check for tours after a short delay (to allow page to render)
    const timeout = setTimeout(checkAndTriggerTours, 200);
    
    return () => clearTimeout(timeout);
  }, [location.pathname, user, startTour, state.isRunning, state.activeTourId]);
}

