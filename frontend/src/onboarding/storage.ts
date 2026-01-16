/**
 * Onboarding Tour System - Storage Utilities
 * 
 * Handles localStorage persistence for tour state.
 */

import type { TourState } from './types';

const STORAGE_PREFIX = 'tour:';

/**
 * Get the storage key for a tour
 */
function getStorageKey(tourId: string): string {
  return `${STORAGE_PREFIX}${tourId}`;
}

/**
 * Get the current state of a tour from localStorage
 */
export function getTourState(tourId: string): TourState | null {
  try {
    const key = getStorageKey(tourId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as TourState;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[TourStorage] Failed to get state for tour "${tourId}":`, error);
    }
    return null;
  }
}

/**
 * Save the state of a tour to localStorage
 */
export function setTourState(tourId: string, state: Partial<TourState>): void {
  try {
    const key = getStorageKey(tourId);
    const existing = getTourState(tourId);
    const newState: TourState = {
      completed: state.completed ?? existing?.completed ?? false,
      version: state.version ?? existing?.version ?? null,
      lastStepId: state.lastStepId ?? existing?.lastStepId ?? null,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(newState));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[TourStorage] Failed to save state for tour "${tourId}":`, error);
    }
  }
}

/**
 * Mark a tour as completed
 */
export function completeTour(tourId: string, version: string): void {
  setTourState(tourId, {
    completed: true,
    version,
    lastStepId: null,
  });
}

/**
 * Save the current step for resuming later
 * Note: This is the localStorage version. Use storageApi.saveProgress for database.
 */
export function saveProgress(tourId: string, stepId: string, version: string): void {
  setTourState(tourId, {
    lastStepId: stepId,
    version,
  });
}

/**
 * Reset a tour's state (allow retaking)
 */
export function resetTour(tourId: string): void {
  try {
    const key = getStorageKey(tourId);
    localStorage.removeItem(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[TourStorage] Failed to reset tour "${tourId}":`, error);
    }
  }
}

/**
 * Check if a tour has been completed
 */
export function isTourCompleted(tourId: string): boolean {
  const state = getTourState(tourId);
  return state?.completed ?? false;
}

/**
 * Check if a tour has been completed with a specific version
 */
export function isTourCompletedWithVersion(tourId: string, version: string): boolean {
  const state = getTourState(tourId);
  return state?.completed === true && state?.version === version;
}

/**
 * Get the last step ID for resuming a tour
 */
export function getLastStepId(tourId: string): string | null {
  const state = getTourState(tourId);
  return state?.lastStepId ?? null;
}

/**
 * Get the version of a completed tour
 */
export function getTourVersion(tourId: string): string | null {
  const state = getTourState(tourId);
  return state?.version ?? null;
}

/**
 * Get all tour states from localStorage
 */
export function getAllTourStates(): Record<string, TourState> {
  const states: Record<string, TourState> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const tourId = key.slice(STORAGE_PREFIX.length);
        const state = getTourState(tourId);
        if (state) {
          states[tourId] = state;
        }
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TourStorage] Failed to get all tour states:', error);
    }
  }
  return states;
}

/**
 * Clear all tour states from localStorage
 */
export function clearAllTourStates(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TourStorage] Failed to clear all tour states:', error);
    }
  }
}

