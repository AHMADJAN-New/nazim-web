import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Get platform admin permissions (GLOBAL, not organization-scoped)
 * 
 * CRITICAL: This hook is for platform admins who are NOT tied to organizations.
 * It checks for global permissions (organization_id = NULL), specifically subscription.admin
 */
export const usePlatformAdminPermissions = () => {
  const { user } = useAuth();

  // CRITICAL: Only enable this query if:
  // 1. User is authenticated
  // 2. We're on a platform route OR user is in platform admin session
  // This prevents 403 errors when regular users access the main app
  const isOnPlatformRoute = typeof window !== 'undefined' && 
    window.location.pathname.startsWith('/platform');
  const isPlatformAdminSession = typeof window !== 'undefined' && 
    localStorage.getItem('is_platform_admin_session') === 'true';
  
  const shouldFetch = !!user && (isOnPlatformRoute || isPlatformAdminSession);

  return useQuery({
    queryKey: ['platform-admin-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // CRITICAL: Call the API without organization context
      // The backend should return global permissions for platform admins
      // For now, we'll manually check subscription.admin by calling the API
      // and checking if the user has the permission
      
      try {
        // Call platform admin permissions endpoint (doesn't require organization_id)
        // This endpoint is in the /platform route group, so it uses /platform/permissions/platform-admin
        const response = await apiClient.get<{ permissions: string[] }>('/platform/permissions/platform-admin');
        return response.permissions || [];
      } catch (error: any) {
        // If API fails with 403, user is not a platform admin
        // CRITICAL: Clear the platform admin session flag IMMEDIATELY to prevent redirect loops
        const is403Error = error?.message?.includes('403') || 
                          error?.message?.includes('platform administrators') ||
                          error?.message?.includes('Access Denied') ||
                          error?.message?.includes('This endpoint is only accessible');
        
        if (is403Error) {
          // CRITICAL: Clear flags immediately to break redirect loops
          // Do this synchronously before any other code runs
          localStorage.removeItem('is_platform_admin_session');
          localStorage.removeItem('platform_admin_token_backup');
          
          // If we're on a platform route, redirect to main app immediately
          // Use a flag to prevent multiple redirects
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/platform')) {
            const redirectKey = 'platform_redirect_in_progress';
            if (!sessionStorage.getItem(redirectKey)) {
              sessionStorage.setItem(redirectKey, 'true');
              // Use setTimeout to avoid redirect during render
              setTimeout(() => {
                sessionStorage.removeItem(redirectKey);
                window.location.href = '/dashboard';
              }, 100);
            }
          }
        }
        
        // If API fails (e.g., user has no organization), return empty array
        // Platform admin check will happen in the route guard
        if (import.meta.env.DEV) {
          console.error('[usePlatformAdminPermissions] Error:', error);
        }
        return [];
      }
    },
    enabled: shouldFetch, // Only fetch if conditions are met
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchInterval: false,
    // CRITICAL: Don't use placeholderData - we need to know when data is actually loaded
    // Using placeholderData causes the route guard to think permissions are empty when they're still loading
    placeholderData: undefined,
  });
};

/**
 * Check if user has platform admin permission
 */
export const useIsPlatformAdmin = (): boolean | undefined => {
  const { data: permissions } = usePlatformAdminPermissions();
  
  if (permissions && permissions.length > 0) {
    return permissions.includes('subscription.admin');
  }
  
  return undefined;
};

