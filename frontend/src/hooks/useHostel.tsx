import { useQuery } from '@tanstack/react-query';
import { hostelApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import type { HostelOverview } from '@/types/domain/hostel';
import { mapHostelOverviewApiToDomain } from '@/mappers/hostelMapper';

export const useHostelOverview = (organizationId?: string) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery<HostelOverview>({
    queryKey: ['hostel-overview', organizationId || profile?.organization_id],
    queryFn: async () => {
      const orgId = organizationId || profile?.organization_id || undefined;
      const payload = await hostelApi.overview({ organization_id: orgId });
      return mapHostelOverviewApiToDomain(payload);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
  });
};
