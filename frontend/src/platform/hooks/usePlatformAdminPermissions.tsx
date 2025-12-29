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
      } catch (error) {
        // If API fails (e.g., user has no organization), return empty array
        // Platform admin check will happen in the route guard
        if (import.meta.env.DEV) {
          console.error('[usePlatformAdminPermissions] Error:', error);
        }
        return [];
      }
    },
    enabled: !!user,
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

