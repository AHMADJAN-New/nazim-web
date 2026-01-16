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
    get title() {
      return getStepContent('welcome').title;
    },
    get text() {
      return getStepContent('welcome').text;
    },
    get icon() {
      return getStepContent('welcome').icon;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 2: Dashboard Overview
  {
    id: 'dashboard',
    get title() {
      return getStepContent('dashboard').title;
    },
    get text() {
      return getStepContent('dashboard').text;
    },
    get icon() {
      return getStepContent('dashboard').icon;
    },
    attachTo: { selector: '[data-tour="dashboard"]', on: 'bottom' },
    route: '/dashboard',
    waitFor: { selector: '[data-tour="dashboard"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: true,
  },
  
  // Step 3: Dashboard Tabs Introduction (Combined tabs knowledge)
  {
    id: 'dashboard-tabs',
    get title() {
      return getStepContent('dashboardTabs').title;
    },
    get text() {
      return getStepContent('dashboardTabs').text;
    },
    get icon() {
      return getStepContent('dashboardTabs').icon;
    },
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
    get title() {
      return getStepContent('sidebar').title;
    },
    get text() {
      return getStepContent('sidebar').text;
    },
    get icon() {
      return getStepContent('sidebar').icon;
    },
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
    get title() {
      return getStepContent('editIcon').title;
    },
    get text() {
      return getStepContent('editIcon').text;
    },
    get icon() {
      return getStepContent('editIcon').icon;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 6: Delete Icon
  {
    id: 'delete-icon',
    get title() {
      return getStepContent('deleteIcon').title;
    },
    get text() {
      return getStepContent('deleteIcon').text;
    },
    get icon() {
      return getStepContent('deleteIcon').icon;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 7: View Icon
  {
    id: 'view-icon',
    get title() {
      return getStepContent('viewIcon').title;
    },
    get text() {
      return getStepContent('viewIcon').text;
    },
    get icon() {
      return getStepContent('viewIcon').icon;
    },
    attachTo: { selector: 'body', on: 'center' },
    route: '/dashboard',
    optional: false,
  },
  
  // Step 8: Top Bar Introduction
  {
    id: 'top-bar',
    get title() {
      return getStepContent('topBar').title;
    },
    get text() {
      return getStepContent('topBar').text;
    },
    get icon() {
      return getStepContent('topBar').icon;
    },
    attachTo: { selector: '[data-tour="app-header"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="app-header"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 9: Search Bar
  {
    id: 'search',
    get title() {
      return getStepContent('search').title;
    },
    get text() {
      return getStepContent('search').text;
    },
    get icon() {
      return getStepContent('search').icon;
    },
    attachTo: { selector: '[data-tour="search-container"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="search-container"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 10: Notifications
  {
    id: 'notifications',
    get title() {
      return getStepContent('notifications').title;
    },
    get text() {
      return getStepContent('notifications').text;
    },
    get icon() {
      return getStepContent('notifications').icon;
    },
    attachTo: { selector: '[data-tour="notifications"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="notifications"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 11: Students Menu
  {
    id: 'sidebar-students',
    get title() {
      return getStepContent('sidebarStudents').title;
    },
    get text() {
      return getStepContent('sidebarStudents').text;
    },
    get icon() {
      return getStepContent('sidebarStudents').icon;
    },
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
    get title() {
      return getStepContent('sidebarStaff').title;
    },
    get text() {
      return getStepContent('sidebarStaff').text;
    },
    get icon() {
      return getStepContent('sidebarStaff').icon;
    },
    attachTo: { selector: '[data-tour="sidebar-staff"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-staff"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 13: Attendance Menu
  {
    id: 'sidebar-attendance',
    get title() {
      return getStepContent('sidebarAttendance').title;
    },
    get text() {
      return getStepContent('sidebarAttendance').text;
    },
    get icon() {
      return getStepContent('sidebarAttendance').icon;
    },
    attachTo: { selector: '[data-tour="sidebar-attendance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-attendance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 14: Exams Menu
  {
    id: 'sidebar-exams',
    get title() {
      return getStepContent('sidebarExams').title;
    },
    get text() {
      return getStepContent('sidebarExams').text;
    },
    get icon() {
      return getStepContent('sidebarExams').icon;
    },
    attachTo: { selector: '[data-tour="sidebar-exams"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-exams"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 15: Finance Menu
  {
    id: 'sidebar-finance',
    get title() {
      return getStepContent('sidebarFinance').title;
    },
    get text() {
      return getStepContent('sidebarFinance').text;
    },
    get icon() {
      return getStepContent('sidebarFinance').icon;
    },
    attachTo: { selector: '[data-tour="sidebar-finance"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-finance"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 16: Academic Menu
  {
    id: 'sidebar-academic',
    get title() {
      return getStepContent('sidebarAcademic').title;
    },
    get text() {
      return getStepContent('sidebarAcademic').text;
    },
    get icon() {
      return getStepContent('sidebarAcademic').icon;
    },
    attachTo: { selector: '[data-tour="sidebar-academic"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-academic"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 17: Settings Menu
  {
    id: 'sidebar-settings',
    get title() {
      return getStepContent('sidebarSettings').title;
    },
    get text() {
      return getStepContent('sidebarSettings').text;
    },
    get icon() {
      return getStepContent('sidebarSettings').icon;
    },
    attachTo: { selector: '[data-tour="sidebar-settings"]', on: 'right' },
    waitFor: { selector: '[data-tour="sidebar-settings"]', timeoutMs: 3000 },
    optional: true,
    rtlPlacementFlip: true,
  },
  
  // Step 18: User Menu
  {
    id: 'user-menu',
    get title() {
      return getStepContent('userMenu').title;
    },
    get text() {
      return getStepContent('userMenu').text;
    },
    get icon() {
      return getStepContent('userMenu').icon;
    },
    attachTo: { selector: '[data-tour="user-menu"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="user-menu"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 19: Help Center
  {
    id: 'help-center',
    get title() {
      return getStepContent('helpCenter').title;
    },
    get text() {
      return getStepContent('helpCenter').text;
    },
    get icon() {
      return getStepContent('helpCenter').icon;
    },
    attachTo: { selector: '[data-tour="help-button"]', on: 'bottom' },
    waitFor: { selector: '[data-tour="help-button"]', timeoutMs: 3000 },
    optional: true,
  },
  
  // Step 20: Complete
  {
    id: 'complete',
    get title() {
      return getStepContent('complete').title;
    },
    get text() {
      return getStepContent('complete').text;
    },
    get icon() {
      return getStepContent('complete').icon;
    },
    attachTo: { selector: 'body', on: 'center' },
    optional: false,
  },
];
