export type UUID = string;
export type ISODateTime = string;

export interface TenantScope {
  organization_id: UUID;
  school_id: UUID;
}

export interface ScopedListPayload extends Partial<TenantScope> {
  limit?: number;
  offset?: number;
  updated_since?: ISODateTime;
}

export interface StudentRecord extends TenantScope {
  id: UUID;
  first_name: string;
  last_name: string;
  admission_number?: string | null;
  class_id?: UUID | null;
  status?: string | null;
  updated_at?: ISODateTime;
  deleted_at?: ISODateTime | null;
}

export interface AttendanceRoundNameRecord extends TenantScope {
  id: UUID;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at?: ISODateTime;
  updated_at?: ISODateTime;
  deleted_at?: ISODateTime | null;
}

export interface ClassRecord extends TenantScope {
  id: UUID;
  name: string;
  code?: string | null;
  academic_year_id?: UUID | null;
  updated_at?: ISODateTime;
  deleted_at?: ISODateTime | null;
}

export interface SessionRecord extends TenantScope {
  id: UUID;
  class_id: UUID;
  session_date: string;
  starts_at?: ISODateTime | null;
  ends_at?: ISODateTime | null;
  status?: string | null;
  updated_at?: ISODateTime;
  deleted_at?: ISODateTime | null;
}

export interface OfflineRecord extends TenantScope {
  id: UUID;
  student_id: UUID;
  session_id: UUID;
  record_type: string;
  value: string;
  metadata?: Record<string, unknown> | null;
  updated_at?: ISODateTime;
  deleted_at?: ISODateTime | null;
}

export type OutboxOperation = 'create' | 'update' | 'delete';
export type OutboxStatus = 'pending' | 'processing' | 'synced' | 'failed';

export interface SyncOutboxItem extends TenantScope {
  id: UUID;
  entity_table: 'students' | 'classes' | 'sessions' | 'records' | string;
  entity_id: UUID;
  operation: OutboxOperation;
  payload_json: string;
  status: OutboxStatus;
  attempt_count: number;
  last_error?: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  synced_at?: ISODateTime | null;
}

export interface SyncStatus {
  offlineMode: boolean;
  pendingOutboxCount: number;
  failedOutboxCount: number;
  lastSyncAt: ISODateTime | null;
  dbPath: string;
}

export interface OfflineModeSetPayload {
  enabled: boolean;
}
