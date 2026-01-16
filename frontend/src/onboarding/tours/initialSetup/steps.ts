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
    get title() {
      return getStepContent('welcome').title;
    },
    get text() {
      return getStepContent('welcome').text;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 2: Sidebar Navigation
  {
    id: 'sidebar',
    get title() {
      return getStepContent('sidebar').title;
    },
    get text() {
      return getStepContent('sidebar').text;
    },
    attachTo: { selector: '[data-tour="sidebar"]', on: 'right' },
    preActions: [{ type: 'expandSidebar' }],
    waitFor: { selector: '[data-tour="sidebar"]', timeoutMs: 5000 },
    rtlPlacementFlip: true,
    optional: false,
  },

  // Step 3: Edit Icon
  {
    id: 'edit-icon',
    get title() {
      return getStepContent('editIcon').title;
    },
    get text() {
      return getStepContent('editIcon').text;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 4: Delete Icon
  {
    id: 'delete-icon',
    get title() {
      return getStepContent('deleteIcon').title;
    },
    get text() {
      return getStepContent('deleteIcon').text;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 5: View Icon
  {
    id: 'view-icon',
    get title() {
      return getStepContent('viewIcon').title;
    },
    get text() {
      return getStepContent('viewIcon').text;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },

  // Step 6: Tabs & Actions
  {
    id: 'tabs-actions',
    get title() {
      return getStepContent('tabsActions').title;
    },
    get text() {
      return getStepContent('tabsActions').text;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: true,
  },

  // Step 7: Help Center Button
  {
    id: 'help-center',
    get title() {
      return getStepContent('helpCenter').title;
    },
    get text() {
      return getStepContent('helpCenter').text;
    },
    attachTo: { selector: '[data-tour="help-button"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="help-button"]', timeoutMs: 3000 },
    optional: true,
  },

  // Step 8: Complete
  {
    id: 'complete',
    get title() {
      return getStepContent('complete').title;
    },
    get text() {
      return getStepContent('complete').text;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
];

