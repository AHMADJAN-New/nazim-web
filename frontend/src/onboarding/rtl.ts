/**
 * Onboarding Tour System - RTL Utilities
 * 
 * Handles RTL detection and placement flipping for tour steps.
 */

import type { TourPlacement, TourStep } from './types';

/** RTL languages supported by the application */
const RTL_LANGUAGES = ['ar', 'ps', 'fa'];

/**
 * Check if the current language is RTL
 */
export function isRTL(): boolean {
  // Check document direction first
  if (typeof document !== 'undefined') {
    const dir = document.documentElement.dir || document.body.dir;
    if (dir === 'rtl') return true;
    if (dir === 'ltr') return false;
  }
  
  // Check localStorage for language preference
  try {
    const language = localStorage.getItem('nazim-language');
    if (language && RTL_LANGUAGES.includes(language)) {
      return true;
    }
  } catch {
    // Ignore localStorage errors
  }
  
  return false;
}

/**
 * Get the current language from localStorage
 */
export function getCurrentLanguage(): string {
  try {
    // App default language is Pashto (ps)
    return localStorage.getItem('nazim-language') || 'ps';
  } catch {
    return 'ps';
  }
}

/**
 * Flip a placement for RTL layout
 */
export function flipPlacement(placement: TourPlacement, shouldFlip: boolean): TourPlacement {
  if (!shouldFlip) return placement;
  
  const flipMap: Partial<Record<TourPlacement, TourPlacement>> = {
    'left': 'right',
    'left-start': 'right-start',
    'left-end': 'right-end',
    'right': 'left',
    'right-start': 'left-start',
    'right-end': 'left-end',
    'top-start': 'top-end',
    'top-end': 'top-start',
    'bottom-start': 'bottom-end',
    'bottom-end': 'bottom-start',
  };
  
  return flipMap[placement] || placement;
}

/**
 * Get the RTL-aware placement for a step
 */
export function getRTLPlacement(step: TourStep): TourPlacement {
  if (!step.attachTo) return 'center';
  
  const placement = step.attachTo.on;
  const shouldFlip = step.rtlPlacementFlip !== false && isRTL();
  
  return flipPlacement(placement, shouldFlip);
}

/**
 * Get CSS classes for RTL support
 */
export function getRTLClasses(): string {
  return isRTL() ? 'shepherd-rtl' : 'shepherd-ltr';
}

/**
 * Get text direction
 */
export function getTextDirection(): 'rtl' | 'ltr' {
  return isRTL() ? 'rtl' : 'ltr';
}

