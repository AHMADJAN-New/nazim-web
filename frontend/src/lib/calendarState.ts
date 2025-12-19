/**
 * Global Calendar State Manager
 * Provides access to calendar preference outside React components
 */

import type { CalendarType } from './datePreferences';
import { CALENDAR_TYPES, DATE_PREFERENCE_KEY } from './datePreferences';

/**
 * Global calendar state
 * This is updated by DatePreferenceProvider and can be read anywhere
 */
class CalendarState {
  private currentCalendar: CalendarType = CALENDAR_TYPES.GREGORIAN;
  private listeners: Set<(calendar: CalendarType) => void> = new Set();

  constructor() {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DATE_PREFERENCE_KEY);
      if (saved && Object.values(CALENDAR_TYPES).includes(saved as CalendarType)) {
        this.currentCalendar = saved as CalendarType;
      }
    }
  }

  /**
   * Get the current calendar type
   */
  get(): CalendarType {
    return this.currentCalendar;
  }

  /**
   * Set the current calendar type
   * This should only be called by DatePreferenceProvider
   */
  set(calendar: CalendarType): void {
    if (this.currentCalendar !== calendar) {
      this.currentCalendar = calendar;
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to calendar changes
   */
  subscribe(listener: (calendar: CalendarType) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of calendar change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentCalendar));
  }
}

// Export singleton instance
export const calendarState = new CalendarState();
