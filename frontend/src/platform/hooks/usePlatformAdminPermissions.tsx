import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Get platform admin permissions (GLOBAL, not organization-scoped)
 * - Reads permissions from /platform/permissions/platform-admin
 * - This endpoint should return global permissions (organization_id = NULL)
 */
export const usePlatformAdminPermissions = () => {
  const { user } = useAuth();

  // CRITICAL: Remove route-prefix gating - permission checks should be auth-driven, not URL-driven
  // If user is logged in, fetch permissions. Backend will return 403 if they don't have access.
  const shouldFetch = !!user;

  return useQuery<string[], Error>({
    queryKey: ['platform-admin-permissions', user?.id ?? 'guest'],
    enabled: shouldFetch,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchInterval: false,

    queryFn: async () => {
      if (!user) return [];

      try {
        // Be robust about apiClient response shapes:
        // Some clients return raw JSON, others return { data: ... }
        const res: any = await apiClient.get('/platform/permissions/platform-admin');

        const permissions =
          res?.permissions ??
          res?.data?.permissions ??
          res?.data?.data?.permissions ??
          [];

        return Array.isArray(permissions) ? permissions : [];
      } catch (error: any) {
        // Detect "not allowed" patterns
        const msg = String(error?.message ?? '');
        const status = error?.status ?? error?.response?.status;

        const is403 =
          status === 403 ||
          msg.includes('403') ||
          msg.includes('platform administrators') ||
          msg.includes('Access Denied') ||
          msg.includes('only accessible');

        if (is403) {
          // Break redirect loops immediately
          localStorage.removeItem('is_platform_admin_session');
          localStorage.removeItem('platform_admin_token_backup');

          // If currently on platform routes, bounce out
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/platform')) {
            const redirectKey = 'platform_redirect_in_progress';
            if (!sessionStorage.getItem(redirectKey)) {
              sessionStorage.setItem(redirectKey, 'true');
              setTimeout(() => {
                sessionStorage.removeItem(redirectKey);
                window.location.href = '/dashboard';
              }, 50);
            }
          }
        }

        if (import.meta.env.DEV) {
          console.error('[usePlatformAdminPermissions] Error:', error);
        }

        // IMPORTANT: return [] instead of throwing
        // so UI doesn’t explode; guard will handle denial.
        return [];
      }
    },
  });
};

/**
 * Check if user is platform admin
 * - Returns:
 *   - true/false when loaded
 *   - undefined while loading
 */
export const useIsPlatformAdmin = (): boolean | undefined => {
  const { data, isLoading } = usePlatformAdminPermissions();

  if (isLoading) return undefined;
  return Array.isArray(data) ? data.includes('subscription.admin') : false;
};
