/**
 * Domain types for Activity Logs (Audit Trail)
 * These types are UI-friendly (camelCase) with proper Date objects
 */

export interface ActivityLogCauser {
  id: string;
  email: string;
  name?: string;
}

export interface ActivityLogSubject {
  id: string;
  [key: string]: unknown;
}

export interface ActivityLog {
  id: string;
  logName: string | null;
  description: string;
  subjectType: string | null;
  subjectId: string | null;
  event: string | null;
  causerType: string | null;
  causerId: string | null;
  /** Name of the causer (user) - resolved from profiles table */
  causerName: string | null;
  properties: Record<string, unknown> | null;
  batchUuid: string | null;
  organizationId: string | null;
  schoolId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestMethod: string | null;
  route: string | null;
  statusCode: number | null;
  sessionId: string | null;
  requestId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relationships
  causer?: ActivityLogCauser | null;
  subject?: ActivityLogSubject | null;
}

export interface ActivityLogFilters {
  logName?: string;
  event?: string;
  causerId?: string;
  subjectId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  schoolId?: string;
  perPage?: number;
  page?: number;
}

export interface ActivityLogPagination {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
}

// Common log names for filtering
export const LOG_NAMES = [
  'default',
  'authentication',
  'permission_management',
  'users',
  'web_activity',
] as const;

export type LogName = (typeof LOG_NAMES)[number] | string;

// Common events for filtering
export const EVENTS = [
  'created',
  'updated',
  'deleted',
  'viewed',
  'login',
  'logout',
  'password_changed',
  'password_reset',
  'permission_assigned_to_role',
  'permission_removed_from_role',
  'role_assigned_to_user',
  'role_removed_from_user',
  'direct_permission_assigned_to_user',
  'direct_permission_removed_from_user',
] as const;

export type EventType = (typeof EVENTS)[number] | string;
