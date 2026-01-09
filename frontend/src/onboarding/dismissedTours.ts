/**
 * Onboarding Tour System - Dismissed Tours Tracking
 * 
 * Tracks tours that have been dismissed/closed by the user.
 * Prevents showing dismissed tours again.
 */

const STORAGE_KEY = 'tour:dismissed';

/**
 * Get list of dismissed tour IDs
 */
export function getDismissedTours(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TourDismissed] Failed to get dismissed tours:', error);
    }
    return [];
  }
}

/**
 * Mark a tour as dismissed
 */
export function dismissTour(tourId: string): void {
  try {
    const dismissed = getDismissedTours();
    if (!dismissed.includes(tourId)) {
      dismissed.push(tourId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[TourDismissed] Failed to dismiss tour "${tourId}":`, error);
    }
  }
}

/**
 * Check if a tour has been dismissed
 */
export function isTourDismissed(tourId: string): boolean {
  return getDismissedTours().includes(tourId);
}

/**
 * Clear dismissed tours (for testing or reset)
 */
export function clearDismissedTours(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TourDismissed] Failed to clear dismissed tours:', error);
    }
  }
}

/**
 * Undismiss a tour (allow showing it again)
 */
export function undismissTour(tourId: string): void {
  try {
    const dismissed = getDismissedTours();
    const filtered = dismissed.filter(id => id !== tourId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[TourDismissed] Failed to undismiss tour "${tourId}":`, error);
    }
  }
}


