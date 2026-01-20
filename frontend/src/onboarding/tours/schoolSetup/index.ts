/**
 * School Setup Tour - Main Export
 * 
 * The school setup tour that guides admins through configuring their school.
 */

import type { TourDefinition } from '../../types';
import { schoolSetupSteps } from './steps';

/**
 * School Setup Tour Definition
 */
export const schoolSetupTour: TourDefinition = {
  id: 'schoolSetup',
  version: '1.0.0',
  title: 'School Setup Tour',
  description: 'Complete guide to setting up your school: school details, academic years, classes, and subjects',
  steps: schoolSetupSteps,
  priority: 90, // Lower than appCore's 100, so it runs after
  eligible: (ctx) => {
    // Show tour to users who have completed the Core Tour but haven't completed this one
    const isCoreCompleted = ctx.isTourCompleted('appCore');
    const isSchoolSetupCompleted = ctx.isTourCompleted('schoolSetup');
    const completedVersion = ctx.getTourVersion('schoolSetup');
    
    if (import.meta.env.DEV) {
      console.log('[schoolSetupTour] Eligibility check:', {
        isCoreCompleted,
        isSchoolSetupCompleted,
        completedVersion,
        currentVersion: '1.0.0',
        willShow: isCoreCompleted && (!isSchoolSetupCompleted || completedVersion !== '1.0.0'),
      });
    }
    
    // Must complete Core Tour first
    if (!isCoreCompleted) {
      return false;
    }
    
    // Show if not completed or version changed
    if (!isSchoolSetupCompleted) {
      return true;
    }
    
    // Check if version changed
    if (completedVersion !== '1.0.0') {
      return true;
    }
    
    // In development, only allow re-showing the tour when debug mode is enabled
    if (import.meta.env.DEV && import.meta.env.VITE_TOUR_DEBUG === 'true') {
      console.log('[schoolSetupTour] Tour is completed, but allowing in development because VITE_TOUR_DEBUG=true');
      console.log('[schoolSetupTour] To permanently reset, run: window.resetTour("schoolSetup")');
      return true;
    }
    
    return false;
  },
};

export default schoolSetupTour;


