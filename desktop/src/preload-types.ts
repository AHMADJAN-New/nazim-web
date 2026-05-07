import type { DesktopChannel } from './api/channels';
import type { OfflineModeSetPayload, SyncStatus } from './api/types';

export interface NazimDesktopBridge {
  isOfflineMode(): boolean;
  setOfflineMode(enabled: boolean): Promise<void>;
  invoke<TResponse = unknown, TPayload = unknown>(
    channel: DesktopChannel,
    payload?: TPayload | OfflineModeSetPayload,
  ): Promise<TResponse>;
  /**
   * Return a UI-friendly sync status consumed by the renderer.
   * Keep this intentionally compatible with the frontend `DesktopSyncStatus` type.
   */
  getSyncStatus(): Promise<{
    state: 'online_synced' | 'online_pending' | 'syncing' | 'offline' | 'unknown';
    pendingCount?: number;
    syncingDone?: number;
    syncingTotal?: number;
    lastSyncedAt?: string | null;
    lastError?: string | null;
  }>;
  onSyncStatus(callback: (status: SyncStatus) => void): () => void;
  /** Back-compat alias. */
  onSyncStatusChanged?(callback: (status: SyncStatus) => void): () => void;
}

declare global {
  interface Window {
    nazimDesktop?: NazimDesktopBridge;
  }
}
