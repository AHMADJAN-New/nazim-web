/**
 * Onboarding Tour System - Database Storage API
 * 
 * Handles database persistence for tour state via API.
 * Falls back to localStorage if API is unavailable.
 */

import type { TourState } from './types';
import { userToursApi, type UserTour } from '@/lib/api/userTours';
import { 
  getTourState as localStorageGetTourState, 
  setTourState as localStorageSetTourState, 
  isTourCompleted as localStorageIsTourCompleted, 
  getTourVersion as localStorageGetTourVersion,
  saveProgress as localStorageSaveProgress,
  completeTour as localStorageCompleteTour,
  resetTour as localStorageResetTour,
} from './storage';

const DEBUG = import.meta.env.VITE_TOUR_DEBUG === 'true';

// Cache for user tours (to avoid repeated API calls)
let userToursCache: UserTour[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get user tours from API (with caching)
 */
async function getUserTours(): Promise<UserTour[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (userToursCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return userToursCache;
  }
  
  try {
    userToursCache = await userToursApi.myTours();
    cacheTimestamp = now;
    return userToursCache;
  } catch (error) {
    if (DEBUG) {
      console.warn('[TourStorageAPI] Failed to fetch user tours, using localStorage fallback:', error);
    }
    return [];
  }
}

/**
 * Get tour state from database (with localStorage fallback)
 */
export async function getTourState(tourId: string): Promise<TourState | null> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (!tour) {
      // Fallback to localStorage
      return localStorageGetTourState(tourId);
    }
    
    return {
      completed: tour.is_completed,
      version: tour.tour_version,
      lastStepId: tour.last_step_id,
      lastUpdated: new Date(tour.updated_at).getTime(),
    };
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to get state for tour "${tourId}", using localStorage:`, error);
    }
    // Fallback to localStorage
    return localStorageGetTourState(tourId);
  }
}

/**
 * Save tour state to database (with localStorage fallback)
 */
export async function setTourState(tourId: string, state: Partial<TourState>): Promise<void> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (tour) {
      // Update existing tour
      await userToursApi.update(tour.id, {
        is_completed: state.completed,
        last_step_id: state.lastStepId || undefined,
        last_step_index: 0, // Will be updated by saveProgress
      });
      
      // Invalidate cache
      userToursCache = null;
    } else {
      // Create new tour (if we have tour definition)
      // This will be handled by the assignment service
      if (DEBUG) {
        console.log(`[TourStorageAPI] Tour "${tourId}" not found in database, will be created by assignment service`);
      }
    }
    
    // Also save to localStorage as backup
    localStorageSetTourState(tourId, state);
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to save state for tour "${tourId}", using localStorage:`, error);
    }
    // Fallback to localStorage
    localStorageSetTourState(tourId, state);
  }
}

/**
 * Mark a tour as completed
 */
export async function completeTour(tourId: string, version: string): Promise<void> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (tour) {
      await userToursApi.complete(tour.id);
      // Invalidate cache
      userToursCache = null;
    }
    
    // Also save to localStorage as backup
    localStorageCompleteTour(tourId, version);
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to complete tour "${tourId}", using localStorage:`, error);
    }
    // Fallback to localStorage
    localStorageCompleteTour(tourId, version);
  }
}

/**
 * Save progress for a tour
 */
export async function saveProgress(tourId: string, stepId: string, version: string, stepIndex: number = 0): Promise<void> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (tour) {
      await userToursApi.saveProgress(tour.id, stepId, stepIndex);
      // Invalidate cache
      userToursCache = null;
    }
    
    // Also save to localStorage as backup
    localStorageSaveProgress(tourId, stepId, version);
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to save progress for tour "${tourId}", using localStorage:`, error);
    }
    // Fallback to localStorage
    localStorageSaveProgress(tourId, stepId, version);
  }
}

/**
 * Check if a tour has been completed
 */
export async function isTourCompleted(tourId: string): Promise<boolean> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (tour) {
      return tour.is_completed;
    }
    
    // Fallback to localStorage
    return localStorageIsTourCompleted(tourId);
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to check completion for tour "${tourId}", using localStorage:`, error);
    }
    return localStorageIsTourCompleted(tourId);
  }
}

/**
 * Get the version of a completed tour
 */
export async function getTourVersion(tourId: string): Promise<string | null> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (tour) {
      return tour.tour_version;
    }
    
    // Fallback to localStorage
    return localStorageGetTourVersion(tourId);
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to get version for tour "${tourId}", using localStorage:`, error);
    }
    return localStorageGetTourVersion(tourId);
  }
}

/**
 * Get the last step ID for resuming a tour
 */
export async function getLastStepId(tourId: string): Promise<string | null> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (tour) {
      return tour.last_step_id;
    }
    
    // Fallback to localStorage
    const state = localStorageGetTourState(tourId);
    return state?.lastStepId || null;
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to get last step for tour "${tourId}", using localStorage:`, error);
    }
    const state = localStorageGetTourState(tourId);
    return state?.lastStepId || null;
  }
}

/**
 * Reset a tour (delete from database and localStorage)
 */
export async function resetTour(tourId: string): Promise<void> {
  try {
    const tours = await getUserTours();
    const tour = tours.find(t => t.tour_id === tourId);
    
    if (tour) {
      await userToursApi.delete(tour.id);
      // Invalidate cache
      userToursCache = null;
    }
    
    // Also clear from localStorage
    localStorageResetTour(tourId);
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourStorageAPI] Failed to reset tour "${tourId}", using localStorage:`, error);
    }
    // Fallback to localStorage
    localStorageResetTour(tourId);
  }
}

/**
 * Invalidate the cache (call after mutations)
 */
export function invalidateCache(): void {
  userToursCache = null;
  cacheTimestamp = 0;
}

