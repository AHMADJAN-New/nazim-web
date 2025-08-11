import { logger } from './logger';

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PWAManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private installPrompt: PWAInstallPrompt | null = null;
  private isOnline = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.setupOnlineOfflineListeners();
    this.setupInstallPromptListener();
  }

  // Service Worker Registration
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported', { component: 'PWA' });
      return null;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      logger.info('Service Worker registered', {
        component: 'PWA',
        metadata: { scope: this.swRegistration.scope },
      });

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.info('New Service Worker available', { component: 'PWA' });
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      return this.swRegistration;
    } catch (error) {
      logger.error('Service Worker registration failed', {
        component: 'PWA',
        metadata: { error: error.toString() },
      });
      return null;
    }
  }

  // Update Service Worker
  async updateServiceWorker(): Promise<void> {
    if (this.swRegistration) {
      try {
        await this.swRegistration.update();
        logger.info('Service Worker update check completed', { component: 'PWA' });
      } catch (error) {
        logger.error('Service Worker update failed', {
          component: 'PWA',
          metadata: { error: error.toString() },
        });
      }
    }
  }

  // Skip waiting and activate new service worker
  skipWaiting(): void {
    if (this.swRegistration?.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Notify user about available update
  private notifyUpdateAvailable(): void {
    // You can show a custom UI here
    if (confirm('A new version is available. Would you like to update?')) {
      this.skipWaiting();
    }
  }

  // Install Prompt Handling
  private setupInstallPromptListener(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as any;
      
      logger.info('Install prompt available', { component: 'PWA' });
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      logger.info('App installed', { component: 'PWA' });
      this.installPrompt = null;
    });
  }

  // Show install prompt
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) {
      logger.warn('Install prompt not available', { component: 'PWA' });
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const choiceResult = await this.installPrompt.userChoice;
      
      logger.info('Install prompt result', {
        component: 'PWA',
        metadata: { outcome: choiceResult.outcome },
      });

      this.installPrompt = null;
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      logger.error('Install prompt failed', {
        component: 'PWA',
        metadata: { error: error.toString() },
      });
      return false;
    }
  }

  // Check if app is installable
  isInstallable(): boolean {
    return this.installPrompt !== null;
  }

  // Check if app is installed (running as PWA)
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Push Notifications
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.warn('Notifications not supported', { component: 'PWA' });
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    
    logger.info('Notification permission', {
      component: 'PWA',
      metadata: { permission },
    });

    return permission;
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      logger.warn('Service Worker not registered', { component: 'PWA' });
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });

      logger.info('Push subscription created', {
        component: 'PWA',
        metadata: { endpoint: subscription.endpoint },
      });

      return subscription;
    } catch (error) {
      logger.error('Push subscription failed', {
        component: 'PWA',
        metadata: { error: error.toString() },
      });
      return null;
    }
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.swRegistration) {
      logger.warn('Service Worker not available for notifications', { component: 'PWA' });
      return;
    }

    try {
      await this.swRegistration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/badge-72x72.png',
        tag: options.tag,
        data: options.data,
        actions: options.actions,
        vibrate: [100, 50, 100],
        requireInteraction: false,
      });

      logger.info('Notification shown', {
        component: 'PWA',
        metadata: { title: options.title },
      });
    } catch (error) {
      logger.error('Failed to show notification', {
        component: 'PWA',
        metadata: { error: error.toString() },
      });
    }
  }

  // Online/Offline Detection
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('App came online', { component: 'PWA' });
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.info('App went offline', { component: 'PWA' });
      this.notifyListeners(false);
    });
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(callback => callback(isOnline));
  }

  // Background Sync
  async scheduleBackgroundSync(tag: string): Promise<void> {
    if (!this.swRegistration || !('sync' in this.swRegistration)) {
      logger.warn('Background Sync not supported', { component: 'PWA' });
      return;
    }

    try {
      await this.swRegistration.sync.register(tag);
      logger.info('Background sync scheduled', {
        component: 'PWA',
        metadata: { tag },
      });
    } catch (error) {
      logger.error('Background sync failed', {
        component: 'PWA',
        metadata: { tag, error: error.toString() },
      });
    }
  }

  // Cache Management
  async clearCache(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      const channel = new MessageChannel();
      
      const promise = new Promise<void>((resolve) => {
        channel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve();
          }
        };
      });

      this.swRegistration.active?.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );

      await promise;
      
      logger.info('Cache cleared', { component: 'PWA' });
    } catch (error) {
      logger.error('Failed to clear cache', {
        component: 'PWA',
        metadata: { error: error.toString() },
      });
    }
  }

  async getCacheSize(): Promise<number> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      logger.error('Failed to get cache size', {
        component: 'PWA',
        metadata: { error: error.toString() },
      });
      return 0;
    }
  }

  // Share API
  async share(data: ShareData): Promise<boolean> {
    if (!navigator.share) {
      logger.warn('Web Share API not supported', { component: 'PWA' });
      return false;
    }

    try {
      await navigator.share(data);
      logger.info('Content shared', {
        component: 'PWA',
        metadata: { title: data.title },
      });
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        logger.error('Share failed', {
          component: 'PWA',
          metadata: { error: error.toString() },
        });
      }
      return false;
    }
  }

  canShare(data?: ShareData): boolean {
    return navigator.share !== undefined && 
           (!data || navigator.canShare?.(data) !== false);
  }

  // Utility functions
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get app info
  getAppInfo(): {
    isInstalled: boolean;
    isInstallable: boolean;
    isOnline: boolean;
    swRegistered: boolean;
    notificationsEnabled: boolean;
  } {
    return {
      isInstalled: this.isInstalled(),
      isInstallable: this.isInstallable(),
      isOnline: this.getOnlineStatus(),
      swRegistered: this.swRegistration !== null,
      notificationsEnabled: Notification.permission === 'granted',
    };
  }
}

// Create singleton instance
export const pwa = new PWAManager();

// React hooks for PWA functionality
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = React.useState(pwa.isInstallable());
  const [isInstalled, setIsInstalled] = React.useState(pwa.isInstalled());

  React.useEffect(() => {
    const checkInstallable = () => setIsInstallable(pwa.isInstallable());
    
    window.addEventListener('beforeinstallprompt', checkInstallable);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', checkInstallable);
      window.removeEventListener('appinstalled', checkInstallable);
    };
  }, []);

  const install = React.useCallback(async () => {
    return await pwa.showInstallPrompt();
  }, []);

  return { isInstallable, isInstalled, install };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(pwa.getOnlineStatus());

  React.useEffect(() => {
    return pwa.onOnlineStatusChange(setIsOnline);
  }, []);

  return isOnline;
}

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    // Check for updates periodically
    const checkForUpdates = () => {
      pwa.updateServiceWorker();
    };

    // Check every 30 minutes
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
    
    // Check on focus
    window.addEventListener('focus', checkForUpdates);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, []);

  const applyUpdate = React.useCallback(() => {
    pwa.skipWaiting();
  }, []);

  return { updateAvailable, applyUpdate };
}

// Initialize PWA
export const initializePWA = async () => {
  // Register service worker
  await pwa.registerServiceWorker();
  
  // Request notification permission if not already granted
  if (Notification.permission === 'default') {
    await pwa.requestNotificationPermission();
  }

  logger.info('PWA initialized', {
    component: 'PWA',
    metadata: pwa.getAppInfo(),
  });
};

// Import React for hooks
import React from 'react';