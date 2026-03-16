import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';

interface PlanSlugResponse {
  plan_slug: string | null;
}

export function useOrganizationPlanSlug() {
  const { user, profile } = useAuth();

  const query = useQuery<string | null>({
    queryKey: ['organization-plan-slug', profile?.organization_id],
    queryFn: async () => {
      const response = await apiClient.get('/subscription/plan-slug') as PlanSlugResponse;
      return response.plan_slug ?? null;
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    planSlug: query.data ?? null,
    isEnterprise: query.data === 'enterprise',
    isLoading: query.isLoading,
    ...query,
  };
}
