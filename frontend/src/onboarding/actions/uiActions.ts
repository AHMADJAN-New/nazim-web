/**
 * Onboarding Tour System - UI Actions
 * 
 * Provides actions for manipulating UI state during tours.
 */

import { findElement, clickElement, wait, waitForElement, waitForVisible } from '../dom';

const DEBUG = import.meta.env.VITE_TOUR_DEBUG === 'true';

// Store for router navigate function (set by TourProvider)
let navigateFunction: ((path: string) => void) | null = null;

/**
 * Set the navigate function from React Router
 */
export function setNavigateFunction(fn: (path: string) => void): void {
  navigateFunction = fn;
}

/**
 * Navigate to a route
 */
export async function navigate(route: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Navigating to: ${route}`);
  }
  
  if (navigateFunction) {
    navigateFunction(route);
    // Wait a bit for navigation to complete
    await wait(300);
    return true;
  }
  
  // Fallback to window.location
  if (window.location.pathname !== route) {
    window.location.href = route;
    await wait(500);
  }
  return true;
}

/**
 * Open a sidebar group by clicking its trigger
 */
export async function openSidebarGroup(groupId: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Opening sidebar group: ${groupId}`);
  }
  
  // Try to find the sidebar group trigger
  const selectors = [
    `[data-tour="sidebar-${groupId}"]`,
    `[data-tour="${groupId}"]`,
    `[data-sidebar-group="${groupId}"]`,
    `[data-collapsible-trigger="${groupId}"]`,
    // Try to find by text content (for items like academicSettings)
    `button:has-text("${groupId}")`,
  ];
  
  // Also try to find by looking for the Collapsible trigger that contains the groupId text
  // This is a fallback for items that don't have explicit data-tour attributes
  const allButtons = document.querySelectorAll('button[data-state], [role="button"]');
  for (const button of allButtons) {
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    if (text.includes(groupId.toLowerCase()) || ariaLabel.includes(groupId.toLowerCase())) {
      const isOpen = button.getAttribute('data-state') === 'open' ||
                     button.getAttribute('aria-expanded') === 'true' ||
                     button.closest('[data-state="open"]');
      
      if (!isOpen) {
        (button as HTMLElement).click();
        await wait(300);
        return true;
      }
      return true;
    }
  }
  
  for (const selector of selectors) {
    try {
      const element = findElement(selector);
      if (element) {
        // Check if it's already open
        const isOpen = element.getAttribute('data-state') === 'open' ||
                       element.getAttribute('aria-expanded') === 'true' ||
                       element.closest('[data-state="open"]');
        
        if (!isOpen) {
          clickElement(selector);
          await wait(300);
        }
        return true;
      }
    } catch (e) {
      // Invalid selector, continue
      if (DEBUG) {
        console.warn(`[TourActions] Invalid selector: ${selector}`);
      }
    }
  }
  
  if (DEBUG) {
    console.warn(`[TourActions] Could not find sidebar group: ${groupId}`);
  }
  return false;
}

/**
 * Close a sidebar group
 */
