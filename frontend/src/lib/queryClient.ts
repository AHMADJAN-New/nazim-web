/**
 * Centralized TanStack Query client configuration.
 * Used by both the main app and platform admin app so defaults (refetch on focus,
 * staleTime, retry) are defined in one place and apply app-wide without editing
 * individual hooks.
 *
 * Hooks can override any option per-query. For performance-critical queries (e.g.
 * heavy lists, stats), spread queryOptionsNoRefetchOnFocus to avoid refetch on
 * tab focus/reconnect while keeping other defaults.
 */

import { QueryClient } from '@tanstack/react-query';

/** Default options for all queries app-wide. Matches AGENTS.md (staleTime 5 min). */
export const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes – project standard
  gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
  refetchOnWindowFocus: true, // Refetch when user returns to tab – fresh data app-wide
  refetchOnMount: true, // Refetch when component mounts if data is stale
  refetchOnReconnect: true, // Refetch when network reconnects
  retry: (failureCount: number, error: { status?: number } | Error | unknown) => {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status?: number }).status === 'number' &&
      (error as { status: number }).status >= 400 &&
      (error as { status: number }).status < 500
    ) {
      return false;
    }
    return failureCount < 3;
  },
} as const;

/**
 * Use for performance-critical queries (heavy lists, stats, subscription checks)
 * where refetch on window focus/reconnect would cause unnecessary load.
 * Spread in useQuery: { ...queryOptionsNoRefetchOnFocus, queryKey: [...], queryFn }
 */
export const queryOptionsNoRefetchOnFocus = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/** Default options for mutations. */
export const defaultMutationOptions = {
  retry: 2,
} as const;

/**
 * Creates a QueryClient with app-wide defaults.
 * Use in App.tsx and platform/App.tsx so all queries get the same behavior
 * without setting options in every hook.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: defaultQueryOptions,
      mutations: defaultMutationOptions,
    },
  });
}
