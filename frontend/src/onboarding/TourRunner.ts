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
    
      this.shepherdTour.start();
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
    // For hideOnNext steps, check if element exists first
    // If not, show centered (attachTo = undefined)
    let attachTo: any;
    
    if (step.attachTo && step.attachTo.selector !== 'body') {
      // For hideOnNext steps, check if element exists synchronously
      // If not, we'll show centered and wait for element in beforeShowPromise
      if (step.hideOnNext) {
        const element = findElement(step.attachTo.selector);
        if (element) {
          const placement = getRTLPlacement(step);
          attachTo = {
            element: step.attachTo.selector,
            on: placement === 'center' ? 'bottom' : placement,
          };
        } else {
          // Element doesn't exist yet - show centered, will reattach in beforeShowPromise
          attachTo = undefined;
          debugLog({
            timestamp: Date.now(),
            type: 'info',
            message: `Element not found for hideOnNext step "${step.id}", will show centered and wait`,
            data: { selector: step.attachTo.selector },
          });
        }
      } else {
        // Normal steps - check if element exists, otherwise show centered
        const element = findElement(step.attachTo.selector);
        if (element) {
          const placement = getRTLPlacement(step);
          attachTo = {
            element: step.attachTo.selector,
            on: placement === 'center' ? 'bottom' : placement,
          };
        } else {
          // Element doesn't exist - show centered (attach to body)
          attachTo = undefined;
          if (DEBUG) {
            console.log(`[TourRunner] Element not found for step "${step.id}", showing centered`);
          }
        }
      }
    }
    
    // Create step options
    const stepOptions: any = {
      id: step.id,
      text: `${progressHtml}${titleHtml}${textHtml}`,
      attachTo, // undefined for hideOnNext if element not found (shows centered)
      buttons,
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
            const isWaitingForDialog = step.waitFor?.selector.includes('dialog') || 
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
            const isDialogStep = step.waitFor?.selector.includes('dialog') || 
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
          
          // CRITICAL: Force enable buttons for ALL steps after they're shown
          // This ensures buttons are always functional, even if beforeShowPromise had issues
          setTimeout(() => {
            const stepElement = document.querySelector(`[data-shepherd-step-id="${step.id}"]`);
            if (stepElement) {
              const buttons = stepElement.querySelectorAll('.shepherd-button');
              buttons.forEach((btn) => {
                (btn as HTMLButtonElement).disabled = false;
                (btn as HTMLElement).style.pointerEvents = 'auto';
                (btn as HTMLElement).style.opacity = '1';
              });
              if (DEBUG && buttons.length > 0) {
                console.log(`[TourRunner] Force-enabled ${buttons.length} button(s) for step "${step.id}"`);
              }
            }
          }, 100);
          
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

    const pickVisibleDialog = (): Element | null => {
      // Try the data-tour selector first
      let candidates = Array.from(document.querySelectorAll(dialogSelector));
      
      // If no matches, try Radix UI dialog pattern as fallback
      if (candidates.length === 0) {
        // Try to find DialogContent with data-tour inside an open dialog
        const dialogContent = document.querySelector('[data-tour="schools-edit-dialog"]');
        if (dialogContent) {
          candidates = [dialogContent];
        } else {
          // Fallback: find any open Radix UI dialog
          candidates = Array.from(document.querySelectorAll('[role="dialog"][data-state="open"]'));
        }
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

