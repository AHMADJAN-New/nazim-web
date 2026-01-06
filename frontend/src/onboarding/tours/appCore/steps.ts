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
  
  // Step 2.5: Dashboard Tabs Introduction
  {
    id: 'dashboard-tabs',
    ...getStepContent('dashboardTabs'),
    attachTo: { selector: '[data-tour="dashboard-tabs"]', on: 'bottom' },
    route: '/dashboard',
    waitFor: { selector: '[data-tour="dashboard-tabs"]', timeoutMs: 5000 },
    optional: true,
  },
  
  // Step 2.6: General Tabs Knowledge
  {
    id: 'tabs-general',
    ...getStepContent('tabsGeneral'),
    attachTo: { selector: '[data-tour="dashboard-tabs"]', on: 'bottom' },
    route: '/dashboard',
    waitFor: { selector: '[data-tour="dashboard-tabs"]', timeoutMs: 5000 },
    optional: true,
  },
  
  // Step 3: Top Bar Introduction
  {
    id: 'top-bar',
    ...getStepContent('topBar'),
    attachTo: { selector: '[data-tour="app-header"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="app-header"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 4: Search Bar
  {
    id: 'search',
    ...getStepContent('search'),
    attachTo: { selector: '[data-tour="search-container"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="search-container"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 5: Notifications
  {
    id: 'notifications',
    ...getStepContent('notifications'),
    attachTo: { selector: '[data-tour="notifications"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="notifications"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 6: Sidebar Navigation
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
  
  // Step 7: Students Menu
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
  
  // Step 8: Staff Menu
  {
    id: 'sidebar-staff',
    ...getStepContent('sidebarStaff'),
    attachTo: { selector: '[data-tour="sidebar-staff"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-staff"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 9: Attendance Menu
  {
    id: 'sidebar-attendance',
    ...getStepContent('sidebarAttendance'),
    attachTo: { selector: '[data-tour="sidebar-attendance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-attendance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 10: Exams Menu
  {
    id: 'sidebar-exams',
    ...getStepContent('sidebarExams'),
    attachTo: { selector: '[data-tour="sidebar-exams"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-exams"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 11: Finance Menu
  {
    id: 'sidebar-finance',
    ...getStepContent('sidebarFinance'),
    attachTo: { selector: '[data-tour="sidebar-finance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-finance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 12: Academic Menu
  {
    id: 'sidebar-academic',
    ...getStepContent('sidebarAcademic'),
    attachTo: { selector: '[data-tour="sidebar-academic"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-academic"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 13: Settings Menu
  {
    id: 'sidebar-settings',
    ...getStepContent('sidebarSettings'),
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 14: User Menu
  {
    id: 'user-menu',
    ...getStepContent('userMenu'),
    attachTo: { selector: '[data-tour="user-menu"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="user-menu"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 15: Help Center
  {
    id: 'help-center',
    ...getStepContent('helpCenter'),
    attachTo: { selector: '[data-tour="help-button"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="help-button"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 16: Complete
  {
    id: 'complete',
    ...getStepContent('complete'),
    attachTo: { selector: 'body', on: 'center' },
    optional: false,
  },
];

