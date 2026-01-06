/**
 * App Core Tour - Main Export
 * 
 * The main application tour that introduces users to core features.
 */

import type { TourDefinition } from '../../types';
import { appCoreSteps } from './steps';

/**
 * App Core Tour Definition
 */
export const appCoreTour: TourDefinition = {
  id: 'appCore',
  version: '1.0.0',
  title: 'App Core Tour',
  description: 'Introduction to the main features of Nazim school management system',
  steps: appCoreSteps,
  priority: 100,
  eligible: (ctx) => {
    // Show tour to users who haven't completed it
    // Or if the version has changed
    const isCompleted = ctx.isTourCompleted('appCore');
    const completedVersion = ctx.getTourVersion('appCore');
    
    if (import.meta.env.DEV) {
      console.log('[appCoreTour] Eligibility check:', {
        isCompleted,
        completedVersion,
        currentVersion: '1.0.0',
        willShow: !isCompleted || completedVersion !== '1.0.0',
      });
    }
    
    if (!isCompleted) {
      return true;
    }
    
    // Check if version changed
    if (completedVersion !== '1.0.0') {
      return true;
    }
    
    // In development, allow showing tour even if completed (for testing)
    // This makes it easier to test the tour without resetting localStorage
    if (import.meta.env.DEV) {
      console.log('[appCoreTour] Tour is completed, but allowing in development mode for testing');
      console.log('[appCoreTour] To permanently reset, run: window.resetTour("appCore")');
      return true; // Allow in development even if completed
    }
    
    return false;
  },
};

export default appCoreTour;

