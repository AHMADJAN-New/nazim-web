import { ipcMain } from 'electron';
import { CHANNELS } from './channels';
import type { OfflineModeSetPayload, ScopedListPayload } from './types';
import type { RepositorySet } from '../repos/repositorySet';
import type { SyncStatusService } from '../sync/syncStatus';

export interface HandlerDependencies {
  repos: RepositorySet;
  syncStatus: SyncStatusService;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const registerIpcHandlers = ({ repos, syncStatus }: HandlerDependencies): void => {
  ipcMain.handle(CHANNELS.offlineModeGet, () => syncStatus.isOfflineMode());

  ipcMain.handle(CHANNELS.offlineModeSet, (_event, payload: OfflineModeSetPayload) => {
    if (!isRecord(payload) || typeof payload.enabled !== 'boolean') {
      throw new Error('enabled boolean is required');
    }
    return syncStatus.setOfflineMode(payload.enabled);
  });

  ipcMain.handle(CHANNELS.syncStatusGet, () => syncStatus.getStatus());

  // ---------------------------------------------------------------------
  // Frontend adapter-compatible handlers (endpoint-mirroring)
  // ---------------------------------------------------------------------
  ipcMain.handle(CHANNELS.studentsList, (_event, payload: { params?: Record<string, unknown> } = {}) => {
    return repos.students.list(payload.params as any);
  });
  ipcMain.handle(CHANNELS.studentsGet, (_event, payload: { id: string; params?: Record<string, unknown> }) => {
    const row = repos.students.getById(payload.id);
    if (!row) throw new Error('Student not found');
    return row;
  });

  ipcMain.handle(CHANNELS.classesList, (_event, payload: { params?: Record<string, unknown> } = {}) => {
    return repos.classes.list(payload.params as any);
  });
  ipcMain.handle(CHANNELS.classesGet, (_event, payload: { id: string; params?: Record<string, unknown> }) => {
    const row = repos.classes.getById(payload.id);
    if (!row) throw new Error('Class not found');
    return row;
  });

  ipcMain.handle(CHANNELS.attendanceRoundNamesList, (_event, payload: { params?: Record<string, unknown> } = {}) => {
    return repos.roundNames.list(payload.params as any);
  });

  ipcMain.handle(CHANNELS.attendanceSessionsList, (_event, payload: { params?: Record<string, unknown> } = {}) => {
    return repos.sessions.list(payload.params as any);
  });
  ipcMain.handle(CHANNELS.attendanceSessionsGet, (_event, payload: { id: string; params?: Record<string, unknown> }) => {
    const session = repos.sessions.getById(payload.id);
    if (!session) throw new Error('Session not found');
    const records = repos.records.listBySessionId(payload.id);
    return { ...session, records };
  });
  ipcMain.handle(CHANNELS.attendanceSessionsCreate, (_event, payload: { data: Record<string, unknown> }) => {
    const created = repos.sessions.upsert(payload.data as any);
    syncStatus.emit();
    return created;
  });
  ipcMain.handle(CHANNELS.attendanceSessionsUpdate, (_event, payload: { id: string; data: Record<string, unknown> }) => {
    const updated = repos.sessions.upsert({ ...(payload.data as any), id: payload.id });
    syncStatus.emit();
    return updated;
  });
  ipcMain.handle(CHANNELS.attendanceSessionsDelete, (_event, payload: { id: string }) => {
    const updated = repos.sessions.upsert({ id: payload.id, deleted_at: new Date().toISOString() } as any);
    syncStatus.emit();
    return updated;
  });
  ipcMain.handle(CHANNELS.attendanceSessionsRoster, (_event, payload: { params: Record<string, unknown> }) => {
    return repos.students.list(payload.params as any);
  });
  ipcMain.handle(CHANNELS.attendanceSessionsMarkRecords, (_event, payload: { id: string; data: Record<string, unknown> }) => {
    const scope = payload.data as any;
    const records = Array.isArray(scope?.records) ? scope.records : [];
    for (const r of records) {
      repos.records.upsert({
        organization_id: scope.organization_id,
        school_id: scope.school_id,
        student_id: r.student_id,
        session_id: payload.id,
        record_type: 'attendance',
        value: r.status,
        metadata: { entry_method: r.entry_method ?? 'manual', note: r.note ?? null },
      } as any);
    }
    syncStatus.emit();
    const session = repos.sessions.list(scope as any).find(s => s.id === payload.id);
    const updatedRecords = repos.records.list({ ...(scope as any), session_id: payload.id });
    return { ...(session ?? { id: payload.id }), records: updatedRecords };
  });
  ipcMain.handle(CHANNELS.attendanceSessionsClose, (_event, payload: { id: string; data?: Record<string, unknown> }) => {
    const updated = repos.sessions.upsert({ id: payload.id, status: 'closed' } as any);
    syncStatus.emit();
    return updated;
  });
  ipcMain.handle(CHANNELS.attendanceSessionsScan, () => {
    throw new Error('Scan is not implemented in offline IPC yet');
  });
  ipcMain.handle(CHANNELS.attendanceSessionsScanFeed, () => {
    return [];
  });

  ipcMain.handle(CHANNELS.rosterRead, (_event, payload: ScopedListPayload = {}) => repos.students.list(payload));
  ipcMain.handle(CHANNELS.studentUpsert, (_event, payload) => {
    const result = repos.students.upsert(payload);
    syncStatus.emit();
    return result;
  });

  ipcMain.handle(CHANNELS.classesRead, (_event, payload: ScopedListPayload = {}) => repos.classes.list(payload));
  ipcMain.handle(CHANNELS.classUpsert, (_event, payload) => {
    const result = repos.classes.upsert(payload);
    syncStatus.emit();
    return result;
  });

  ipcMain.handle(CHANNELS.sessionsRead, (_event, payload: ScopedListPayload = {}) => repos.sessions.list(payload));
  ipcMain.handle(CHANNELS.sessionUpsert, (_event, payload) => {
    const result = repos.sessions.upsert(payload);
    syncStatus.emit();
    return result;
  });

  ipcMain.handle(CHANNELS.recordsRead, (_event, payload: ScopedListPayload = {}) => repos.records.list(payload));
  ipcMain.handle(CHANNELS.recordUpsert, (_event, payload) => {
    const result = repos.records.upsert(payload);
    syncStatus.emit();
    return result;
  });

  ipcMain.handle(CHANNELS.outboxRead, (_event, payload = {}) => repos.outbox.list(payload));
};
