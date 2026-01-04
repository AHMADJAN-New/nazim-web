/**
 * App Core Tour - Step Definitions
 * 
 * Defines all steps for the main application tour.
 */

import type { TourStep } from '../../types';
import { getStepContent } from './content';

/**
 * App Core Tour Steps
 */
export const appCoreSteps: TourStep[] = [
  // Step 1: Welcome
  {
    id: 'welcome',
    ...getStepContent('welcome'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 2: Dashboard Overview
  {
    id: 'dashboard',
    ...getStepContent('dashboard'),
    attachTo: { selector: '[data-tour="dashboard"]', on: 'bottom' },
    route: '/dashboard',
    waitFor: { selector: '[data-tour="dashboard"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: true,
  },
  
  // Step 3: Sidebar Navigation
  {
    id: 'sidebar',
    ...getStepContent('sidebar'),
    attachTo: { selector: '[data-tour="sidebar"]', on: 'right' },
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 4: Students Menu
  {
    id: 'sidebar-students',
    ...getStepContent('sidebarStudents'),
    attachTo: { selector: '[data-tour="sidebar-students"]', on: 'right' },
    preActions: [
      { type: 'expandSidebar' },
    ],
    waitFor: { selector: '[data-tour="sidebar-students"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 5: Staff Menu
  {
    id: 'sidebar-staff',
    ...getStepContent('sidebarStaff'),
    attachTo: { selector: '[data-tour="sidebar-staff"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-staff"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 6: Attendance Menu
  {
    id: 'sidebar-attendance',
    ...getStepContent('sidebarAttendance'),
    attachTo: { selector: '[data-tour="sidebar-attendance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-attendance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 7: Exams Menu
  {
    id: 'sidebar-exams',
    ...getStepContent('sidebarExams'),
    attachTo: { selector: '[data-tour="sidebar-exams"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-exams"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 8: Finance Menu
  {
    id: 'sidebar-finance',
    ...getStepContent('sidebarFinance'),
    attachTo: { selector: '[data-tour="sidebar-finance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-finance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 9: Academic Menu
  {
    id: 'sidebar-academic',
    ...getStepContent('sidebarAcademic'),
    attachTo: { selector: '[data-tour="sidebar-academic"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-academic"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 10: Settings Menu
  {
    id: 'sidebar-settings',
    ...getStepContent('sidebarSettings'),
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 11: User Menu
  {
    id: 'user-menu',
    ...getStepContent('userMenu'),
    attachTo: { selector: '[data-tour="user-menu"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="user-menu"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 12: Help Center
  {
    id: 'help-center',
    ...getStepContent('helpCenter'),
    attachTo: { selector: '[data-tour="help-button"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="help-button"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 13: Complete
  {
    id: 'complete',
    ...getStepContent('complete'),
    attachTo: { selector: 'body', on: 'center' },
    optional: false,
  },
];

