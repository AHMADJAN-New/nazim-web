/**
 * Onboarding Tour System - Session Storage Utilities
 * 
 * Handles sessionStorage persistence for tour state during navigation.
 * This prevents tour state from being lost when pages reload or navigate.
 */

const SESSION_KEY = 'tour:active';

export interface ActiveTourState {
  tourId: string;
  stepId: string;
  stepIndex: number;
  timestamp: number;
}

/**
 * Save active tour state to sessionStorage
 */
export function saveActiveTourState(state: ActiveTourState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TourSessionStorage] Failed to save active tour state:', error);
    }
  }
}

/**
 * Get active tour state from sessionStorage
 */
export function getActiveTourState(): ActiveTourState | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ActiveTourState;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TourSessionStorage] Failed to get active tour state:', error);
    }
    return null;
  }
}

/**
 * Clear active tour state from sessionStorage
 */
export function clearActiveTourState(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TourSessionStorage] Failed to clear active tour state:', error);
    }
  }
}

/**
 * Check if there's an active tour state (within last 5 minutes)
 */
export function hasActiveTourState(): boolean {
  const state = getActiveTourState();
  if (!state) return false;
  
  // Consider state stale after 5 minutes
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return state.timestamp > fiveMinutesAgo;
}


