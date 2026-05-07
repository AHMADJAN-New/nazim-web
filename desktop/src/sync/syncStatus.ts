import { BrowserWindow } from 'electron';
import { CHANNELS } from '../api/channels';
import type { SyncStatus } from '../api/types';
import type { OutboxRepo } from '../repos/outboxRepo';
import { getDefaultDbPath } from '../db/database';

export class SyncStatusService {
  private offlineMode = false;

  constructor(private readonly outbox: OutboxRepo) {}

  getStatus(): SyncStatus {
    const counts = this.outbox.counts();
    return {
      offlineMode: this.offlineMode,
      pendingOutboxCount: counts.pending,
      failedOutboxCount: counts.failed,
      lastSyncAt: null,
      dbPath: getDefaultDbPath(),
    };
  }

  isOfflineMode(): boolean {
    return this.offlineMode;
  }

  setOfflineMode(enabled: boolean): boolean {
    this.offlineMode = enabled;
    this.emit();
    return this.offlineMode;
  }

  emit(): void {
    const status = this.getStatus();
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(CHANNELS.syncStatusChanged, status);
    }
  }
}
