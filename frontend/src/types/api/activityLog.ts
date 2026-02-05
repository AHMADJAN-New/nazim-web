/**
 * API types for Activity Logs (Audit Trail)
 * These types match the Laravel API response structure (snake_case)
 */

export interface ActivityLog {
  id: string;
  log_name: string | null;
  description: string;
  subject_type: string | null;
  subject_id: string | null;
  event: string | null;
  causer_type: string | null;
  causer_id: string | null;
  properties: Record<string, unknown> | null;
  batch_uuid: string | null;
  organization_id: string | null;
  school_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_method: string | null;
  route: string | null;
  status_code: number | null;
  session_id: string | null;
  request_id: string | null;
  created_at: string;
  updated_at: string;
  /** Name of the causer (user) fetched from profiles table */
  causer_name?: string | null;
  // Relationships (when loaded)
  causer?: {
    id: string;
    email: string;
    name?: string;
  } | null;
  subject?: {
    id: string;
    [key: string]: unknown;
  } | null;
}

export interface ActivityLogFilters {
  log_name?: string;
  event?: string;
  causer_id?: string;
  subject_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  school_id?: string;
  per_page?: number;
  page?: number;
}

export interface ActivityLogPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface ActivityLogPaginatedResponse {
  data: ActivityLog[];
  meta: ActivityLogPaginationMeta;
}
