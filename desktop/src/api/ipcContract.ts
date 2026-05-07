import { CHANNELS } from './channels';
import type {
  ClassRecord,
  OfflineModeSetPayload,
  OfflineRecord,
  ScopedListPayload,
  SessionRecord,
  StudentRecord,
  SyncOutboxItem,
  SyncStatus,
  TenantScope,
} from './types';

export interface SessionsReadPayload extends ScopedListPayload {
  class_id?: string;
}

export interface RecordsReadPayload extends ScopedListPayload {
  student_id?: string;
  session_id?: string;
}

export interface OutboxReadPayload extends Partial<TenantScope> {
  status?: SyncOutboxItem['status'];
  limit?: number;
  offset?: number;
}

// ------------------------------------------------------------
// Frontend adapter-compatible payloads (mirror HTTP usage)
// ------------------------------------------------------------

export interface StudentsListPayload {
  params?: Record<string, unknown>;
}

export interface StudentsGetPayload {
  id: string;
}

export interface ClassesListPayload {
  params?: Record<string, unknown>;
}

export interface ClassesGetPayload {
  id: string;
}

export interface AttendanceRoundNamesListPayload {
  params?: Record<string, unknown>;
}

export interface AttendanceSessionsListPayload {
  params?: Record<string, unknown>;
}

export interface AttendanceSessionsGetPayload {
  id: string;
}

export interface AttendanceSessionsCreatePayload {
  data: Record<string, unknown>;
}

export interface AttendanceSessionsUpdatePayload {
  id: string;
  data: Record<string, unknown>;
}

export interface AttendanceSessionsDeletePayload {
  id: string;
}

export interface AttendanceSessionsRosterPayload {
  params: Record<string, unknown>;
}

export interface AttendanceSessionsMarkRecordsPayload {
  id: string;
  data: Record<string, unknown>;
}

export interface AttendanceSessionsScanPayload {
  id: string;
  data: Record<string, unknown>;
}

export interface AttendanceSessionsScanFeedPayload {
  id: string;
  params?: Record<string, unknown>;
}

export interface AttendanceSessionsClosePayload {
  id: string;
}

export interface DesktopIpcContract {
  [CHANNELS.offlineModeGet]: {
    payload: undefined;
    response: boolean;
  };
  [CHANNELS.offlineModeSet]: {
    payload: OfflineModeSetPayload;
    response: boolean;
  };
  [CHANNELS.syncStatusGet]: {
    payload: undefined;
    response: SyncStatus;
  };

  // ---------------------------
  // Canonical (frontend adapter)
  // ---------------------------
  [CHANNELS.studentsList]: {
    payload: StudentsListPayload;
    response: unknown;
  };
  [CHANNELS.studentsGet]: {
    payload: StudentsGetPayload;
    response: unknown;
  };
  [CHANNELS.classesList]: {
    payload: ClassesListPayload;
    response: unknown;
  };
  [CHANNELS.classesGet]: {
    payload: ClassesGetPayload;
    response: unknown;
  };
  [CHANNELS.attendanceRoundNamesList]: {
    payload: AttendanceRoundNamesListPayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsList]: {
    payload: AttendanceSessionsListPayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsGet]: {
    payload: AttendanceSessionsGetPayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsCreate]: {
    payload: AttendanceSessionsCreatePayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsUpdate]: {
    payload: AttendanceSessionsUpdatePayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsDelete]: {
    payload: AttendanceSessionsDeletePayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsRoster]: {
    payload: AttendanceSessionsRosterPayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsMarkRecords]: {
    payload: AttendanceSessionsMarkRecordsPayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsScan]: {
    payload: AttendanceSessionsScanPayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsScanFeed]: {
    payload: AttendanceSessionsScanFeedPayload;
    response: unknown;
  };
  [CHANNELS.attendanceSessionsClose]: {
    payload: AttendanceSessionsClosePayload;
    response: unknown;
  };

  // ---------------------------
  // Legacy generic channels
  // ---------------------------
  [CHANNELS.rosterRead]: {
    payload: ScopedListPayload;
    response: StudentRecord[];
  };
  [CHANNELS.studentUpsert]: {
    payload: Partial<StudentRecord> & Pick<StudentRecord, 'organization_id' | 'school_id' | 'first_name' | 'last_name'>;
    response: StudentRecord;
  };
  [CHANNELS.classesRead]: {
    payload: ScopedListPayload;
    response: ClassRecord[];
  };
  [CHANNELS.classUpsert]: {
    payload: Partial<ClassRecord> & Pick<ClassRecord, 'organization_id' | 'school_id' | 'name'>;
    response: ClassRecord;
  };
  [CHANNELS.sessionsRead]: {
    payload: SessionsReadPayload;
    response: SessionRecord[];
  };
  [CHANNELS.sessionUpsert]: {
    payload: Partial<SessionRecord> & Pick<SessionRecord, 'organization_id' | 'school_id' | 'class_id' | 'session_date'>;
    response: SessionRecord;
  };
  [CHANNELS.recordsRead]: {
    payload: RecordsReadPayload;
    response: OfflineRecord[];
  };
  [CHANNELS.recordUpsert]: {
    payload: Partial<OfflineRecord> & Pick<OfflineRecord, 'organization_id' | 'school_id' | 'student_id' | 'session_id' | 'record_type' | 'value'>;
    response: OfflineRecord;
  };
  [CHANNELS.outboxRead]: {
    payload: OutboxReadPayload;
    response: SyncOutboxItem[];
  };
}

export type DesktopIpcChannel = keyof DesktopIpcContract;
export type DesktopIpcPayload<TChannel extends DesktopIpcChannel> = DesktopIpcContract[TChannel]['payload'];
export type DesktopIpcResponse<TChannel extends DesktopIpcChannel> = DesktopIpcContract[TChannel]['response'];
