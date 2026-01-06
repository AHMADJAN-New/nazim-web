/**
 * Initial Setup Tour - Step Definitions
 * 
 * Comprehensive tour for new users covering navigation and initial setup.
 */

import type { TourStep } from '../../types';
import { getStepContent } from './content';

/**
 * Initial Setup Tour Steps
 */
export const initialSetupSteps: TourStep[] = [
  // Step 1: Welcome
  {
    id: 'welcome',
    ...getStepContent('welcome'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 2: Sidebar Navigation
  {
    id: 'sidebar',
    ...getStepContent('sidebar'),
    attachTo: { selector: '[data-tour="sidebar"]', on: 'right' },
    preActions: [{ type: 'expandSidebar' }],
    waitFor: { selector: '[data-tour="sidebar"]', timeoutMs: 5000 },
    rtlPlacementFlip: true,
    optional: false,
  },

  // Step 3: Edit Icon
  {
    id: 'edit-icon',
    ...getStepContent('editIcon'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 4: Delete Icon
  {
    id: 'delete-icon',
    ...getStepContent('deleteIcon'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 5: View Icon
  {
    id: 'view-icon',
    ...getStepContent('viewIcon'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 6: Tabs & Actions
  {
    id: 'tabs-actions',
    ...getStepContent('tabsActions'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: true,
  },

  // Step 7: Help Center Button
  {
    id: 'help-center',
    ...getStepContent('helpCenter'),
    attachTo: { selector: '[data-tour="help-button"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="help-button"]', timeoutMs: 3000 },
    optional: true,
  },

  // Step 8: Complete
  {
    id: 'complete',
    ...getStepContent('complete'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
];

