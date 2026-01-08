/**
 * Hook for route-based tour triggering
 * 
 * Automatically triggers tours when user visits a route that has assigned tours.
 * Only triggers if no tour is currently running and tour hasn't been dismissed.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTour } from '@/onboarding';
import { userToursApi } from '@/lib/api/userTours';
import { useAuth } from './useAuth';
import { isTourDismissed } from '@/onboarding/dismissedTours';
import { hasActiveTourState, clearActiveTourState } from '@/onboarding/sessionStorage';

// Cache for route tours (to prevent constant API calls)
const routeToursCache = new Map<string, { tours: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to automatically trigger tours for the current route
 */
export function useRouteTours() {
  const location = useLocation();
  const { startTour, state } = useTour();
  const { user } = useAuth();
  const lastCheckedRouteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // CRITICAL: Prevent checking the same route multiple times in quick succession
    // This prevents constant API calls when component re-renders
    if (lastCheckedRouteRef.current === location.pathname) {
      return;
    }

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

        // CRITICAL: Check cache first to prevent constant API calls
        const cacheKey = location.pathname;
        const cached = routeToursCache.get(cacheKey);
        const now = Date.now();
        
        let tours: any[] = [];
        
        // Use cached data if available and fresh
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          tours = cached.tours;
          if (import.meta.env.DEV) {
            console.log('[useRouteTours] Using cached tours for route:', location.pathname);
          }
        } else {
          // Get tours assigned for this route
          // Gracefully handle database errors - if table doesn't exist, just skip
          try {
            tours = await userToursApi.toursForRoute(location.pathname);
            // Cache the result
            routeToursCache.set(cacheKey, { tours, timestamp: now });
            
            // Clean up old cache entries (keep only last 50 routes)
            if (routeToursCache.size > 50) {
              const firstKey = routeToursCache.keys().next().value;
              routeToursCache.delete(firstKey);
            }
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
    const timeout = setTimeout(() => {
      checkAndTriggerTours();
      // Mark this route as checked
      lastCheckedRouteRef.current = location.pathname;
    }, 200);
    
    return () => {
      clearTimeout(timeout);
      // Reset the ref when route changes (allows checking new routes)
      if (lastCheckedRouteRef.current !== location.pathname) {
        lastCheckedRouteRef.current = null;
      }
    };
  }, [location.pathname, user, startTour, state.isRunning, state.activeTourId]);
}

