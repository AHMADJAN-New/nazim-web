/**
 * Onboarding Tour System - Tour Runner
 * 
 * Core engine for executing tours using Shepherd.js.
 */

import Shepherd from 'shepherd.js';
import type { Tour as ShepherdTour, Step as ShepherdStep } from 'shepherd.js';
import type { TourDefinition, TourStep, TourDebugLog } from './types';
import { getTour } from './TourRegistry';
import { completeTour, saveProgress, getLastStepId } from './storage';
import { getRTLPlacement, isRTL, getTextDirection } from './rtl';
import { waitForVisible, scrollToElement, waitForRouteChange, wait, findElement } from './dom';
import { executeActions, setNavigateFunction } from './actions';
import { saveActiveTourState, clearActiveTourState } from './sessionStorage';
import { dismissTour } from './dismissedTours';

const DEBUG = import.meta.env.VITE_TOUR_DEBUG === 'true';

/**
 * Debug logger
 */
function debugLog(log: TourDebugLog): void {
  if (!DEBUG) return;
  
  const prefix = `[Tour:${log.type}]`;
  const timestamp = new Date(log.timestamp).toISOString();
  
  switch (log.type) {
    case 'error':
      console.error(prefix, timestamp, log.message, log.data);
      break;
    case 'warning':
      console.warn(prefix, timestamp, log.message, log.data);
      break;
    default:
      console.log(prefix, timestamp, log.message, log.data);
  }
}

/**
 * Tour runner options
 */
export interface TourRunnerOptions {
  /** Function to navigate to a route */
  navigate?: (path: string) => void;
  /** Callback when tour starts */
  onStart?: (tourId: string) => void;
  /** Callback when tour completes */
  onComplete?: (tourId: string) => void;
  /** Callback when tour is cancelled */
  onCancel?: (tourId: string) => void;
  /** Callback when step changes */
  onStepChange?: (stepId: string, stepIndex: number, totalSteps: number) => void;
}

/**
 * Tour Runner class
 */
export class TourRunner {
  private shepherdTour: ShepherdTour | null = null;
  private currentTourId: string | null = null;
  private currentTourDef: TourDefinition | null = null;
  private options: TourRunnerOptions;
  private isRunning: boolean = false;
  
  constructor(options: TourRunnerOptions = {}) {
    this.options = options;
    
    if (options.navigate) {
      setNavigateFunction(options.navigate);
    }
  }
  
