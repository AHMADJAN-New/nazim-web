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
 * Handles both page scrolling and scrolling within containers (like sidebar)
 * Waits for element to appear if not immediately found (for sidebar items that appear after sidebar opens)
 */
export async function scrollTo(selector: string): Promise<boolean> {
  if (DEBUG) {
    console.log(`[TourActions] Scrolling to: ${selector}`);
  }
  
  // First, try to find the element
  let element = findElement(selector);
  
  // If not found, wait for it to appear (element might be in sidebar that's still opening)
  if (!element) {
    if (DEBUG) {
      console.log(`[TourActions] Element not found immediately, waiting for: ${selector}`);
    }
    element = await waitForElement(selector, 3000);
  }
  
  if (element) {
    // Check if element is inside a scrollable sidebar container
    const sidebarContent = element.closest('[data-sidebar-content], [data-radix-scroll-area-viewport]');
    
    if (sidebarContent) {
      // Scroll within the sidebar container
      const scrollContainer = sidebarContent as HTMLElement;
      const elementRect = element.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      
      // Calculate the scroll position to center the element in the container
      const elementTop = element.getBoundingClientRect().top - containerRect.top + scrollContainer.scrollTop;
      const targetScroll = elementTop - (containerRect.height / 2) + (elementRect.height / 2);
      
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
      
      if (DEBUG) {
        console.log(`[TourActions] Scrolled within sidebar container to: ${selector}`);
      }
    } else {
      // Regular page scroll
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    await wait(400);
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
 * Check if we're on mobile (viewport width < 768px)
 */
function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

// Mutex to prevent double-click toggle when multiple steps call expandSidebar rapidly
let sidebarOpenInFlight: Promise<boolean> | null = null;

/**
 * Check if mobile sidebar (Sheet) is open
 */
function isMobileSidebarOpen(): boolean {
  const content = document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]') as HTMLElement | null;
  if (!content) return false;

  // Radix / Sheet style signals (more reliable than computed display/opacity alone)
  const dataState = content.getAttribute('data-state') || content.closest('[data-state]')?.getAttribute('data-state');
  const ariaHidden = content.getAttribute('aria-hidden') || content.closest('[aria-hidden]')?.getAttribute('aria-hidden');

  if (dataState === 'open') return true;
  if (ariaHidden === 'false') return true;

  // Visual fallback (only after state checks)
  const style = window.getComputedStyle(content);
  const rect = content.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

/**
 * Check if desktop sidebar is open
 */
function isDesktopSidebarOpen(): boolean {
  const sidebar = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement | null;
  if (!sidebar) return false;

  const state = sidebar.getAttribute('data-state');
  const collapsed = sidebar.getAttribute('data-collapsed');

  if (state === 'collapsed') return false;
  if (collapsed === 'true') return false;

  // If your sidebar uses width/min-width collapse, this catches it:
  const rect = sidebar.getBoundingClientRect();
  return rect.width > 80; // tweak if your collapsed width is different
}

/**
 * Expand the sidebar if collapsed (open-only, never toggles)
 * Handles both desktop collapsed state and mobile hidden state (Sheet)
 * Uses mutex to prevent double-click toggle when multiple steps call rapidly
 */
export async function expandSidebar(): Promise<boolean> {
  if (DEBUG) console.log('[TourActions] Expanding sidebar (open-only)');

  // Prevent double-click toggle when multiple steps call expandSidebar rapidly
  if (sidebarOpenInFlight) {
    if (DEBUG) console.log('[TourActions] expandSidebar already in-flight, awaiting...');
    return sidebarOpenInFlight;
  }

  sidebarOpenInFlight = (async () => {
    const isMobile = isMobileViewport();

    if (isMobile) {
      // If already open, do nothing
      if (isMobileSidebarOpen()) {
        if (DEBUG) console.log('[TourActions] Mobile sidebar already open');
        await wait(150);
        return true;
      }

      const triggerSelectors = [
        '[data-sidebar="trigger"]',
        '[data-sidebar-trigger]',
        '[data-tour="sidebar-trigger"]',
        'button[aria-label*="menu" i]',
        'button[aria-label*="open" i]',
      ];

      const triggerSel = triggerSelectors.find((s) => !!findElement(s));
      if (!triggerSel) {
        if (DEBUG) console.warn('[TourActions] Could not find mobile sidebar trigger');
        return false;
      }

      // Click ONCE (open-only) then wait for "open" state
      clickElement(triggerSel);

      // Wait until the sidebar is truly open (state-based)
      const maxAttempts = 30; // ~3s
      for (let i = 0; i < maxAttempts; i++) {
        if (isMobileSidebarOpen()) {
          await wait(250); // animation settle
          if (DEBUG) console.log('[TourActions] Mobile sidebar opened successfully');
          return true;
        }
        await wait(100);
      }

      if (DEBUG) console.warn('[TourActions] Mobile sidebar did not open in time');
      return false;
    }

    // Desktop
    const sidebar = findElement('[data-sidebar="sidebar"]');
    if (!sidebar) {
      if (DEBUG) console.warn('[TourActions] Could not find desktop sidebar');
      return false;
    }

    if (isDesktopSidebarOpen()) {
      if (DEBUG) console.log('[TourActions] Desktop sidebar already open');
      return true;
    }

    const triggerSelectors = [
      '[data-sidebar="trigger"]',
      '[data-sidebar-trigger]',
      '[data-tour="sidebar-trigger"]',
    ];

    const triggerSel = triggerSelectors.find((s) => !!findElement(s));
    if (!triggerSel) {
      if (DEBUG) console.warn('[TourActions] Could not find desktop sidebar trigger');
      return false;
    }

    clickElement(triggerSel);

    // Wait until open (don't just sleep)
    const maxAttempts = 20; // ~2s
    for (let i = 0; i < maxAttempts; i++) {
      if (isDesktopSidebarOpen()) {
        await wait(150);
        if (DEBUG) console.log('[TourActions] Desktop sidebar opened successfully');
        return true;
      }
      await wait(100);
    }

    if (DEBUG) console.warn('[TourActions] Desktop sidebar did not open in time');
    return false;
  })();

  try {
    return await sidebarOpenInFlight;
  } finally {
    sidebarOpenInFlight = null;
  }
}

/**
 * Collapse the sidebar if expanded
 * Handles both desktop expanded state and mobile open state
 */
export async function collapseSidebar(): Promise<boolean> {
  if (DEBUG) {
    console.log('[TourActions] Collapsing sidebar');
  }

  const isMobileSidebarVisible = (): boolean => {
    const el = document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]') as HTMLElement | null;
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };

  const waitForMobileSidebarClose = async (): Promise<void> => {
    // Poll because the sheet may unmount or animate.
    const maxAttempts = 25; // ~2.5s
    for (let i = 0; i < maxAttempts; i++) {
      if (!isMobileSidebarVisible()) return;
      await wait(100);
    }
  };
  
  // Check for mobile sidebar (Sheet)
  const mobileSidebar = document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]');
  if (mobileSidebar) {
    const style = window.getComputedStyle(mobileSidebar);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
    
    if (isVisible) {
      // Find trigger to toggle (close)
      const triggerSelectors = [
        '[data-sidebar-trigger]',
        '[data-sidebar="trigger"]',
        '[data-tour="sidebar-trigger"]',
        'button[aria-label*="menu" i]',
        'button[aria-label*="close" i]', // Close button inside sheet
      ];
      
      for (const selector of triggerSelectors) {
        // Prefer triggers outside the sidebar first (toggle button), then close button inside
        const trigger = findElement(selector);
        if (trigger) {
          clickElement(selector);
          await waitForMobileSidebarClose();
          return true;
        }
      }
      
      // Fallback: press Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await waitForMobileSidebarClose();
      return true;
    }
    return true; // Already closed (not visible)
  }

  // Desktop sidebar
  const sidebar = findElement('[data-sidebar]');
  if (sidebar) {
    const isCollapsed = sidebar.getAttribute('data-state') === 'collapsed' ||
                        sidebar.getAttribute('data-collapsed') === 'true';
    
    if (!isCollapsed) {
      const triggerSelectors = [
        '[data-sidebar-trigger]',
        '[data-sidebar="trigger"]',
      ];
      
      for (const selector of triggerSelectors) {
        const trigger = findElement(selector);
        if (trigger) {
          clickElement(selector);
          await wait(300);
          return true;
        }
      }
    }
    return true; // Already collapsed
  }
  
  return false;
}

