/**
 * Onboarding Tour System - DOM Utilities
 * 
 * Provides utilities for DOM manipulation, element finding, and waiting.
 */

import type { ScrollBehavior, WaitForConfig } from './types';

const DEBUG = import.meta.env.VITE_TOUR_DEBUG === 'true';

/**
 * Find an element by CSS selector
 */
export function findElement(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch (error) {
    if (DEBUG) {
      console.warn(`[TourDOM] Invalid selector "${selector}":`, error);
    }
    return null;
  }
}

/**
 * Check if an element is visible in the viewport
 */
export function isElementVisible(element: Element): boolean {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  
  // Check if element has dimensions
  if (rect.width === 0 || rect.height === 0) return false;
  
  // Check CSS visibility
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  
  return true;
}

/**
 * Check if an element exists and optionally is visible
 */
export function elementExists(selector: string, checkVisible: boolean = false): boolean {
  const element = findElement(selector);
  if (!element) return false;
  if (checkVisible) return isElementVisible(element);
  return true;
}

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeoutMs: number = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const existing = findElement(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    
    const startTime = Date.now();
    
    // Use MutationObserver for efficient waiting
    const observer = new MutationObserver(() => {
      const element = findElement(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      } else if (Date.now() - startTime > timeoutMs) {
        observer.disconnect();
        if (DEBUG) {
          console.warn(`[TourDOM] Timeout waiting for element "${selector}"`);
        }
        resolve(null);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    
    // Also set a timeout as a fallback
    setTimeout(() => {
      observer.disconnect();
      const element = findElement(selector);
      resolve(element);
    }, timeoutMs);
  });
}

/**
 * Wait for an element to be visible
 */
export function waitForVisible(
  config: WaitForConfig
): Promise<Element | null> {
  const { selector, timeoutMs = 5000, visible = true } = config;
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      const element = findElement(selector);
      
      if (element) {
        if (!visible || isElementVisible(element)) {
          resolve(element);
          return;
        }
      }
      
      if (Date.now() - startTime > timeoutMs) {
        if (DEBUG) {
          console.warn(
            `[TourDOM] Timeout waiting for ${visible ? 'visible ' : ''}element "${selector}"`
          );
        }
        resolve(null);
        return;
      }
      
      requestAnimationFrame(check);
    };
    
    check();
  });
}

/**
 * Scroll an element into view
 */
export function scrollToElement(
  selector: string,
  behavior: ScrollBehavior = 'center'
): void {
  const element = findElement(selector);
  if (!element) {
    if (DEBUG) {
      console.warn(`[TourDOM] Cannot scroll to element "${selector}" - not found`);
    }
    return;
  }
  
  const blockMap: Record<ScrollBehavior, ScrollLogicalPosition> = {
    center: 'center',
    start: 'start',
    end: 'end',
    nearest: 'nearest',
  };
  
  element.scrollIntoView({
    behavior: 'smooth',
    block: blockMap[behavior],
    inline: 'nearest',
  });
}

/**
 * Wait for a route change to complete
 */
export function waitForRouteChange(
  expectedPath: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      const currentPath = window.location.pathname;
      
      // Check if current path matches or starts with expected path
      if (currentPath === expectedPath || currentPath.startsWith(expectedPath)) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        if (DEBUG) {
          console.warn(
            `[TourDOM] Timeout waiting for route "${expectedPath}", current: "${currentPath}"`
          );
        }
        resolve(false);
        return;
      }
      
      requestAnimationFrame(check);
    };
    
    check();
  });
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the current scroll position
 */
export function getScrollPosition(): { x: number; y: number } {
  return {
    x: window.scrollX || document.documentElement.scrollLeft,
    y: window.scrollY || document.documentElement.scrollTop,
  };
}

/**
 * Scroll to a specific position
 */
export function scrollTo(x: number, y: number, smooth: boolean = true): void {
  window.scrollTo({
    left: x,
    top: y,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

/**
 * Focus an element
 */
export function focusElement(selector: string): boolean {
  const element = findElement(selector);
  if (element && element instanceof HTMLElement) {
    element.focus();
    return true;
  }
  return false;
}

/**
 * Click an element
 */
export function clickElement(selector: string): boolean {
  const element = findElement(selector);
  if (element && element instanceof HTMLElement) {
    element.click();
    return true;
  }
  return false;
}

