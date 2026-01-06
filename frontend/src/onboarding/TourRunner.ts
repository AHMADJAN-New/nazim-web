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
import { dismissTour, isTourDismissed, undismissTour } from './dismissedTours';
import { getIconSvg } from './iconUtils';

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
  private isStarting: boolean = false; // Prevent concurrent start() calls (StrictMode + timers)
  private runToken = 0; // Prevents stale async "start" work
  private suppressDismissOnCancel: boolean = false; // Prevent dismiss when we cancel programmatically
  
  constructor(options: TourRunnerOptions = {}) {
    this.options = options;
    
    if (options.navigate) {
      setNavigateFunction(options.navigate);
    }
  }
  
  /**
   * Start a tour
   */
  async start(tourId: string, fromStepId?: string, options?: { force?: boolean }): Promise<boolean> {
    // Prevent concurrent starts (common in React StrictMode / multiple timers)
    if (this.isStarting) {
      debugLog({
        timestamp: Date.now(),
        type: 'warning',
        message: 'Tour start already in progress, ignoring duplicate start()',
        data: { tourId, currentTourId: this.currentTourId },
      });
      return false;
    }

    // CRITICAL: Check if tour is dismissed
    // If force=true (manual start), undismiss the tour automatically
    // If force=false or undefined (auto-start), respect dismissal
    if (isTourDismissed(tourId)) {
      if (options?.force) {
        // Manual start - undismiss the tour
        undismissTour(tourId);
        debugLog({
          timestamp: Date.now(),
          type: 'info',
          message: `Manually starting dismissed tour - undismissing: ${tourId}`,
        });
      } else {
        // Auto-start - respect dismissal
        debugLog({
          timestamp: Date.now(),
          type: 'warning',
          message: `Cannot auto-start dismissed tour: ${tourId}`,
        });
        return false;
      }
    }
    
    // CRITICAL: If a tour is already running, check if it's actually running
    // (might be stale state if tour was dismissed)
    if (this.isRunning) {
      // Use getIsRunning() which will clean up dismissed tours
      const actuallyRunning = this.getIsRunning();
      
      if (actuallyRunning) {
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
      // If getIsRunning() returned false (dismissed tour cleaned up), continue with start
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

    // Mark start in progress ASAP (prevents parallel addSteps/start)
    this.isStarting = true;
    
    // Increment run token to prevent stale async work
    const token = ++this.runToken;
    
    debugLog({
      timestamp: Date.now(),
      type: 'info',
      message: `Starting tour: ${tourId}`,
      data: { version: tourDef.version, steps: tourDef.steps.length, token },
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
    
    try {
      // Add steps
      await this.addSteps(tourDef.steps, startIndex);
    
      // Check if aborted by another start/stop
      if (token !== this.runToken) {
        debugLog({
          timestamp: Date.now(),
          type: 'warning',
          message: `Tour start aborted - another start/stop occurred`,
          data: { tourId, token, currentToken: this.runToken },
        });
        return false;
      }
    
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
    
      // Start the tour
      this.shepherdTour.start();
      
      // CRITICAL: Ensure step element is visible after starting
      setTimeout(() => {
        const stepElement = document.querySelector('.shepherd-element') as HTMLElement;
        const overlay = document.querySelector('.shepherd-modal-overlay-container') as HTMLElement;
        
        if (DEBUG) {
          console.log('[TourRunner] After tour.start():', {
            stepElementExists: !!stepElement,
            overlayExists: !!overlay,
            stepElementVisible: stepElement ? window.getComputedStyle(stepElement).display !== 'none' : false,
          });
        }
        
        if (stepElement) {
          // Force visibility
          stepElement.style.display = 'block';
          stepElement.style.visibility = 'visible';
          stepElement.style.opacity = '1';
          stepElement.style.zIndex = '100000';
          
          // Ensure it's in the DOM and visible
          if (stepElement.offsetParent === null) {
            console.warn('[TourRunner] Step element has no offsetParent - may be hidden');
          }
        } else {
          console.error('[TourRunner] Step element not found after tour.start()');
        }
      }, 200);
      
      return true;
    } finally {
      this.isStarting = false;
    }
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
    // Increment run token to abort any pending async work
    this.runToken++;
    
    if (this.shepherdTour) {
      // Programmatic stop: do NOT dismiss the tour
      this.suppressDismissOnCancel = true;
      try {
        this.shepherdTour.cancel();
      } finally {
        this.suppressDismissOnCancel = false;
      }
      this.shepherdTour = null;
    }
    
    if (this.currentTourId) {
      debugLog({
        timestamp: Date.now(),
        type: 'info',
        message: `Tour stopped: ${this.currentTourId}`,
      });
      // Cancel callback may have already fired via Shepherd 'cancel' event, but safe to call again
      this.options.onCancel?.(this.currentTourId);
    }
    
    clearActiveTourState(); // Clear session storage
    this.isRunning = false;
    this.currentTourId = null;
    this.currentTourDef = null;
  }
  
  /**
   * Check if a tour is running
   * CRITICAL: Also checks if current tour is dismissed - if so, cleans up and returns false
   */
  getIsRunning(): boolean {
    // If no tour is marked as running, return false
    if (!this.isRunning || !this.currentTourId) {
      return false;
    }
    
    // CRITICAL: If the current tour is dismissed, it's not actually running
    // Clean up the stale state
    if (isTourDismissed(this.currentTourId)) {
      if (DEBUG) {
        console.log(`[TourRunner] Tour "${this.currentTourId}" is dismissed but marked as running - cleaning up`);
      }
      const staleTourId = this.currentTourId;

      // Clean up stale state
      if (this.shepherdTour) {
        try {
          // Programmatic cleanup: do NOT dismiss the tour
          this.suppressDismissOnCancel = true;
          this.shepherdTour.cancel();
        } catch (e) {
          // Ignore errors during cleanup
        } finally {
          this.suppressDismissOnCancel = false;
        }
        this.shepherdTour = null;
      }
      clearActiveTourState();
      this.isRunning = false;
      this.currentTourId = null;
      this.currentTourDef = null;
      // Ensure provider state is reset (if cancel handler didn't run for some reason)
      this.options.onCancel?.(staleTourId);
      return false;
    }
    
    return this.isRunning;
  }
  
  /**
   * Get current tour ID
   */
  getCurrentTourId(): string | null {
    return this.currentTourId;
  }
  
  /**
   * Reset stuck tour state (if tour is marked as running but Shepherd tour is null)
   * This can happen if the page was refreshed or tour was dismissed while running
   */
  resetStuckState(): void {
    if (this.isRunning && !this.shepherdTour) {
      if (DEBUG) {
        console.log('[TourRunner] Resetting stuck tour state');
      }
      const staleTourId = this.currentTourId;
      debugLog({
        timestamp: Date.now(),
        type: 'warning',
        message: 'Resetting stuck tour state - isRunning=true but no Shepherd tour',
        data: { currentTourId: this.currentTourId },
      });
      
      this.isRunning = false;
      this.currentTourId = null;
      this.currentTourDef = null;
      clearActiveTourState();
      if (staleTourId) {
        this.options.onCancel?.(staleTourId);
      }
    }
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
        scrollTo: false, // Disable automatic scrolling to prevent dialog movement
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
      
      // CRITICAL: Remove all shepherd elements when tour completes
      const allElements = document.querySelectorAll('.shepherd-element, .shepherd-modal-overlay-container');
      allElements.forEach((el) => el.remove());
      
      // Remove active class to restore normal scrolling
      document.body.classList.remove('shepherd-active');
      document.documentElement.classList.remove('shepherd-active');
      
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
      
      // CRITICAL: Remove all shepherd elements when tour is cancelled
      const allElements = document.querySelectorAll('.shepherd-element, .shepherd-modal-overlay-container');
      allElements.forEach((el) => el.remove());
      
      // Remove active class to restore normal scrolling
      document.body.classList.remove('shepherd-active');
      document.documentElement.classList.remove('shepherd-active');
      
      // Mark tour as dismissed only when user cancels (not when we cancel programmatically)
      // Also: do not permanently dismiss initial setup tour; onboarding should remain available until completed.
      if (!this.suppressDismissOnCancel && tourDef.id !== 'initialSetup') {
        dismissTour(tourDef.id);
      }
      
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
      
      // Skip optional steps if target doesn't exist and no route change expected
      // CRITICAL: Never skip hideOnNext steps - they need to show even if element not found
      if (step.optional && !step.hideOnNext && step.attachTo?.selector && step.attachTo.selector !== 'body') {
        const el = findElement(step.attachTo.selector);
        if (!el && !step.route) {
          // Safe skip - no navigation means element won't appear
          debugLog({
            timestamp: Date.now(),
            type: 'info',
            message: `Skipping optional step "${step.id}" - target not found and no route change`,
            data: { selector: step.attachTo.selector },
          });
          continue;
        }
        // If route exists, element might appear after navigation - keep the step
      }
      
      // Log hideOnNext steps to help debug
      if (step.hideOnNext) {
        debugLog({
          timestamp: Date.now(),
          type: 'info',
          message: `Adding hideOnNext step "${step.id}" at index ${i}`,
          data: { selector: step.attachTo?.selector, route: step.route },
        });
      }
      
      const isFirst = i === startIndex;
      const isLast = i === steps.length - 1;
      
      // Create step options
      const stepOptions = await this.createStepOptions(step, i, totalSteps, isFirst, isLast, rtl);
      
      if (stepOptions) {
        this.shepherdTour.addStep(stepOptions);
        if (step.hideOnNext) {
          debugLog({
            timestamp: Date.now(),
            type: 'info',
            message: `Successfully added hideOnNext step "${step.id}" to Shepherd tour`,
          });
        }
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
    
    // Build icon HTML if provided
    const iconHtml = step.icon ? `<div class="shepherd-icon-wrapper">${getIconSvg(step.icon, 24)}</div>` : '';
    
    // Build HTML content with progress indicator
    const progressHtml = `<div class="shepherd-progress">${index + 1} / ${total}</div>`;
    const titleHtml = step.title ? `<h3 class="shepherd-title">${iconHtml}${step.title}</h3>` : (iconHtml ? `<div class="shepherd-icon-only">${iconHtml}</div>` : '');
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
      // Special handling for steps that should hide tour on next
      if (step.hideOnNext && step.waitForDialog) {
        buttons.push({
          text: rtl ? 'بعدی ←' : 'Next →',
          action: () => {
            debugLog({
              timestamp: Date.now(),
              type: 'info',
              message: `Next button clicked for hideOnNext step: ${step.id}`,
            });
            if (DEBUG) {
              console.log(`[TourRunner] Next button clicked for hideOnNext step: ${step.id}`);
            }
            try {
              this.handleHideAndWaitForDialog(step.waitForDialog!);
            } catch (error) {
              debugLog({
                timestamp: Date.now(),
                type: 'error',
                message: `Error in handleHideAndWaitForDialog for step "${step.id}"`,
                data: { error: error instanceof Error ? error.message : String(error) },
              });
              if (DEBUG) {
                console.error('[TourRunner] Error in handleHideAndWaitForDialog:', error);
              }
              // Fallback: just proceed to next step
              this.shepherdTour?.next();
            }
          },
          classes: 'shepherd-button-primary',
        });
      } else {
        buttons.push({
          text: rtl ? 'بعدی ←' : 'Next →',
          action: () => this.shepherdTour?.next(),
          classes: 'shepherd-button-primary',
        });
      }
    }
    
    // Determine attachment
    // Use a lazy resolver so steps can attach after route changes.
    let attachTo: any;
    
    if (step.attachTo && step.attachTo.selector !== 'body') {
      const placement = getRTLPlacement(step);
      attachTo = {
        element: () => findElement(step.attachTo!.selector),
        on: placement === 'center' ? 'bottom' : placement,
      };
    }
    
    // Create step options
    // CRITICAL: Always include buttons, even for optional steps
    // This ensures buttons are always available, even if element is not found
    const stepOptions: any = {
      id: step.id,
      text: `${progressHtml}${titleHtml}${textHtml}`,
      attachTo, // undefined for hideOnNext if element not found (shows centered)
      buttons: buttons.length > 0 ? buttons : [
        // Fallback: Always have at least a Next button
        {
          text: rtl ? 'بعدی ←' : 'Next →',
          action: () => this.shepherdTour?.next(),
          classes: 'shepherd-button-primary',
        },
      ],
      classes: step.classes,
      canClickTarget: step.allowClicksOnTarget ?? false,
      // CRITICAL: For hideOnNext steps, do NOT set beforeShowPromise at all.
      // Shepherd disables buttons while beforeShowPromise is pending; even Promise.resolve()
      // can cause flakiness. All setup for hideOnNext steps happens in when.show (non-blocking).
      beforeShowPromise: step.hideOnNext ? undefined : async () => {
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
            // Also, don't navigate if we're waiting for a dialog/modal (they're on the same route)
            const isWaitingForDialog = Boolean(step.waitForDialog) ||
                                      step.waitFor?.selector.includes('dialog') || 
                                      step.attachTo?.selector.includes('dialog');
            
            if (step.route && window.location.pathname !== step.route && !isWaitingForDialog) {
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
              // If waiting for dialog, wait longer for it to open
              await wait(isWaitingForDialog ? 500 : 100);
            }
            
            // Execute pre-actions
            if (step.preActions && step.preActions.length > 0) {
              await executeActions(step.preActions);
            }
            
            // Wait for element if needed (with timeout)
            // CRITICAL: For dialogs, wait longer and don't block buttons if element not found
            let targetElement: Element | null = null;
            const isDialogStep = Boolean(step.waitForDialog) ||
                                step.waitFor?.selector.includes('dialog') || 
                                step.attachTo?.selector.includes('dialog');
            
            if (step.waitFor) {
              const timeoutMs = isDialogStep ? Math.max(step.waitFor.timeoutMs || 10000, 10000) : (step.waitFor.timeoutMs || 5000);
              targetElement = await Promise.race([
                waitForVisible(step.waitFor),
                new Promise<Element | null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
              ]);
              
              if (!targetElement && !step.optional) {
                debugLog({
                  timestamp: Date.now(),
                  type: 'warning',
                  message: `WaitFor target not found for step "${step.id}"`,
                  data: { selector: step.waitFor.selector },
                });
                // For dialog steps, don't block - show step anyway (user might have closed dialog)
                if (isDialogStep) {
                  debugLog({
                    timestamp: Date.now(),
                    type: 'info',
                    message: `Dialog not found for step "${step.id}", showing step anyway (user may have closed dialog)`,
                  });
                }
              }
            } else if (step.attachTo && step.attachTo.selector !== 'body') {
              // Wait for attach target (with timeout)
              const timeoutMs = isDialogStep ? 10000 : 8000;
              targetElement = await Promise.race([
                waitForVisible({
                  selector: step.attachTo.selector,
                  timeoutMs,
                }),
                new Promise<Element | null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
              ]);
              
              if (!targetElement) {
                // DO NOT call next() here - optional steps are handled in addSteps()
                // Just show centered if element not found
                debugLog({
                  timestamp: Date.now(),
                  type: step.optional ? 'info' : 'warning',
                  message: `Attach target not found for step "${step.id}", showing centered`,
                  data: { selector: step.attachTo.selector, optional: step.optional },
                });
                // Step will show centered if element not found
                // For dialog steps, this is OK - user might have closed it, we'll show step anyway
              }
            }
            
            // Scroll to element if needed (only if element exists)
            // Do this BEFORE waiting for element to ensure smooth positioning
            if (step.scroll && step.attachTo && step.attachTo.selector !== 'body') {
              const scrollElement = findElement(step.attachTo.selector);
              if (scrollElement) {
                scrollToElement(step.attachTo.selector, step.scroll);
                // Wait longer for scroll to complete and DOM to settle
                await wait(500);
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
          this.resetShepherdUIStyles();
          this.applyOverlayInteractivity(step.allowClicksOutside === true);
          
          // CRITICAL: Ensure step element is visible after showing
          setTimeout(() => {
            const stepElement = document.querySelector('.shepherd-element') as HTMLElement;
            if (stepElement) {
              stepElement.style.display = 'block';
              stepElement.style.visibility = 'visible';
              stepElement.style.opacity = '1';
              stepElement.style.zIndex = '100000';
              
              if (DEBUG) {
                console.log('[TourRunner] Step element visibility ensured:', {
                  display: stepElement.style.display,
                  visibility: stepElement.style.visibility,
                  opacity: stepElement.style.opacity,
                  zIndex: stepElement.style.zIndex,
                  computedDisplay: window.getComputedStyle(stepElement).display,
                  computedVisibility: window.getComputedStyle(stepElement).visibility,
                });
              }
            } else if (DEBUG) {
              console.warn('[TourRunner] Step element not found after show event');
            }
          }, 100);
          
          debugLog({
            timestamp: Date.now(),
            type: 'step-end',
            message: `Step "${step.id}" shown`,
          });
          
          // Prevent dialog repositioning after step is shown
          // But allow repositioning on scroll to keep dialog visible
          const stepElement = document.querySelector('.shepherd-element');
          if (stepElement) {
            // Keep Popper.js updates enabled but with better configuration
            const popperInstance = (stepElement as any)._popper;
            if (popperInstance && popperInstance.setOptions) {
              popperInstance.setOptions({
                modifiers: [
                  ...(popperInstance.options?.modifiers || []).filter((m: any) => 
                    m.name !== 'eventListeners' && m.name !== 'preventOverflow'
                  ),
                  {
                    name: 'eventListeners',
                    enabled: true, // Enable to allow repositioning on scroll
                    options: {
                      scroll: true,
                      resize: true,
                    },
                  },
                  {
                    name: 'preventOverflow',
                    enabled: true,
                    options: {
                      boundary: 'viewport',
                      padding: 8,
                      rootBoundary: 'viewport',
                    },
                  },
                ],
              });
            }
          }
          
          // CRITICAL: Force enable buttons for ALL steps after they're shown
          // This ensures buttons are always functional, even if beforeShowPromise had issues
          this.scheduleStepInteractivity(step.id);
          
          // Ensure buttons are visible and enabled immediately
          // This is critical for optional steps (finance, settings) where element might not be found
          setTimeout(() => {
            this.forceEnableStepInteractivity(step.id);
            // Also try to find by step ID directly
            const stepEl = document.querySelector(`.shepherd-element[data-step-id="${step.id}"], .shepherd-element[id="${step.id}"]`) as HTMLElement;
            if (stepEl) {
              const buttons = stepEl.querySelectorAll<HTMLButtonElement>('button.shepherd-button');
              buttons.forEach((btn) => {
                btn.disabled = false;
                btn.removeAttribute('disabled');
                btn.removeAttribute('aria-disabled');
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
                btn.style.visibility = 'visible';
                btn.style.display = '';
              });
            }
          }, 100);
          
          // Add scroll listener to ensure buttons stay visible when scrolling
          const ensureButtonsVisible = () => {
            const stepEl = document.querySelector('.shepherd-element') as HTMLElement;
            if (stepEl) {
              const buttons = stepEl.querySelectorAll<HTMLButtonElement>('button.shepherd-button, .shepherd-button');
              buttons.forEach((btn) => {
                btn.style.visibility = 'visible';
                btn.style.display = 'inline-flex';
                btn.style.opacity = '1';
                btn.disabled = false;
                btn.removeAttribute('disabled');
              });
              
              // Ensure step element itself is visible
              stepEl.style.visibility = 'visible';
              stepEl.style.display = 'block';
              stepEl.style.opacity = '1';
              
              // Ensure footer is visible
              const footer = stepEl.querySelector('.shepherd-footer') as HTMLElement;
              if (footer) {
                footer.style.visibility = 'visible';
                footer.style.display = 'flex';
                footer.style.opacity = '1';
              }
            }
          };
          
          // Call immediately and on scroll/resize
          ensureButtonsVisible();
          const scrollHandler = () => ensureButtonsVisible();
          window.addEventListener('scroll', scrollHandler, { passive: true });
          window.addEventListener('resize', scrollHandler, { passive: true });
          
          // Clean up listeners when step is hidden
          const cleanup = () => {
            window.removeEventListener('scroll', scrollHandler);
            window.removeEventListener('resize', scrollHandler);
          };
          
          // Store cleanup function to call on hide
          (this as any)._scrollCleanup = cleanup;
          
          // For hideOnNext steps, do minimal setup after step is shown
          // This doesn't block buttons since step is already visible
          if (step.hideOnNext) {
            debugLog({
              timestamp: Date.now(),
              type: 'step-start',
              message: `Step "${step.id}" shown (hideOnNext mode - buttons should be enabled)`,
              data: { index, route: step.route, stepId: step.id },
            });
            
            // Note: Buttons are already force-enabled above for all steps
            
            // Navigate if needed (non-blocking, fire and forget)
            if (step.route && window.location.pathname !== step.route) {
              if (this.options.navigate) {
                this.options.navigate(step.route);
                // Fire and forget - don't wait
              } else {
                window.location.href = step.route;
              }
            }
            
            // Wait for element in background (non-blocking)
            if (step.waitFor) {
              void (async () => {
                try {
                  const element = await Promise.race([
                    waitForVisible(step.waitFor!),
                    new Promise<Element | null>((resolve) => setTimeout(() => resolve(null), step.waitFor!.timeoutMs || 5000)),
                  ]);
                  if (element) {
                    debugLog({
                      timestamp: Date.now(),
                      type: 'info',
                      message: `Element found for hideOnNext step "${step.id}"`,
                      data: { selector: step.waitFor!.selector },
                    });
                  } else {
                    debugLog({
                      timestamp: Date.now(),
                      type: 'warning',
                      message: `Element not found for hideOnNext step "${step.id}"`,
                      data: { selector: step.waitFor!.selector },
                    });
                  }
                } catch (error) {
                  // Ignore errors
                }
              })();
            }
            
            // Save progress (non-blocking)
            void (async () => {
              try {
                await saveProgress(tourId, step.id, tourVersion);
                saveActiveTourState({
                  tourId,
                  stepId: step.id,
                  stepIndex: index,
                  timestamp: Date.now(),
                });
              } catch (error) {
                if (DEBUG) {
                  console.warn(`[TourRunner] Failed to save progress for step "${step.id}":`, error);
                }
              }
            })();
          }
        },
        hide: () => {
          // CRITICAL: Remove this step element immediately when hiding
          const stepElement = document.querySelector(`.shepherd-element[id="${step.id}"], .shepherd-element[data-step-id="${step.id}"]`) as HTMLElement;
          if (stepElement) {
            stepElement.remove();
          }
          
          // Also remove any orphaned shepherd elements
          const allElements = document.querySelectorAll('.shepherd-element');
          const currentStep = this.shepherdTour?.getCurrentStep();
          allElements.forEach((el) => {
            const elId = el.getAttribute('id') || el.getAttribute('data-step-id');
            const currentStepId = currentStep?.id;
            // Remove if not the current step
            if (elId !== currentStepId && elId !== step.id) {
              el.remove();
            }
          });
          
          this.resetShepherdUIStyles();
          
          // Clean up scroll listeners
          if ((this as any)._scrollCleanup) {
            (this as any)._scrollCleanup();
            (this as any)._scrollCleanup = null;
          }
        },
      },
    };
    
    return stepOptions;
  }

  private resetShepherdUIStyles(): void {
    // Remove all shepherd elements except the current one
    const allElements = document.querySelectorAll('.shepherd-element');
    const currentStep = this.shepherdTour?.getCurrentStep();
    const currentStepId = currentStep?.id;
    
    allElements.forEach((el) => {
      const stepId = el.getAttribute('id') || el.getAttribute('data-step-id');
      // Only keep the current step visible, remove all others
      if (stepId !== currentStepId) {
        el.remove();
      } else {
        // Reset styles for current step
        const h = el as HTMLElement;
        h.style.display = '';
        h.style.visibility = '';
        h.style.pointerEvents = '';
        h.style.opacity = '';
      }
    });
    
    // Reset overlay styles
    const overlays = document.querySelectorAll('.shepherd-modal-overlay-container');
    overlays.forEach((el) => {
      const h = el as HTMLElement;
      h.style.display = '';
      h.style.visibility = '';
      h.style.pointerEvents = '';
      h.style.opacity = '';
    });
  }

  private scheduleStepInteractivity(stepId: string): void {
    const delays = [0, 120, 300, 600];
    delays.forEach((delay) => {
      setTimeout(() => this.forceEnableStepInteractivity(stepId), delay);
    });
  }

  private forceEnableStepInteractivity(stepId: string): void {
    // Try multiple selectors to find the step element
    const selectors = [
      `[data-shepherd-step-id="${stepId}"]`,
      `.shepherd-element[data-step-id="${stepId}"]`,
      `.shepherd-element[id="${stepId}"]`,
      `.shepherd-element`,
    ];
    
    let stepElement: HTMLElement | null = null;
    for (const selector of selectors) {
      stepElement = document.querySelector(selector) as HTMLElement | null;
      if (stepElement) break;
    }
    
    if (!stepElement) {
      // Try to find any shepherd element (fallback)
      stepElement = document.querySelector('.shepherd-element') as HTMLElement | null;
    }
    
    if (!stepElement) return;

    stepElement.style.pointerEvents = 'auto';
    stepElement.style.visibility = 'visible';
    stepElement.style.display = '';
    stepElement.style.opacity = '1';
    
    stepElement.querySelectorAll<HTMLElement>('*').forEach((el) => {
      el.style.pointerEvents = 'auto';
    });

    const buttons = stepElement.querySelectorAll<HTMLButtonElement>('button.shepherd-button, .shepherd-button');
    buttons.forEach((btn) => {
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.removeAttribute('aria-disabled');
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
      btn.style.visibility = 'visible';
      btn.style.display = '';
      // Ensure button is not hidden by CSS
      btn.classList.remove('shepherd-button-hidden');
    });

    if (DEBUG && buttons.length > 0) {
      console.log(`[TourRunner] Force-enabled ${buttons.length} button(s) for step "${stepId}"`);
    } else if (DEBUG && buttons.length === 0) {
      console.warn(`[TourRunner] No buttons found for step "${stepId}"`);
    }
  }

  private applyOverlayInteractivity(allowClicksOutside: boolean): void {
    const overlay = document.querySelector('.shepherd-modal-overlay-container') as HTMLElement | null;
    if (overlay) {
      // Always allow scrolling by making overlay non-interactive
      // This allows scroll events to pass through while keeping overlay visible
      overlay.style.pointerEvents = 'none';
      const svg = overlay.querySelector('svg');
      if (svg) {
        (svg as unknown as HTMLElement).style.pointerEvents = 'none';
      }
    }
    
    // Always allow body scrolling when tour is active
    document.body.classList.add('shepherd-active');
    document.documentElement.classList.add('shepherd-active');
  }
  
  /**
   * Update the navigate function
   */
  setNavigate(fn: (path: string) => void): void {
    this.options.navigate = fn;
    setNavigateFunction(fn);
  }
  
  /**
   * Handle hiding tour and waiting for dialog to appear
   * CRITICAL: Single-shot implementation to prevent double next() calls
   */
  private handleHideAndWaitForDialog(dialogSelector: string): void {
    const tour = this.shepherdTour;
    if (!tour) return;

    const currentStep = tour.getCurrentStep();
    if (!currentStep) return;

    let done = false;

    const restoreShepherdUI = () => {
      const els = document.querySelectorAll('.shepherd-element, .shepherd-modal-overlay-container');
      els.forEach((el) => {
        const h = el as HTMLElement;
        h.style.display = '';
        h.style.visibility = '';
        h.style.pointerEvents = '';
        h.style.opacity = '';
      });
    };

    const hideShepherdUI = () => {
      const els = document.querySelectorAll('.shepherd-element, .shepherd-modal-overlay-container');
      els.forEach((el) => {
        const h = el as HTMLElement;
        // Avoid display:none if you can; opacity is safer with Shepherd transitions
        h.style.opacity = '0';
        h.style.visibility = 'hidden';
        h.style.pointerEvents = 'none';
      });
    };

    const finishOnce = (reason: 'detected' | 'timeout') => {
      if (done) return;
      done = true;

      clearInterval(checkInterval);
      observer.disconnect();
      clearTimeout(timeoutId);

      restoreShepherdUI();

      debugLog({
        timestamp: Date.now(),
        type: reason === 'timeout' ? 'warning' : 'info',
        message: reason === 'timeout'
          ? `Timeout waiting for dialog: ${dialogSelector}, proceeding anyway`
          : `Dialog detected: ${dialogSelector}, proceeding to next step`,
      });

      setTimeout(() => {
        if (tour) { // Tour still exists
          tour.next();
        }
      }, 50);
    };

    // Hide current step and UI
    try {
      currentStep.hide();
    } catch (error) {
      if (DEBUG) {
        console.error('[TourRunner] Error hiding step:', error);
      }
    }
    hideShepherdUI();

    const safeQueryAll = (selector: string): Element[] => {
      try {
        return Array.from(document.querySelectorAll(selector));
      } catch (error) {
        if (DEBUG) {
          console.warn(`[TourRunner] Invalid dialog selector "${selector}"`, error);
        }
        return [];
      }
    };

    const pickVisibleDialog = (): Element | null => {
      // Try the provided selector first
      let candidates = safeQueryAll(dialogSelector);

      // Fallback: find any open dialog
      if (candidates.length === 0) {
        candidates = safeQueryAll(
          '[role="dialog"][data-state="open"], [role="dialog"][open], [data-state="open"][role="dialog"], [data-radix-dialog-content][data-state="open"]'
        );
      }

      return candidates.find((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) ?? null;
    };

    const observer = new MutationObserver(() => {
      if (pickVisibleDialog()) finishOnce('detected');
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-state', 'aria-hidden', 'open'],
    });

    const checkInterval = setInterval(() => {
      if (pickVisibleDialog()) finishOnce('detected');
    }, 200);

    const timeoutId = setTimeout(() => finishOnce('timeout'), 15000);
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

