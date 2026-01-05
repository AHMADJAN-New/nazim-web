/**
 * Onboarding Tour System - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the tour system.
 */

/**
 * Placement options for tour steps
 */
export type TourPlacement = 
  | 'top' 
  | 'top-start' 
  | 'top-end' 
  | 'bottom' 
  | 'bottom-start' 
  | 'bottom-end' 
  | 'left' 
  | 'left-start' 
  | 'left-end' 
  | 'right' 
  | 'right-start' 
  | 'right-end' 
  | 'center'
  | 'auto';

/**
 * Scroll behavior options
 */
export type ScrollBehavior = 'center' | 'start' | 'end' | 'nearest';

/**
 * Action types that can be executed before showing a step
 */
export type ActionType = 
  | 'navigate'
  | 'expandSidebar'
  | 'collapseSidebar'
  | 'openSidebarGroup'
  | 'closeSidebarGroup'
  | 'openUserMenu'
  | 'closeUserMenu'
  | 'switchTab'
  | 'openModal'
  | 'closeModal'
  | 'scrollTo'
  | 'click'
  | 'wait';

/**
 * Pre-action to execute before showing a step
 */
export interface TourAction {
  type: ActionType;
  payload?: Record<string, unknown>;
}

/**
 * Wait-for configuration to wait for an element before showing a step
 */
export interface WaitForConfig {
  /** CSS selector to wait for */
  selector: string;
  /** Timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
  /** Whether the element should be visible (default: true) */
  visible?: boolean;
}

/**
 * Attach-to configuration for positioning a step relative to an element
 */
export interface AttachToConfig {
  /** CSS selector for the target element */
  selector: string;
  /** Placement relative to the target */
  on: TourPlacement;
}

/**
 * A single step in a tour
 */
export interface TourStep {
  /** Unique identifier for this step */
  id: string;
  /** Title displayed in the step header (optional) */
  title?: string;
  /** Content text - can be a string or array of strings for multiple paragraphs */
  text: string | string[];
  /** Element to attach the step to (optional - centered if not provided) */
  attachTo?: AttachToConfig;
  /** Route to navigate to before showing this step (optional) */
  route?: string;
  /** Actions to execute before showing this step */
  preActions?: TourAction[];
  /** Wait for an element before showing this step */
  waitFor?: WaitForConfig;
  /** Scroll behavior when showing this step */
  scroll?: ScrollBehavior;
  /** Allow clicks on the target element while step is shown */
  allowClicksOnTarget?: boolean;
  /** If true, skip this step silently if target is not found */
  optional?: boolean;
  /** Whether to flip placement for RTL languages (default: true) */
  rtlPlacementFlip?: boolean;
  /** Additional CSS classes for this step */
  classes?: string;
  /** Custom buttons for this step */
  buttons?: TourStepButton[];
  /** If true, hide tour overlay when Next is clicked and wait for user interaction */
  hideOnNext?: boolean;
  /** Selector for dialog to wait for when hideOnNext is true */
  waitForDialog?: string;
}

/**
 * Button configuration for a tour step
 */
export interface TourStepButton {
  /** Button text */
  text: string;
  /** Action to perform: 'next', 'back', 'complete', 'cancel', or custom function */
  action: 'next' | 'back' | 'complete' | 'cancel' | (() => void);
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Additional CSS classes */
  classes?: string;
}

/**
 * Context passed to tour eligibility functions
 */
export interface TourContext {
  /** Check if a tour has been completed (synchronous - uses localStorage) */
  isTourCompleted: (tourId: string) => boolean;
  /** Get the current tour version (synchronous - uses localStorage) */
  getTourVersion: (tourId: string) => string | null;
  /** Check if user is authenticated */
  isAuthenticated: boolean;
  /** Current route path */
  currentRoute: string;
  /** Current language */
  language: string;
  /** Whether the current language is RTL */
  isRTL: boolean;
  /** User profile data (optional) */
  profile?: {
    has_completed_onboarding?: boolean;
    has_completed_tour?: boolean;
    [key: string]: unknown;
  } | null;
}

/**
 * Definition of a complete tour
 */
export interface TourDefinition {
  /** Unique identifier for this tour */
  id: string;
  /** Version string for tracking tour updates */
  version: string;
  /** Display title for the tour */
  title: string;
  /** Description of what this tour covers */
  description: string;
  /** Array of steps in this tour */
  steps: TourStep[];
  /** Function to determine if user is eligible for this tour */
  eligible?: (ctx: TourContext) => boolean;
  /** Priority for auto-starting tours (higher = more important) */
  priority?: number;
}

/**
 * State stored in localStorage for a tour
 */
export interface TourState {
  /** Whether the tour has been completed */
  completed: boolean;
  /** Version of the tour that was completed */
  version: string | null;
  /** ID of the last step shown (for resuming) */
  lastStepId: string | null;
  /** Timestamp of last interaction */
  lastUpdated: number;
}

/**
 * Global tour context state
 */
export interface TourContextState {
  /** Currently active tour ID */
  activeTourId: string | null;
  /** Whether a tour is currently running */
  isRunning: boolean;
  /** Current step ID */
  currentStepId: string | null;
  /** Current step index */
  currentStepIndex: number;
  /** Total number of steps in current tour */
  totalSteps: number;
}

/**
 * Tour provider context value
 */
export interface TourProviderContextValue {
  /** Current tour state */
  state: TourContextState;
  /** Start a tour by ID */
  startTour: (tourId: string, fromStep?: string) => Promise<void>;
  /** Resume a previously started tour */
  resumeTour: (tourId: string) => Promise<void>;
  /** Stop the current tour */
  stopTour: () => void;
  /** Reset a tour's completion state */
  resetTour: (tourId: string) => void;
  /** Check if a tour has been completed */
  isTourCompleted: (tourId: string) => boolean;
  /** Get available tours for the current context */
  getAvailableTours: () => TourDefinition[];
}

/**
 * Debug log entry
 */
export interface TourDebugLog {
  timestamp: number;
  type: 'step-start' | 'step-end' | 'action' | 'waitFor' | 'error' | 'warning' | 'info';
  message: string;
  data?: Record<string, unknown>;
}

