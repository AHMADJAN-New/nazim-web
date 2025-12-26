import { useQuery } from '@tanstack/react-query';
import { hostelApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import type { HostelOverview } from '@/types/domain/hostel';
import { mapHostelOverviewApiToDomain } from '@/mappers/hostelMapper';

export const useHostelOverview = (organizationId?: string) => {
  const { user, profile: authProfile, profileLoading } = useAuth();
  const { data: profile } = useProfile();
  const currentProfile = authProfile || profile;
  const isEventUser = currentProfile?.is_event_user === true;

  return useQuery<HostelOverview>({
    queryKey: ['hostel-overview', organizationId || currentProfile?.organization_id, currentProfile?.default_school_id ?? null],
    queryFn: async () => {
      const orgId = organizationId || currentProfile?.organization_id || undefined;
      const payload = await hostelApi.overview({ organization_id: orgId });
      return mapHostelOverviewApiToDomain(payload);
    },
    enabled: !!user && !!currentProfile && !profileLoading && !isEventUser, // Disable for event users and wait for profile
    staleTime: 5 * 60 * 1000,
  });
};
