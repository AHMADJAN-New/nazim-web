/**
 * Onboarding Tour System - Actions Index
 * 
 * Central registry for all tour actions.
 */

import type { TourAction } from '../types';
import {
  navigate,
  openSidebarGroup,
  closeSidebarGroup,
  openUserMenu,
  closeUserMenu,
  switchTab,
  openModal,
  closeModal,
  scrollTo,
  click,
  waitAction,
  expandSidebar,
  collapseSidebar,
  setNavigateFunction,
} from './uiActions';

export { setNavigateFunction };

/**
 * Action handler type
 */
type ActionHandler = (payload?: Record<string, unknown>) => Promise<boolean>;

/**
 * Registry of action handlers
 */
const actionHandlers: Record<string, ActionHandler> = {
  navigate: async (payload) => {
    const route = payload?.route as string;
    if (!route) return false;
    return navigate(route);
  },
  
  openSidebarGroup: async (payload) => {
    const groupId = payload?.groupId as string;
    if (!groupId) return false;
    return openSidebarGroup(groupId);
  },
  
  closeSidebarGroup: async (payload) => {
    const groupId = payload?.groupId as string;
    if (!groupId) return false;
    return closeSidebarGroup(groupId);
  },
  
  openUserMenu: async () => openUserMenu(),
  
  closeUserMenu: async () => closeUserMenu(),
  
  switchTab: async (payload) => {
    const containerId = payload?.containerId as string || '';
    const tabId = payload?.tabId as string;
    if (!tabId) return false;
    return switchTab(containerId, tabId);
  },
  
  openModal: async (payload) => {
    const modalId = payload?.modalId as string;
    if (!modalId) return false;
    return openModal(modalId);
  },
  
  closeModal: async (payload) => {
    const modalId = payload?.modalId as string;
    return closeModal(modalId);
  },
  
  scrollTo: async (payload) => {
    const selector = payload?.selector as string;
    if (!selector) return false;
    return scrollTo(selector);
  },
  
  click: async (payload) => {
    const selector = payload?.selector as string;
    if (!selector) return false;
    return click(selector);
  },
  
  wait: async (payload) => {
    const ms = (payload?.ms as number) || 500;
    return waitAction(ms);
  },
  
  expandSidebar: async () => expandSidebar(),
  
  collapseSidebar: async () => collapseSidebar(),
};

/**
 * Execute a tour action
 */
export async function executeAction(action: TourAction): Promise<boolean> {
  const handler = actionHandlers[action.type];
  
  if (!handler) {
    if (import.meta.env.DEV) {
      console.warn(`[TourActions] Unknown action type: ${action.type}`);
    }
    return false;
  }
  
  try {
    return await handler(action.payload);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[TourActions] Error executing action "${action.type}":`, error);
    }
    return false;
  }
}

/**
 * Execute multiple actions in sequence
 */
export async function executeActions(actions: TourAction[]): Promise<boolean> {
  for (const action of actions) {
    const result = await executeAction(action);
    if (!result) {
      if (import.meta.env.DEV) {
        console.warn(`[TourActions] Action "${action.type}" failed, continuing...`);
      }
    }
  }
  return true;
}

/**
 * Register a custom action handler
 */
export function registerActionHandler(type: string, handler: ActionHandler): void {
  actionHandlers[type] = handler;
}

