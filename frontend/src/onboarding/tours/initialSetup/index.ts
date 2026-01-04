/**
 * Initial Setup Tour - Main Export
 * 
 * Comprehensive onboarding tour for new users covering navigation and initial setup.
 */

import type { TourDefinition } from '../../types';
import { initialSetupSteps } from './steps';

/**
 * Initial Setup Tour Definition
 */
export const initialSetupTour: TourDefinition = {
  id: 'initialSetup',
  version: '1.0.0',
  title: 'Initial Setup & Onboarding Tour',
  description: 'Complete guide to navigating Nazim and completing initial setup',
  steps: initialSetupSteps,
  priority: 200, // Higher priority than appCore tour
  eligible: (ctx) => {
    // Check profile's onboarding completion status first
    // If profile exists and has_completed_onboarding is explicitly true, don't show
    if (ctx.profile && ctx.profile.has_completed_onboarding === true) {
      if (import.meta.env.DEV) {
        console.log('[initialSetupTour] Not eligible - user has completed onboarding');
      }
      return false;
    }
    
    // If profile is null or has_completed_onboarding is false/undefined, check tour completion
    // Show tour to users who haven't completed onboarding
    // Or if the version has changed
    const isCompleted = ctx.isTourCompleted('initialSetup');
    if (!isCompleted) {
      if (import.meta.env.DEV) {
        console.log('[initialSetupTour] Eligible - tour not completed');
      }
      return true;
    }
    
    // Check if version changed
    const completedVersion = ctx.getTourVersion('initialSetup');
    if (completedVersion !== '1.0.0') {
      if (import.meta.env.DEV) {
        console.log('[initialSetupTour] Eligible - version changed', { completedVersion, current: '1.0.0' });
      }
      return true;
    }
    
    if (import.meta.env.DEV) {
      console.log('[initialSetupTour] Not eligible - tour completed with current version');
    }
    return false;
  },
};

export default initialSetupTour;