  /**
   * Start a tour
   */
  async start(tourId: string, fromStepId?: string): Promise<boolean> {
    // CRITICAL: If a tour is already running, don't start a new one
    // This prevents duplicate tours from showing
    if (this.isRunning) {
      debugLog({
        timestamp: Date.now(),
        type: 'warning',
        message: 'Tour already running, cannot start new tour',
        data: { currentTourId: this.currentTourId, newTourId: tourId },
      });
      
      // If it's the same tour, just continue (don't restart)
      if (this.currentTourId === tourId) {
        if (DEBUG) {
          console.log(`[TourRunner] Tour "${tourId}" is already running, continuing...`);
        }
        return true;
      }
      
      // Different tour - stop current and start new (but log warning)
      this.stop();
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const tourDef = getTour(tourId);
    if (!tourDef) {
      debugLog({
        timestamp: Date.now(),
        type: 'error',
        message: `Tour not found: ${tourId}`,
      });
      return false;
    }
    
    this.currentTourId = tourId;
    this.currentTourDef = tourDef;
    
    debugLog({
      timestamp: Date.now(),
      type: 'info',
      message: `Starting tour: ${tourId}`,
      data: { version: tourDef.version, steps: tourDef.steps.length },
    });
    
    // Create Shepherd tour
    this.shepherdTour = this.createShepherdTour(tourDef);
    
    // Find starting step
    let startIndex = 0;
    if (fromStepId) {
      const index = tourDef.steps.findIndex((s) => s.id === fromStepId);
      if (index >= 0) {
        startIndex = index;
      }
    }
    
    // Add steps
    await this.addSteps(tourDef.steps, startIndex);
    
    // Start the tour
    this.isRunning = true;
    this.options.onStart?.(tourId);
    
    // Save active tour state to sessionStorage
    saveActiveTourState({
      tourId,
      stepId: tourDef.steps[startIndex]?.id || '',
      stepIndex: startIndex,
      timestamp: Date.now(),
    });
    
    this.shepherdTour.start();
    
    return true;
  }
  
  /**
   * Resume a tour from the last saved step
   */
  async resume(tourId: string): Promise<boolean> {
    const lastStepId = await getLastStepId(tourId);
    return this.start(tourId, lastStepId || undefined);
  }
  
  /**
   * Stop the current tour
   */
  stop(): void {
    if (this.shepherdTour) {
      this.shepherdTour.cancel();
      this.shepherdTour = null;
    }
    
    if (this.currentTourId) {
      debugLog({
        timestamp: Date.now(),
        type: 'info',
        message: `Tour stopped: ${this.currentTourId}`,
      });
      this.options.onCancel?.(this.currentTourId);
    }
    
    clearActiveTourState(); // Clear session storage
    this.isRunning = false;
    this.currentTourId = null;
    this.currentTourDef = null;
  }
  
  /**
   * Check if a tour is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Get current tour ID
   */
  getCurrentTourId(): string | null {
    return this.currentTourId;
  }
  
  /**
   * Get current step info
   */
  getCurrentStep(): { id: string; index: number; total: number } | null {
    if (!this.shepherdTour || !this.currentTourDef) return null;
    
    const currentStep = this.shepherdTour.getCurrentStep();
    if (!currentStep) return null;
    
    const index = this.shepherdTour.steps.indexOf(currentStep);
    return {
      id: currentStep.id || '',
      index,
      total: this.shepherdTour.steps.length,
    };
  }
  
  /**
   * Create a Shepherd tour instance
   */
  private createShepherdTour(tourDef: TourDefinition): ShepherdTour {
    const rtl = isRTL();
    
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: `shepherd-theme-nazim ${rtl ? 'shepherd-rtl' : 'shepherd-ltr'}`,
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
          enabled: true,
        },
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
      },
      exitOnEsc: true,
      keyboardNavigation: true,
    });
    
    // Event handlers
    tour.on('complete', async () => {
      debugLog({
        timestamp: Date.now(),
        type: 'info',
        message: `Tour completed: ${tourDef.id}`,
      });
      
      // Mark as completed in database (with localStorage fallback)
      await completeTour(tourDef.id, tourDef.version);
      clearActiveTourState(); // Clear session storage
      this.isRunning = false;
      this.options.onComplete?.(tourDef.id);
      this.currentTourId = null;
      this.currentTourDef = null;
    });
    
    tour.on('cancel', () => {
      debugLog({
        timestamp: Date.now(),
        type: 'info',
        message: `Tour cancelled: ${tourDef.id}`,
      });
      
      // Mark tour as dismissed if user cancelled it
      dismissTour(tourDef.id);
      
      clearActiveTourState(); // Clear session storage
      this.isRunning = false;
      this.options.onCancel?.(tourDef.id);
      this.currentTourId = null;
      this.currentTourDef = null;
    });
    
    return tour;
  }
  
  /**
   * Add steps to the Shepherd tour
   */
  private async addSteps(steps: TourStep[], startIndex: number = 0): Promise<void> {
    if (!this.shepherdTour || !this.currentTourDef) return;
    
    const rtl = isRTL();
    const totalSteps = steps.length;
    
    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];
      const isFirst = i === startIndex;
      const isLast = i === steps.length - 1;
      
      // Create step options
      const stepOptions = await this.createStepOptions(step, i, totalSteps, isFirst, isLast, rtl);
      
      if (stepOptions) {
        this.shepherdTour.addStep(stepOptions);
      }
    }
  }
  
  /**
   * Create Shepherd step options from a TourStep
   */
  private async createStepOptions(
    step: TourStep,
    index: number,
    total: number,
    isFirst: boolean,
    isLast: boolean,
    rtl: boolean
  ): Promise<any> {
    const tourId = this.currentTourId!;
    const tourVersion = this.currentTourDef!.version;
    
    // Build text content
    const textContent = Array.isArray(step.text) 
      ? step.text.join('<br/><br/>') 
      : step.text;
    
    // Build HTML content with progress indicator
    const progressHtml = `<div class="shepherd-progress">${index + 1} / ${total}</div>`;
    const titleHtml = step.title ? `<h3 class="shepherd-title">${step.title}</h3>` : '';
    const textHtml = `<div class="shepherd-text" dir="${getTextDirection()}">${textContent}</div>`;
    
    // Build buttons
    const buttons: any[] = [];
    
    if (!isFirst) {
      buttons.push({
        text: rtl ? '→ قبلی' : '← Back',
        action: () => this.shepherdTour?.back(),
        classes: 'shepherd-button-secondary',
      });
    }
    
    if (isLast) {
      buttons.push({
        text: rtl ? 'پای' : 'Finish',
        action: () => this.shepherdTour?.complete(),
        classes: 'shepherd-button-primary',
      });
    } else {
      buttons.push({
        text: rtl ? 'بعدی ←' : 'Next →',
        action: () => this.shepherdTour?.next(),
        classes: 'shepherd-button-primary',
      });
    }
    
    // Determine attachment
    let attachTo: any;
    
    if (step.attachTo && step.attachTo.selector !== 'body') {
      const placement = getRTLPlacement(step);
      attachTo = {
        element: step.attachTo.selector,
        on: placement === 'center' ? 'bottom' : placement,
      };
    }
    
    // Create step options
    const stepOptions: any = {
      id: step.id,
      text: `${progressHtml}${titleHtml}${textHtml}`,
      attachTo,
      buttons,
      classes: step.classes,
      canClickTarget: step.allowClicksOnTarget ?? false,
      beforeShowPromise: async () => {
        // CRITICAL: Add timeout to ensure promise always resolves
        // This prevents buttons from being stuck
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            if (DEBUG) {
              console.warn(`[TourRunner] beforeShowPromise timeout for step "${step.id}" - forcing resolve`);
            }
            resolve();
          }, 10000); // 10 second max timeout
        });
        
        const stepPromise = (async () => {
          try {
            debugLog({
              timestamp: Date.now(),
              type: 'step-start',
              message: `Step "${step.id}" starting`,
              data: { index, route: step.route, preActions: step.preActions?.length },
            });
            
            // Navigate if needed (only if not already on the route)
            // CRITICAL: Don't navigate if we're already on the target route
            // This prevents redirecting away from pages like /settings/schools
            if (step.route && window.location.pathname !== step.route) {
              if (this.options.navigate) {
                this.options.navigate(step.route);
                // Reduced wait time - just wait for route change, not extra delay
                await waitForRouteChange(step.route, 3000);
                await wait(100); // Minimal wait after navigation
              } else {
                window.location.href = step.route;
                await wait(500);
              }
            } else if (step.route && window.location.pathname === step.route) {
              // Already on the correct route - just wait a bit for page to be ready
              await wait(100);
            }
            
            // Execute pre-actions
            if (step.preActions && step.preActions.length > 0) {
              await executeActions(step.preActions);
            }
            
            // Wait for element if needed (with timeout)
            let targetElement: Element | null = null;
            if (step.waitFor) {
              targetElement = await Promise.race([
                waitForVisible(step.waitFor),
                new Promise<Element | null>((resolve) => setTimeout(() => resolve(null), step.waitFor!.timeoutMs || 5000)),
              ]);
              
              if (!targetElement && !step.optional) {
                debugLog({
                  timestamp: Date.now(),
                  type: 'warning',
                  message: `WaitFor target not found for step "${step.id}"`,
                  data: { selector: step.waitFor.selector },
                });
              }
            } else if (step.attachTo && step.attachTo.selector !== 'body') {
              // Wait for attach target (with timeout)
              targetElement = await Promise.race([
                waitForVisible({
                  selector: step.attachTo.selector,
                  timeoutMs: 8000, // Increased timeout for dialogs that might take time to open
                }),
                new Promise<Element | null>((resolve) => setTimeout(() => resolve(null), 8000)),
              ]);
              
              if (!targetElement) {
                if (step.optional) {
                  debugLog({
                    timestamp: Date.now(),
                    type: 'info',
                    message: `Skipping optional step "${step.id}" - target not found`,
                  });
                  // Skip this step
                  setTimeout(() => this.shepherdTour?.next(), 100);
                  return;
                }
                
                debugLog({
                  timestamp: Date.now(),
                  type: 'warning',
                  message: `Attach target not found for step "${step.id}", showing centered`,
                  data: { selector: step.attachTo.selector },
                });
                // Step will show centered if element not found
              }
            }
            
            // Scroll to element if needed (only if element exists)
            if (step.scroll && step.attachTo && step.attachTo.selector !== 'body') {
              const scrollElement = findElement(step.attachTo.selector);
              if (scrollElement) {
                scrollToElement(step.attachTo.selector, step.scroll);
                await wait(300);
              }
            }
            
            // Save progress (to database with localStorage fallback) - don't block on this
            // Use void to fire and forget
            void (async () => {
              try {
                await saveProgress(tourId, step.id, tourVersion);
              } catch (error) {
                if (DEBUG) {
                  console.warn(`[TourRunner] Failed to save progress for step "${step.id}":`, error);
                }
              }
            })();
            
            // Save active tour state to sessionStorage (for navigation persistence)
            try {
              saveActiveTourState({
                tourId,
                stepId: step.id,
                stepIndex: index,
                timestamp: Date.now(),
              });
            } catch (error) {
              if (DEBUG) {
                console.warn(`[TourRunner] Failed to save active tour state:`, error);
              }
            }
            
            // Notify step change
            this.options.onStepChange?.(step.id, index, total);
            
            // CRITICAL: Promise must resolve for buttons to work
            // Always return/resolve, even if there were errors
            return;
          } catch (error) {
            debugLog({
              timestamp: Date.now(),
              type: 'error',
              message: `Error in beforeShowPromise for step "${step.id}"`,
              data: { error: error instanceof Error ? error.message : String(error) },
            });
            // CRITICAL: Always resolve - don't block the step from showing
            // This ensures buttons are always functional
            return;
          }
        })();
        
        // Race between step promise and timeout - whichever finishes first wins
        // This ensures buttons are always functional even if something hangs
        return Promise.race([stepPromise, timeoutPromise]);
      },
      when: {
        show: () => {
          debugLog({
            timestamp: Date.now(),
            type: 'step-end',
            message: `Step "${step.id}" shown`,
          });
        },
      },
    };
    
    return stepOptions;
  }
  
  /**
   * Update the navigate function
   */
  setNavigate(fn: (path: string) => void): void {
    this.options.navigate = fn;
    setNavigateFunction(fn);
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
  }
}

/**
 * Create a tour runner instance
 */
export function createTourRunner(options?: TourRunnerOptions): TourRunner {
  return new TourRunner(options);
}

