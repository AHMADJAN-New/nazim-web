import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS, isInvokableChannel } from './api/channels';
import type { DesktopChannel } from './api/channels';
import type { NazimDesktopBridge } from './preload-types';
import type { SyncStatus } from './api/types';

const invoke = <TResponse = unknown, TPayload = unknown>(
  channel: DesktopChannel,
  payload?: TPayload,
): Promise<TResponse> => {
  if (!isInvokableChannel(channel)) {
    return Promise.reject(new Error(`Unsupported desktop IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, payload) as Promise<TResponse>;
};

let offlineModeCache = false;

const refreshOfflineModeCache = async (): Promise<void> => {
  try {
    offlineModeCache = await invoke<boolean>(CHANNELS.offlineModeGet);
  } catch {
    // If the main process isn't ready yet, keep default.
  }
};

void refreshOfflineModeCache();

const mapSyncStatus = (s: SyncStatus) => {
  if (!s) {
    return { state: 'unknown' as const, pendingCount: 0, lastSyncedAt: null };
  }
  if (s.offlineMode) {
    return {
      state: 'offline' as const,
      pendingCount: s.pendingOutboxCount ?? 0,
      lastSyncedAt: s.lastSyncAt ?? null,
    };
  }
  if ((s.pendingOutboxCount ?? 0) > 0) {
    return {
      state: 'online_pending' as const,
      pendingCount: s.pendingOutboxCount ?? 0,
      lastSyncedAt: s.lastSyncAt ?? null,
    };
  }
  return {
    state: 'online_synced' as const,
    pendingCount: 0,
    lastSyncedAt: s.lastSyncAt ?? null,
  };
};

const bridge: NazimDesktopBridge = {
  isOfflineMode: () => offlineModeCache,
  setOfflineMode: async (enabled: boolean) => {
    await invoke<boolean>(CHANNELS.offlineModeSet, { enabled });
    offlineModeCache = enabled;
  },
  invoke,
  getSyncStatus: async () => mapSyncStatus(await invoke<SyncStatus>(CHANNELS.syncStatusGet)),
  onSyncStatus: (callback: (status: SyncStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: SyncStatus) => callback(status);
    ipcRenderer.on(CHANNELS.syncStatusChanged, listener);
    return () => ipcRenderer.removeListener(CHANNELS.syncStatusChanged, listener);
  },
  onSyncStatusChanged: (callback: (status: SyncStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: SyncStatus) => callback(status);
    ipcRenderer.on(CHANNELS.syncStatusChanged, listener);
    return () => ipcRenderer.removeListener(CHANNELS.syncStatusChanged, listener);
  },
};

contextBridge.exposeInMainWorld('nazimDesktop', bridge);
