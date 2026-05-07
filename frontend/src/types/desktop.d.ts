export {};

declare global {
  type DesktopSyncState = 'online_synced' | 'online_pending' | 'syncing' | 'offline' | 'unknown';

  interface DesktopSyncStatus {
    state: DesktopSyncState;
    pendingCount?: number;
    syncingDone?: number;
    syncingTotal?: number;
    lastSyncedAt?: string | null; // ISO string
    lastError?: string | null;
  }

  interface NazimDesktopBridge {
    /** Returns true when the desktop app is forcing offline/local mode. */
    isOfflineMode?: () => boolean;
    /** Toggle forcing offline/local mode. */
    setOfflineMode?: (enabled: boolean) => void | Promise<void>;
    /** Invoke a main-process handler (IPC). */
    invoke: <TResult = unknown, TPayload = unknown>(channel: string, payload?: TPayload) => Promise<TResult>;
    /** Read current sync status for header badges etc. */
    getSyncStatus?: () => DesktopSyncStatus | Promise<DesktopSyncStatus>;
    /** Optional event subscription for push updates from main process. */
    onSyncStatus?: (listener: (status: DesktopSyncStatus) => void) => (() => void) | void;
  }

  interface Window {
    nazimDesktop?: NazimDesktopBridge;
  }
}