export async function closeSidebarGroup(groupId: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Closing sidebar group: ${groupId}`);
  }
  
  const selectors = [
    `[data-tour="sidebar-${groupId}"]`,
    `[data-sidebar-group="${groupId}"]`,
    `[data-collapsible-trigger="${groupId}"]`,
  ];
  
  for (const selector of selectors) {
    const element = findElement(selector);
    if (element) {
      const isOpen = element.getAttribute('data-state') === 'open' ||
                     element.getAttribute('aria-expanded') === 'true';
      
      if (isOpen) {
        clickElement(selector);
        await wait(300);
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Open the user menu dropdown
 */
export async function openUserMenu(): Promise<boolean> {
  if (DEBUG) {
    console.log('[TourActions] Opening user menu');
  }
  
  const selectors = [
    '[data-tour="user-menu"]',
    '[data-tour="user-menu-trigger"]',
    'button[aria-label*="user" i]',
    'button[aria-label*="profile" i]',
  ];
  
  for (const selector of selectors) {
    const element = findElement(selector);
    if (element) {
      clickElement(selector);
      await wait(300);
      return true;
    }
  }
  
  if (DEBUG) {
    console.warn('[TourActions] Could not find user menu trigger');
  }
  return false;
}

/**
 * Close the user menu dropdown
 */
export async function closeUserMenu(): Promise<boolean> {
  if (DEBUG) {
    console.log('[TourActions] Closing user menu');
  }
  
  // Press Escape to close any open dropdown
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(200);
  return true;
}

/**
 * Switch to a specific tab
 */
export async function switchTab(containerId: string, tabId: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Switching to tab: ${tabId} in ${containerId}`);
  }
  
  // First, try to find the tab container
  const container = findElement(`[data-tour="${containerId}"]`);
  if (!container) {
    if (DEBUG) {
      console.warn(`[TourActions] Could not find tab container: ${containerId}`);
    }
    return false;
  }
  
  // Try multiple selectors for the tab trigger
  // Priority: data-tour attribute > value attribute > role-based
  const selectors = [
    `[data-tour="tab-${tabId}"]`, // Direct data-tour on tab (e.g., data-tour="tab-overview")
    `[data-tour="${containerId}"] [data-tour="tab-${tabId}"]`, // Nested data-tour
    `[data-tour="${containerId}"] button[value="${tabId}"]`, // Button with value attribute (shadcn TabsTrigger)
    `[data-tour="${containerId}"] [role="tab"][data-state][aria-selected]`, // Role-based tab
    `[data-tour="${containerId}"] button[aria-controls*="${tabId}"]`, // Button with aria-controls
  ];
  
  let tabElement: HTMLElement | null = null;
  
  for (const selector of selectors) {
    const element = findElement(selector);
    if (element) {
      tabElement = element as HTMLElement;
      break;
    }
  }
  
  // Fallback: Try to find by data-tour attribute with tab- prefix within the container
  if (!tabElement) {
    const element = container.querySelector(`[data-tour="tab-${tabId}"]`);
    if (element) {
      tabElement = element as HTMLElement;
    }
  }
  
  // Fallback: Try to find by value attribute within the container
  if (!tabElement) {
    const element = container.querySelector(`button[value="${tabId}"]`);
    if (element) {
      tabElement = element as HTMLElement;
    }
  }
  
  if (tabElement) {
    // Check if it's already active
    const isActive = tabElement.getAttribute('data-state') === 'active' ||
                    tabElement.getAttribute('aria-selected') === 'true' ||
                    tabElement.classList.contains('active') ||
                    tabElement.classList.contains('data-[state=active]');
    
    if (!isActive) {
      // Click the element
      tabElement.click();
      
      // Wait for React to update the state and apply highlighting
      // Check multiple times to ensure the active state is applied
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        await wait(100);
        const nowActive = tabElement.getAttribute('data-state') === 'active' ||
                         tabElement.getAttribute('aria-selected') === 'true' ||
                         tabElement.classList.contains('active') ||
                         tabElement.classList.contains('data-[state=active]');
        if (nowActive) {
          if (DEBUG) {
            console.log(`[TourActions] Tab ${tabId} is now active after ${attempts + 1} attempts`);
          }
          // Wait a bit more for visual highlight to apply
          await wait(200);
          return true;
        }
        attempts++;
      }
      
      // Even if we can't detect active state, assume it worked after waiting
      await wait(300);
      if (DEBUG) {
        console.warn(`[TourActions] Tab ${tabId} clicked but active state not detected after ${maxAttempts} attempts`);
      }
      return true;
    } else {
      if (DEBUG) {
        console.log(`[TourActions] Tab ${tabId} is already active`);
      }
      return true;
    }
  }
  
  // Final fallback: Try to find by text content within the container
  const allButtons = container.querySelectorAll('button[role="tab"], [role="tab"]');
  for (const button of allButtons) {
    const text = button.textContent?.toLowerCase() || '';
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
    if (text.includes(tabId.toLowerCase()) || ariaLabel.includes(tabId.toLowerCase())) {
      const isActive = button.getAttribute('data-state') === 'active' ||
                      button.getAttribute('aria-selected') === 'true';
      if (!isActive) {
        (button as HTMLElement).click();
        // Wait for state update
        await wait(500);
        return true;
      }
      return true;
    }
  }
  
  if (DEBUG) {
    console.warn(`[TourActions] Could not find tab: ${tabId} in container: ${containerId}`);
  }
  return false;
}

/**
 * Open a modal by ID
 */
export async function openModal(modalId: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Opening modal: ${modalId}`);
  }
  
  const selectors = [
    `[data-tour="open-${modalId}"]`,
    `[data-modal-trigger="${modalId}"]`,
    `button[data-opens="${modalId}"]`,
  ];
  
  for (const selector of selectors) {
    const element = findElement(selector);
    if (element) {
      clickElement(selector);
      await wait(400);
      return true;
    }
  }
  
  if (DEBUG) {
    console.warn(`[TourActions] Could not find modal trigger: ${modalId}`);
  }
  return false;
}

/**
 * Close a modal
 */
export async function closeModal(modalId?: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Closing modal${modalId ? `: ${modalId}` : ''}`);
  }
  
  // Try to find close button
  const selectors = modalId
    ? [
        `[data-tour="close-${modalId}"]`,
        `[data-modal-close="${modalId}"]`,
        `[role="dialog"] button[aria-label*="close" i]`,
      ]
    : [
        '[role="dialog"] button[aria-label*="close" i]',
        '[data-radix-dialog-close]',
        'button[aria-label="Close"]',
      ];
  
  for (const selector of selectors) {
    const element = findElement(selector);
    if (element) {
      clickElement(selector);
      await wait(300);
      return true;
    }
  }
  
  // Fallback: press Escape
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(200);
  return true;
}

