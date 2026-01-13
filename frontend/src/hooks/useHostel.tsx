import { useQuery } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';

import { hostelApi } from '@/lib/api/client';
import { mapHostelOverviewApiToDomain } from '@/mappers/hostelMapper';
import type { HostelOverview } from '@/types/domain/hostel';

export const useHostelOverview = (organizationId?: string) => {
  const { user, profile: authProfile, profileLoading } = useAuth();
  const { data: profile } = useProfile();
  const currentProfile = authProfile || profile;
  const isEventUser = currentProfile?.is_event_user === true;
  const orgId = organizationId || currentProfile?.organization_id;

  return useQuery<HostelOverview>({
    queryKey: ['hostel-overview', orgId, currentProfile?.default_school_id ?? null],
    queryFn: async () => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }
      const payload = await hostelApi.overview({ organization_id: orgId });
      return mapHostelOverviewApiToDomain(payload);
    },
    enabled: !!user && !!currentProfile && !profileLoading && !isEventUser && !!orgId, // Disable for event users and wait for profile and orgId
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true, // Always refetch when component mounts to ensure fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus (performance)
  });
};
