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
  
  // Step 2: Top Bar Overview
  {
    id: 'top-bar',
    ...getStepContent('topBar'),
    attachTo: { selector: '[data-tour="app-header"]', on: 'bottom' },
    route: '/dashboard',
    waitFor: { selector: '[data-tour="app-header"]', timeoutMs: 5000 },
    scroll: 'nearest',
    optional: true,
  },
  
  // Step 3: Help Center Icon
  {
    id: 'help-center',
    ...getStepContent('helpCenter'),
    attachTo: { selector: '[data-tour="help-button"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="help-button"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 4: Notifications
  {
    id: 'notifications',
    ...getStepContent('notifications'),
    attachTo: { selector: '[data-tour="notifications"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="notifications"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 5: User Menu
  {
    id: 'user-menu',
    ...getStepContent('userMenu'),
    attachTo: { selector: '[data-tour="user-menu"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="user-menu"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 6: Sidebar Overview
  {
    id: 'sidebar',
    ...getStepContent('sidebar'),
    attachTo: { selector: '[data-tour="sidebar"]', on: 'right' },
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 7: Operations Section
  {
    id: 'operations-section',
    ...getStepContent('operationsSection'),
    attachTo: { selector: '[data-tour="sidebar-operations"]', on: 'right' },
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar-operations"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 8: Academic Section
  {
    id: 'academic-section',
    ...getStepContent('academicSection'),
    attachTo: { selector: '[data-tour="sidebar-academic-section"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-academic-section"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 9: Finance Section
  {
    id: 'finance-section',
    ...getStepContent('financeSection'),
    attachTo: { selector: '[data-tour="sidebar-finance-section"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-finance-section"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 10: Administration Section
  {
    id: 'administration-section',
    ...getStepContent('administrationSection'),
    attachTo: { selector: '[data-tour="sidebar-admin-section"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-admin-section"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 11: Initial Setup Introduction
  {
    id: 'initial-setup',
    ...getStepContent('initialSetup'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 12: Navigate to Schools Management (show sidebar and link)
  {
    id: 'school-management-navigate',
    title: 'Navigate to Schools Management',
    text: [
      'Let\'s navigate to the Schools Management page.',
      'First, expand the Academic Settings section in the sidebar.',
      'Then click on "Schools Management" to open the page.',
    ],
    attachTo: { selector: '[data-tour="sidebar-academicSettings"]', on: 'right' },
    route: '/dashboard',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'wait', payload: { ms: 200 } },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'wait', payload: { ms: 200 } },
    ],
    waitFor: { selector: '[data-tour="sidebar-schools-management"]', timeoutMs: 3000 },
    allowClicksOnTarget: true, // Allow user to click the sidebar group
    optional: false,
    rtlPlacementFlip: true,
  },
  
  // Step 13: Click Schools Management Link
  {
    id: 'school-management-click',
    title: 'Open Schools Management',
    text: [
      'Click on "Schools Management" to navigate to the page.',
      'This will open the Schools Management interface where you can configure your school data.',
    ],
    attachTo: { selector: '[data-tour="sidebar-schools-management"]', on: 'right' },
    route: '/dashboard',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'wait', payload: { ms: 100 } },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'wait', payload: { ms: 100 } },
    ],
    waitFor: { selector: '[data-tour="sidebar-schools-management"]', timeoutMs: 3000 },
    allowClicksOnTarget: true, // Allow user to click the link directly
    optional: false,
    rtlPlacementFlip: true,
  },
  
  // Step 14: Show Schools Management Page
  {
    id: 'school-management-page',
    ...getStepContent('schoolManagementPage'),
    attachTo: { selector: '[data-tour="schools-management-page"]', on: 'center' },
    route: '/settings/schools',
    waitFor: { selector: '[data-tour="schools-management-page"]', timeoutMs: 5000 },
    optional: false,
  },
  
  // Step 15: School Management Edit
  {
    id: 'school-management',
    ...getStepContent('schoolManagement'),
    attachTo: { selector: '[data-tour="schools-edit-dialog"]', on: 'center' },
    route: '/settings/schools',
    preActions: [
      { type: 'wait', payload: { ms: 500 } }, // Wait for page to be fully ready
      { type: 'click', payload: { selector: '[data-tour="schools-edit-button"]' } },
      { type: 'wait', payload: { ms: 800 } }, // Wait longer for dialog to open
    ],
    waitFor: { selector: '[data-tour="schools-edit-dialog"]', timeoutMs: 8000 }, // Increased timeout for dialog
    allowClicksOnTarget: true, // Allow user to interact with the dialog
    optional: false,
    rtlPlacementFlip: true,
  },
  
  // Step 16: User Permissions
  {
    id: 'user-permissions',
    ...getStepContent('userPermissions'),
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    route: '/settings/permissions',
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 5000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 17: User Creation
  {
    id: 'user-creation',
    ...getStepContent('userCreation'),
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    route: '/admin/users',
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 5000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 18: Role Assignment
  {
    id: 'role-assignment',
    ...getStepContent('roleAssignment'),
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    route: '/settings/roles',
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 5000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 19: Role Permissions
  {
    id: 'role-permissions',
    ...getStepContent('rolePermissions'),
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    route: '/settings/roles',
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 5000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 20: Complete
  {
    id: 'complete',
    ...getStepContent('complete'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
];

