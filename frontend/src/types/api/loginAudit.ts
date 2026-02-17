/**
 * Login Audit API types - match Laravel API response structure
 */

export interface LoginAttempt {
  id: string;
  attempted_at: string;
  email: string;
  user_id: string | null;
  success: boolean;
  failure_reason: string | null;
  organization_id: string | null;
  school_id: string | null;
  ip_address: string;
  user_agent: string | null;
  login_context: string;
  consecutive_failures: number;
  was_locked: boolean;
}

export interface LoginAttemptFilters {
  start_date?: string;
  end_date?: string;
  success?: boolean | '';
  email?: string;
  organization_id?: string;
  ip_address?: string;
  login_context?: string;
  user_id?: string;
  per_page?: number;
  page?: number;
}

export interface BruteForceAlert {
  ip_address?: string;
  email?: string;
  failure_count: number;
  last_attempt_at: string;
  type: 'ip' | 'email';
}

export interface LockedAccount {
  id: string;
  email: string;
  locked_at: string;
  unlocked_at: string | null;
  unlock_reason: string | null;
  unlocked_by: string | null;
  failed_attempt_count: number;
  ip_address: string;
}

export interface LoginAttemptsPaginatedResponse {
  data: LoginAttempt[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
