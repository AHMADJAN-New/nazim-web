import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';

export const useAccessibleOrganizations = () => {
  const { user, profile } = useAuth();

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
          console.warn('Super admin has no organizations assigned. Please assign organizations manually.');
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
        // If API call fails, return empty array
        console.error('Failed to fetch accessible organizations:', error);
        return {
          orgIds: profile.organization_id ? [profile.organization_id] : [],
          primaryOrgId: profile.organization_id || null,
        };
      }
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
  });

  return {
    orgIds: query.data?.orgIds ?? [],
    primaryOrgId: query.data?.primaryOrgId ?? null,
    isLoading: query.isLoading,
  };
};
