/**
 * Onboarding Tour System - Main Exports
 * 
 * Central export file for the onboarding tour system.
 */

// Types
export type {
  TourStep,
  TourDefinition,
  TourContext,
  TourContextState,
  TourProviderContextValue,
  TourAction,
  TourPlacement,
  TourState,
  WaitForConfig,
  AttachToConfig,
  ScrollBehavior,
  ActionType,
  TourStepButton,
  TourDebugLog,
} from './types';

// Provider and hooks
export {
  TourProvider,
  useTour,
  useTourCompleted,
  useAvailableTours,
  useTourState,
  registerTour,
} from './TourProvider';

// Registry
export {
  getTour,
  getAllTours,
  getEligibleTours,
  hasTour,
  getTourCount,
  clearRegistry,
  getTourIds,
  unregisterTour,
} from './TourRegistry';

// Storage
export {
  getTourState,
  setTourState,
  completeTour,
  saveProgress,
  resetTour,
  isTourCompleted,
  isTourCompletedWithVersion,
  getLastStepId,
  getTourVersion,
  getAllTourStates,
  clearAllTourStates,
} from './storage';

// RTL utilities
export {
  isRTL,
  getCurrentLanguage,
  flipPlacement,
  getRTLPlacement,
  getRTLClasses,
  getTextDirection,
} from './rtl';

// DOM utilities
export {
  findElement,
  isElementVisible,
  elementExists,
  waitForElement,
  waitForVisible,
  scrollToElement,
  waitForRouteChange,
  wait,
  getScrollPosition,
  scrollTo,
  focusElement,
  clickElement,
} from './dom';

// Actions
export {
  executeAction,
  executeActions,
  registerActionHandler,
  setNavigateFunction,
} from './actions';

// Tour Runner
export { TourRunner, createTourRunner } from './TourRunner';
export type { TourRunnerOptions } from './TourRunner';

// Tours
export { appCoreTour } from './tours/appCore';

// Session storage (for navigation persistence)
export {
  saveActiveTourState,
  getActiveTourState,
  clearActiveTourState,
  hasActiveTourState,
} from './sessionStorage';

// Dismissed tours tracking
export {
  getDismissedTours,
  dismissTour,
  isTourDismissed,
  clearDismissedTours,
  undismissTour,
} from './dismissedTours';

