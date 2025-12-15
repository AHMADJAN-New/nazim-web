/**
 * Centralized query keys for React Query
 * 
 * This ensures all hooks use identical keys for the same data,
 * preventing duplicate network calls.
 * 
 * Usage:
 * import { queryKeys } from '@/lib/queryKeys';
 * 
 * useQuery({
 *   queryKey: queryKeys.attendance.sessions,
 *   ...
 * });
 */
export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    profile: ['auth', 'profile'] as const,
    bootstrap: ['app', 'bootstrap'] as const,
  },

  // App
  app: {
    bootstrap: ['app', 'bootstrap'] as const,
  },

  // Attendance
  attendance: {
    sessions: ['attendance-sessions'] as const,
    todaySummary: ['attendance', 'today-summary'] as const,
    session: (id: string) => ['attendance-sessions', id] as const,
  },

  // Assets
  assets: {
    list: ['assets'] as const,
    summary: ['assets', 'summary'] as const,
    stats: ['asset-stats'] as const,
    detail: (id: string) => ['assets', id] as const,
  },

  // Library
  library: {
    books: ['library-books'] as const,
    summary: ['library', 'summary'] as const,
    loans: ['library-loans'] as const,
  },

  // Leave Requests
  leaveRequests: {
    list: ['leave-requests'] as const,
    summary: ['leave-requests', 'summary'] as const,
    detail: (id: string) => ['leave-request', id] as const,
  },

  // Dashboard
  dashboard: {
    stats: ['dashboard-stats'] as const,
  },

  // Permissions
  permissions: {
    list: ['permissions'] as const,
    user: ['user-permissions'] as const,
  },

  // Organizations
  organizations: {
    list: ['organizations'] as const,
    accessible: ['organizations', 'accessible'] as const,
    detail: (id: string) => ['organizations', id] as const,
  },
} as const;

