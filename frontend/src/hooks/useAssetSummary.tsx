import { useQuery, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '@/lib/api/client';
import { useAuth } from './useAuth';

export interface AssetSummary {
  status_counts: Record<string, number>;
  total_purchase_value: number;
  maintenance_cost_total: number;
  asset_count: number;
}

/**
 * Get asset summary (for dashboard)
 * Returns counts and stats only, not full list
 */
export const useAssetSummary = (enabled: boolean = true) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<AssetSummary>({
    queryKey: ['assets', 'summary'],
    queryFn: async () => {
      if (!user) {
        return {
          status_counts: {},
          total_purchase_value: 0,
          maintenance_cost_total: 0,
          asset_count: 0,
        };
      }
      
      // Check if useAssetStats already has this data cached (same endpoint)
      const cachedStats = queryClient.getQueryData(['asset-stats']);
      if (cachedStats) {
        return cachedStats as AssetSummary;
      }
      
      return await assetsApi.stats();
    },
    enabled: !!user && enabled, // Only run if enabled flag is true
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

