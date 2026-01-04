/**
 * Onboarding Tour System - Tour Registry
 * 
 * Central registry for all tour definitions.
 */

import type { TourDefinition, TourContext } from './types';
import { isTourDismissed } from './dismissedTours';

/**
 * Registry of all registered tours
 */
const tourRegistry: Map<string, TourDefinition> = new Map();

/**
 * Register a tour definition
 */
export function registerTour(tour: TourDefinition): void {
  if (tourRegistry.has(tour.id)) {
    if (import.meta.env.DEV) {
      console.warn(`[TourRegistry] Tour "${tour.id}" is being re-registered`);
    }
  }
  tourRegistry.set(tour.id, tour);
  
  if (import.meta.env.DEV) {
    console.log(`[TourRegistry] Registered tour: ${tour.id} (${tour.steps.length} steps)`);
  }
}

/**
 * Unregister a tour
 */
export function unregisterTour(tourId: string): boolean {
  return tourRegistry.delete(tourId);
}

/**
 * Get a tour by ID
 */
export function getTour(tourId: string): TourDefinition | undefined {
  return tourRegistry.get(tourId);
}

/**
 * Get all registered tours
 */
export function getAllTours(): TourDefinition[] {
  return Array.from(tourRegistry.values());
}

/**
 * Get tours that are eligible for the current context
 */
export function getEligibleTours(context: TourContext): TourDefinition[] {
  const allTours = getAllTours();
  
  if (import.meta.env.DEV) {
    console.log('[TourRegistry] getEligibleTours:', {
      totalTours: allTours.length,
      tourIds: allTours.map(t => t.id),
    });
  }
  
  return allTours
    .filter((tour) => {
      // Skip dismissed tours
      if (isTourDismissed(tour.id)) {
        if (import.meta.env.DEV) {
          console.log(`[TourRegistry] Tour "${tour.id}" is dismissed`);
        }
        return false;
      }
      
      // If no eligibility function, tour is always eligible
      if (!tour.eligible) {
        if (import.meta.env.DEV) {
          console.log(`[TourRegistry] Tour "${tour.id}" has no eligibility function - eligible`);
        }
        return true;
      }
      
      try {
        const isEligible = tour.eligible(context);
        if (import.meta.env.DEV) {
          console.log(`[TourRegistry] Tour "${tour.id}" eligibility:`, isEligible);
        }
        return isEligible;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`[TourRegistry] Error checking eligibility for tour "${tour.id}":`, error);
        }
        return false;
      }
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Check if a tour exists
 */
export function hasTour(tourId: string): boolean {
  return tourRegistry.has(tourId);
}

/**
 * Get the number of registered tours
 */
export function getTourCount(): number {
  return tourRegistry.size;
}

/**
 * Clear all registered tours
 */
export function clearRegistry(): void {
  tourRegistry.clear();
}

/**
 * Get tour IDs
 */
export function getTourIds(): string[] {
  return Array.from(tourRegistry.keys());
}

