import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';

export const useAccessibleOrganizations = () => {
  const { user, profile, loading } = useAuth();

  const query = useQuery({
    queryKey: ['accessible-organizations', user?.id, profile?.organization_id, profile?.role],
    queryFn: async () => {
      if (!user || !profile) {
        return {
          orgIds: [] as string[],
          primaryOrgId: null as string | null,
        };
      }

      try {
        // Use Laravel API to get accessible organizations
        const organizations = await organizationsApi.accessible();

        const orgIds = new Set<string>();
        
        // Add user's primary organization if they have one
        if (profile.organization_id) {
          orgIds.add(profile.organization_id);
        }

        // Add all accessible organizations from API response
        if (Array.isArray(organizations)) {
          organizations.forEach((org: any) => {
            if (org.id) {
              orgIds.add(org.id);
            }
          });
        }

        // For super admin with null org_id, if no orgs returned, they might not have any assigned
        // This is expected behavior - they'll need to be assigned organizations
        if (orgIds.size === 0 && profile.role === 'super_admin' && !profile.organization_id) {
          if (import.meta.env.DEV) {
            console.warn('Super admin has no organizations assigned. Please assign organizations manually.');
          }
        }

        // Try to find a primary org - use profile org_id as primary, or first org from list
        let primaryOrgId: string | null = profile.organization_id || null;
        if (!primaryOrgId && Array.isArray(organizations) && organizations.length > 0) {
          // Check if any org is marked as primary (if API returns that info)
          const primaryOrg = organizations.find((org: any) => org.is_primary === true);
          if (primaryOrg?.id) {
            primaryOrgId = primaryOrg.id;
          } else if (organizations[0]?.id) {
            // Fallback to first org
            primaryOrgId = organizations[0].id;
          }
        }

        return {
          orgIds: Array.from(orgIds),
          primaryOrgId,
        };
      } catch (error: any) {
        // If API call fails, provide helpful error information
        const errorMessage = error?.message || 'Unknown error';
        const isDevToolsBlocked = errorMessage?.includes('blocked') || errorMessage?.toLowerCase().includes('devtools');
        const isNetworkError = errorMessage?.includes('Network error') || 
                               errorMessage?.includes('Failed to fetch') ||
                               errorMessage?.includes('Unable to connect');
        
        if (import.meta.env.DEV) {
          if (isDevToolsBlocked) {
            console.warn(
              '⚠️ Accessible organizations request blocked by DevTools. ' +
              'Disable request blocking in DevTools Network tab and refresh.'
            );
          } else if (isNetworkError) {
            console.warn(
              '⚠️ Failed to fetch accessible organizations - backend may not be running. ' +
              'Ensure Laravel backend is running on port 8000.'
            );
          } else {
          console.error('Failed to fetch accessible organizations:', error);
          }
        }
        
        // Return fallback data - use profile organization if available
        return {
          orgIds: profile.organization_id ? [profile.organization_id] : [],
          primaryOrgId: profile.organization_id || null,
        };
      }
    },
    enabled: !!user && !!profile && !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
  });

  return {
    orgIds: query.data?.orgIds ?? [],
    primaryOrgId: query.data?.primaryOrgId ?? null,
    isLoading: query.isLoading,
  };
};
