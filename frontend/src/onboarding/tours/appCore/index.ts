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
    if (!ctx.isTourCompleted('appCore')) {
      return true;
    }
    
    // Check if version changed
    const completedVersion = ctx.getTourVersion('appCore');
    if (completedVersion !== '1.0.0') {
      return true;
    }
    
    return false;
  },
};

export default appCoreTour;