/**
 * Scroll to an element
 */
export async function scrollTo(selector: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Scrolling to: ${selector}`);
  }
  
  const element = findElement(selector);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await wait(500);
    return true;
  }
  
  if (DEBUG) {
    console.warn(`[TourActions] Could not find element to scroll to: ${selector}`);
  }
  return false;
}

/**
 * Click an element
 */
export async function click(selector: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Clicking: ${selector}`);
  }
  
  const result = clickElement(selector);
  if (result) {
    await wait(200);
  } else if (DEBUG) {
    console.warn(`[TourActions] Could not find element to click: ${selector}`);
  }
  return result;
}

/**
 * Wait for a duration
 */
export async function waitAction(ms: number): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Waiting ${ms}ms`);
  }
  await wait(ms);
  return true;
}

/**
 * Expand the sidebar if collapsed
 * Handles both desktop collapsed state and mobile hidden state
 */
export async function expandSidebar(): Promise<boolean> {
  if (DEBUG) {
    console.log('[TourActions] Expanding sidebar');
  }
  
  // Try multiple selectors for sidebar
  const sidebarSelectors = [
    '[data-sidebar]',
    '[data-tour="sidebar"]',
    '[role="complementary"]',
    'aside[data-state]',
  ];
  
  let sidebar: Element | null = null;
  for (const selector of sidebarSelectors) {
    sidebar = findElement(selector);
    if (sidebar) break;
  }
  
  if (sidebar) {
    // Check if sidebar is collapsed or hidden
    const isCollapsed = sidebar.getAttribute('data-state') === 'collapsed' ||
                        sidebar.getAttribute('data-collapsed') === 'true' ||
                        sidebar.classList.contains('collapsed') ||
                        sidebar.getAttribute('aria-hidden') === 'true';
    
    // Check if sidebar is hidden on mobile (check computed styles)
    const computedStyle = window.getComputedStyle(sidebar);
    const isHidden = computedStyle.display === 'none' || 
                     computedStyle.visibility === 'hidden' ||
                     computedStyle.transform.includes('translateX(-100%)');
    
    if (isCollapsed || isHidden) {
      // Try multiple trigger selectors
      const triggerSelectors = [
        '[data-sidebar-trigger]',
        '[data-tour="sidebar-trigger"]',
        'button[aria-label*="menu" i]',
        'button[aria-label*="sidebar" i]',
        'button[aria-label*="navigation" i]',
        '[data-radix-collapsible-trigger]',
      ];
      
      for (const selector of triggerSelectors) {
        const trigger = findElement(selector);
        if (trigger) {
          clickElement(selector);
          await wait(500); // Wait longer for mobile animations
          return true;
        }
      }
      
      // Fallback: try to find menu button in header
      const menuButton = findElement('button[aria-label*="menu" i], button[aria-label*="open" i]');
      if (menuButton) {
        clickElement('button[aria-label*="menu" i], button[aria-label*="open" i]');
        await wait(500);
        return true;
      }
    }
    return true; // Already expanded
  }
  
  // If sidebar not found, try to find and click menu button (mobile)
  const menuButton = findElement('button[aria-label*="menu" i], button[aria-label*="open" i]');
  if (menuButton) {
    clickElement('button[aria-label*="menu" i], button[aria-label*="open" i]');
    await wait(500);
    return true;
  }
  
  if (DEBUG) {
    console.warn('[TourActions] Could not find sidebar or trigger');
  }
  return false;
}

/**
 * Collapse the sidebar if expanded
 */
export async function collapseSidebar(): Promise<boolean> {
  if (DEBUG) {
    console.log('[TourActions] Collapsing sidebar');
  }
  
  const sidebar = findElement('[data-sidebar]');
  if (sidebar) {
    const isCollapsed = sidebar.getAttribute('data-state') === 'collapsed' ||
                        sidebar.getAttribute('data-collapsed') === 'true';
    
    if (!isCollapsed) {
      const trigger = findElement('[data-sidebar-trigger]');
      if (trigger) {
        clickElement('[data-sidebar-trigger]');
        await wait(300);
        return true;
      }
    }
    return true; // Already collapsed
  }
  
  return false;
}

