/**
 * App Core Tour - Step Definitions
 * 
 * Unified tour steps (merged from appCore and initialSetup tours).
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
  
  // Step 3: Dashboard Tabs Introduction (Combined tabs knowledge)
  {
    id: 'dashboard-tabs',
    ...getStepContent('dashboardTabs'),
    attachTo: { selector: '[data-tour="dashboard-tabs-list"]', on: 'bottom' },
    route: '/dashboard',
    preActions: [
      { type: 'switchTab', payload: { containerId: 'dashboard-tabs', tabId: 'overview' } },
    ],
    waitFor: { selector: '[data-tour="dashboard-tabs-list"]', timeoutMs: 5000 },
    optional: true,
  },
  
  // Step 4: Sidebar Navigation
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
  
  // Step 5: Edit Icon
  {
    id: 'edit-icon',
    ...getStepContent('editIcon'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 6: Delete Icon
  {
    id: 'delete-icon',
    ...getStepContent('deleteIcon'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 7: View Icon
  {
    id: 'view-icon',
    ...getStepContent('viewIcon'),
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 8: Top Bar Introduction
  {
    id: 'top-bar',
    ...getStepContent('topBar'),
    attachTo: { selector: '[data-tour="app-header"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="app-header"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 9: Search Bar
  {
    id: 'search',
    ...getStepContent('search'),
    attachTo: { selector: '[data-tour="search-container"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="search-container"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 10: Notifications
  {
    id: 'notifications',
    ...getStepContent('notifications'),
    attachTo: { selector: '[data-tour="notifications"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="notifications"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 11: Students Menu
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
  
  // Step 12: Staff Menu
  {
    id: 'sidebar-staff',
    ...getStepContent('sidebarStaff'),
    attachTo: { selector: '[data-tour="sidebar-staff"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-staff"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 13: Attendance Menu
  {
    id: 'sidebar-attendance',
    ...getStepContent('sidebarAttendance'),
    attachTo: { selector: '[data-tour="sidebar-attendance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-attendance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 14: Exams Menu
  {
    id: 'sidebar-exams',
    ...getStepContent('sidebarExams'),
    attachTo: { selector: '[data-tour="sidebar-exams"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-exams"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 15: Finance Menu
  {
    id: 'sidebar-finance',
    ...getStepContent('sidebarFinance'),
    attachTo: { selector: '[data-tour="sidebar-finance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-finance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 16: Academic Menu
  {
    id: 'sidebar-academic',
    ...getStepContent('sidebarAcademic'),
    attachTo: { selector: '[data-tour="sidebar-academic"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-academic"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 17: Settings Menu
  {
    id: 'sidebar-settings',
    ...getStepContent('sidebarSettings'),
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 18: User Menu
  {
    id: 'user-menu',
    ...getStepContent('userMenu'),
    attachTo: { selector: '[data-tour="user-menu"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="user-menu"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 19: Help Center
  {
    id: 'help-center',
    ...getStepContent('helpCenter'),
    attachTo: { selector: '[data-tour="help-button"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="help-button"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 20: Complete
  {
    id: 'complete',
    ...getStepContent('complete'),
    attachTo: { selector: 'body', on: 'center' },
    optional: false,
  },
];
