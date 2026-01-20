/**
 * School Setup Tour - Step Definitions
 * 
 * Defines all steps for the school setup tour.
 */

import type { TourStep } from '../../types';
import { getStepContent } from './content';

/**
 * School Setup Tour Steps
 */
export const schoolSetupSteps: TourStep[] = [
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
    route: '/settings/schools',
    optional: false,
  },
  
  // Step 2: Edit School Details
  {
    id: 'editSchoolDetails',
    get title() {
      return getStepContent('editSchoolDetails').title;
    },
    get text() {
      return getStepContent('editSchoolDetails').text;
    },
    get icon() {
      return getStepContent('editSchoolDetails').icon;
    },
    attachTo: { selector: '[data-tour="schools-edit-button"]', on: 'bottom' },
    route: '/settings/schools',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'navigate', payload: { route: '/settings/schools' } },
    ],
    waitFor: { selector: '[data-tour="schools-page"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false,
  },
  
  // Step 3: Create Academic Year
  {
    id: 'createAcademicYear',
    get title() {
      return getStepContent('createAcademicYear').title;
    },
    get text() {
      return getStepContent('createAcademicYear').text;
    },
    get icon() {
      return getStepContent('createAcademicYear').icon;
    },
    attachTo: { selector: '[data-tour="academic-years-create-button"]', on: 'bottom' },
    route: '/settings/academic-years',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'navigate', payload: { route: '/settings/academic-years' } },
    ],
    waitFor: { selector: '[data-tour="academic-years-page"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false,
  },
  
  // Step 4: Create Classes
  {
    id: 'createClasses',
    get title() {
      return getStepContent('createClasses').title;
    },
    get text() {
      return getStepContent('createClasses').text;
    },
    get icon() {
      return getStepContent('createClasses').icon;
    },
    attachTo: { selector: '[data-tour="classes-create-button"]', on: 'bottom' },
    route: '/settings/classes',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'navigate', payload: { route: '/settings/classes' } },
    ],
    waitFor: { selector: '[data-tour="classes-page"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false,
  },
  
  // Step 5: Assign Classes to Academic Year
  {
    id: 'assignClassesToYear',
    get title() {
      return getStepContent('assignClassesToYear').title;
    },
    get text() {
      return getStepContent('assignClassesToYear').text;
    },
    get icon() {
      return getStepContent('assignClassesToYear').icon;
    },
    attachTo: { selector: '[data-tour="classes-assign-to-year-button"]', on: 'bottom' },
    route: '/settings/classes',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'navigate', payload: { route: '/settings/classes' } },
    ],
    waitFor: { selector: '[data-tour="classes-assign-to-year-button"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false,
  },
  
  // Step 6: Create Subjects
  {
    id: 'createSubjects',
    get title() {
      return getStepContent('createSubjects').title;
    },
    get text() {
      return getStepContent('createSubjects').text;
    },
    get icon() {
      return getStepContent('createSubjects').icon;
    },
    attachTo: { selector: '[data-tour="subjects-create-button"]', on: 'bottom' },
    route: '/settings/subjects',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'navigate', payload: { route: '/settings/subjects' } },
    ],
    waitFor: { selector: '[data-tour="subjects-page"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false,
  },
  
  // Step 7: Assign Subjects to Classes (Class-level)
  {
    id: 'assignSubjectsClassLevel',
    get title() {
      return getStepContent('assignSubjectsClassLevel').title;
    },
    get text() {
      return getStepContent('assignSubjectsClassLevel').text;
    },
    get icon() {
      return getStepContent('assignSubjectsClassLevel').icon;
    },
    attachTo: { selector: '[data-tour="tab-classSubjects"]', on: 'bottom' },
    route: '/settings/subjects',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'navigate', payload: { route: '/settings/subjects' } },
      { type: 'switchTab', payload: { containerId: 'subjects-tabs', tabId: 'classSubjects' } },
    ],
    waitFor: { selector: '[data-tour="subjects-tabs"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false,
  },
  
  // Step 8: Assign Subjects to Classes (Academic-year scoped)
  {
    id: 'assignSubjectsAcademicYear',
    get title() {
      return getStepContent('assignSubjectsAcademicYear').title;
    },
    get text() {
      return getStepContent('assignSubjectsAcademicYear').text;
    },
    get icon() {
      return getStepContent('assignSubjectsAcademicYear').icon;
    },
    attachTo: { selector: '[data-tour="subjects-step2-academic-year"]', on: 'top' },
    route: '/settings/subjects',
    preActions: [
      { type: 'expandSidebar' },
      { type: 'openSidebarGroup', payload: { groupId: 'academicSettings' } },
      { type: 'navigate', payload: { route: '/settings/subjects' } },
      { type: 'switchTab', payload: { containerId: 'subjects-tabs', tabId: 'classSubjects' } },
    ],
    waitFor: { selector: '[data-tour="subjects-step2-academic-year"]', timeoutMs: 5000 },
    scroll: 'center',
    optional: false,
  },
];


