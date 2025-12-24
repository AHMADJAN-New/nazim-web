import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { assetsApi } from '@/lib/api/client';
import type * as AssetApi from '@/types/api/asset';
import type { Asset, AssetAssignmentDomain, AssetMaintenanceDomain } from '@/types/domain/asset';
import { useAuth } from './useAuth';
import { usePagination } from './usePagination';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import {
  mapAssetApiToDomain,
  mapAssetAssignmentDomainToInsert,
  mapAssetAssignmentDomainToUpdate,
  mapAssetDomainToInsert,
  mapAssetDomainToUpdate,
  mapAssetMaintenanceDomainToInsert,
  mapAssetMaintenanceDomainToUpdate,
} from '@/mappers/assetMapper';

export type { Asset } from '@/types/domain/asset';

export interface AssetFilters {
  status?: AssetApi.AssetStatus | AssetApi.AssetStatus[];
  schoolId?: string;
  buildingId?: string;
  roomId?: string;
  search?: string;
}

export const useAssets = (filters?: AssetFilters, usePaginated?: boolean) => {
  const { user, profile, profileLoading } = useAuth();
  const isEventUser = profile?.is_event_user === true;
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<Asset[] | PaginatedResponse<AssetApi.Asset>>({
    queryKey: [
      'assets',
      filters?.status,
      filters?.schoolId,
      filters?.buildingId,
      filters?.roomId,
      filters?.search,
      usePaginated ? page : undefined,
      usePaginated ? pageSize : undefined,
    ],
    queryFn: async () => {
      if (!user) return [];

      const params: Record<string, any> = {};
      if (filters?.status) {
        params.status = filters.status;
      }
      if (filters?.schoolId) params.school_id = filters.schoolId;
      if (filters?.buildingId) params.building_id = filters.buildingId;
      if (filters?.roomId) params.room_id = filters.roomId;
      if (filters?.search) params.search = filters.search;
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }

      const apiAssets = await assetsApi.list(params);

      if (usePaginated && apiAssets && typeof apiAssets === 'object' && 'data' in apiAssets && 'current_page' in apiAssets) {
        const paginated = apiAssets as any;
        const assets = (paginated.data as AssetApi.Asset[]).map(mapAssetApiToDomain);
        const meta: PaginationMeta = {
          current_page: paginated.current_page,
          from: paginated.from,
          last_page: paginated.last_page,
          per_page: paginated.per_page,
          to: paginated.to,
          total: paginated.total,
          path: paginated.path,
          first_page_url: paginated.first_page_url,
          last_page_url: paginated.last_page_url,
          next_page_url: paginated.next_page_url,
          prev_page_url: paginated.prev_page_url,
        };
        return { data: assets, meta } as PaginatedResponse<AssetApi.Asset>;
      }

      return (apiAssets as AssetApi.Asset[]).map(mapAssetApiToDomain);
    },
    enabled: !!user && !profileLoading && !isEventUser, // Disable for event users and wait for profile
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<AssetApi.Asset>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<AssetApi.Asset> | undefined;
    return {
      assets: paginatedData?.data || [],
      isLoading,
      error,
      pagination: paginatedData?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
    };
  }

  return {
    assets: data as Asset[] | undefined,
    isLoading,
    error,
  };
};

export const useAssetDetails = (assetId?: string) => {
  const { user } = useAuth();
  return useQuery<Asset | null>({
    queryKey: ['assets', assetId],
    queryFn: async () => {
      if (!user || !assetId) return null;
      const apiAsset = await assetsApi.get(assetId);
      return mapAssetApiToDomain(apiAsset as AssetApi.Asset);
    },
    enabled: !!user && !!assetId,
  });
};

export const useAssetStats = () => {
  const { user, profile, profileLoading } = useAuth();
  const isEventUser = profile?.is_event_user === true;
  
  return useQuery<AssetApi.AssetStats>({
    queryKey: ['asset-stats'],
    queryFn: async () => {
      if (!user) return { asset_count: 0, maintenance_cost_total: 0, status_counts: {}, total_purchase_value: 0 };
      return assetsApi.stats();
    },
    enabled: !!user && !profileLoading && !isEventUser, // Disable for event users and wait for profile
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (asset: Partial<Asset>) => {
      const payload = mapAssetDomainToInsert(asset);
      const apiAsset = await assetsApi.create(payload);
      return mapAssetApiToDomain(apiAsset as AssetApi.Asset);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
      await queryClient.refetchQueries({ queryKey: ['assets'] });
      await queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      // Invalidate finance queries to refresh account balances and dashboard
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      await queryClient.refetchQueries({ queryKey: ['finance-accounts'] });
      await queryClient.refetchQueries({ queryKey: ['finance-dashboard'] });
      showToast.success('toast.assets.saved');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.saveFailed'),
  });
};

export const useUpdateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Asset> }) => {
      const payload = mapAssetDomainToUpdate(data);
      const apiAsset = await assetsApi.update(id, payload);
      return mapAssetApiToDomain(apiAsset as AssetApi.Asset);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
      await queryClient.refetchQueries({ queryKey: ['assets'] });
      if (variables?.id) {
        await queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      }
      await queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      // Invalidate finance queries to refresh account balances and dashboard
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      await queryClient.refetchQueries({ queryKey: ['finance-accounts'] });
      await queryClient.refetchQueries({ queryKey: ['finance-dashboard'] });
      showToast.success('toast.assets.updated');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.updateFailed'),
  });
};

export const useDeleteAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => assetsApi.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
      await queryClient.refetchQueries({ queryKey: ['assets'] });
      await queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      // Invalidate finance queries to refresh account balances and dashboard
      await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      await queryClient.refetchQueries({ queryKey: ['finance-accounts'] });
      await queryClient.refetchQueries({ queryKey: ['finance-dashboard'] });
      showToast.success('toast.assets.removed');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.removeFailed'),
  });
};

export const useAssignAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, assignment }: { assetId: string; assignment: Partial<AssetAssignmentDomain> }) => {
      const payload = mapAssetAssignmentDomainToInsert(assignment);
      return assetsApi.createAssignment(assetId, payload);
    },
    onSuccess: async (_res, variables) => {
      // Invalidate all asset-related queries
      await queryClient.invalidateQueries({ queryKey: ['assets'], exact: false });
      // Refetch all asset queries to get updated copy counts
      await queryClient.refetchQueries({ queryKey: ['assets'], exact: false });
      // Also invalidate specific asset and assignment queries
      if (variables.assetId) {
        await queryClient.invalidateQueries({ queryKey: ['assets', variables.assetId], exact: false });
        await queryClient.invalidateQueries({ queryKey: ['asset-assignments', variables.assetId], exact: false });
      }
      // Invalidate stats as well
      await queryClient.invalidateQueries({ queryKey: ['asset-stats'], exact: false });
      showToast.success('toast.assets.assignmentSaved');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.assignFailed'),
  });
};

export const useAssetAssignments = (assetId?: string) => {
  const { user } = useAuth();
  return useQuery<AssetApi.AssetAssignment[]>({
    queryKey: ['asset-assignments', assetId],
    queryFn: async () => {
      if (!user || !assetId) return [];
      return assetsApi.listAssignments(assetId);
    },
    enabled: !!user && !!assetId,
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, data }: { assignmentId: string; data: Partial<AssetAssignmentDomain> }) => {
      const payload = mapAssetAssignmentDomainToUpdate(data);
      return assetsApi.updateAssignment(assignmentId, payload);
    },
    onSuccess: async (response, variables) => {
      // Extract asset_id from response if available
      const assetId = (response as any)?.asset_id || (response as any)?.assetId;
      
      // Invalidate all asset-related queries
      await queryClient.invalidateQueries({ queryKey: ['assets'], exact: false });
      // Refetch all asset queries to get updated copy counts
      await queryClient.refetchQueries({ queryKey: ['assets'], exact: false });
      
      // Invalidate specific asset if we have the ID
      if (assetId) {
        await queryClient.invalidateQueries({ queryKey: ['assets', assetId], exact: false });
        await queryClient.invalidateQueries({ queryKey: ['asset-assignments', assetId], exact: false });
      }
      
      // Invalidate assignment queries
      await queryClient.invalidateQueries({ queryKey: ['asset-assignments'], exact: false });
      if (variables.assignmentId) {
        await queryClient.invalidateQueries({ queryKey: ['asset-assignments', variables.assignmentId], exact: false });
      }
      
      // Invalidate stats as well
      await queryClient.invalidateQueries({ queryKey: ['asset-stats'], exact: false });
      showToast.success('toast.assets.assignmentUpdated');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.assignmentUpdateFailed'),
  });
};

export const useRemoveAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, assetId }: { assignmentId: string; assetId?: string }) => {
      await assetsApi.deleteAssignment(assignmentId);
      return { assetId };
    },
    onSuccess: async (result) => {
      const assetId = result?.assetId;
      
      // Invalidate all asset-related queries
      await queryClient.invalidateQueries({ queryKey: ['assets'], exact: false });
      // Refetch all asset queries to get updated copy counts
      await queryClient.refetchQueries({ queryKey: ['assets'], exact: false });
      
      // Invalidate specific asset if we have the ID
      if (assetId) {
        await queryClient.invalidateQueries({ queryKey: ['assets', assetId], exact: false });
        await queryClient.invalidateQueries({ queryKey: ['asset-assignments', assetId], exact: false });
      }
      
      // Invalidate assignment queries
      await queryClient.invalidateQueries({ queryKey: ['asset-assignments'], exact: false });
      // Invalidate stats as well
      await queryClient.invalidateQueries({ queryKey: ['asset-stats'], exact: false });
      showToast.success('toast.assets.assignmentRemoved');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.assignmentRemoveFailed'),
  });
};

export const useAssetMaintenance = (assetId?: string) => {
  const { user } = useAuth();
  return useQuery<AssetApi.AssetMaintenanceRecord[]>({
    queryKey: ['asset-maintenance', assetId],
    queryFn: async () => {
      if (!user || !assetId) return [];
      return assetsApi.listMaintenance(assetId);
    },
    enabled: !!user && !!assetId,
  });
};

export const useLogMaintenance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, maintenance }: { assetId: string; maintenance: Partial<AssetMaintenanceDomain> }) => {
      const payload = mapAssetMaintenanceDomainToInsert(maintenance);
      return assetsApi.createMaintenance(assetId, payload);
    },
    onSuccess: (_data, variables) => {
      if (variables.assetId) {
        queryClient.invalidateQueries({ queryKey: ['assets', variables.assetId] });
        queryClient.invalidateQueries({ queryKey: ['asset-maintenance', variables.assetId] });
      }
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      showToast.success('toast.assets.maintenanceSaved');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.maintenanceSaveFailed'),
  });
};

export const useUpdateMaintenance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: Partial<AssetMaintenanceDomain> }) => {
      const payload = mapAssetMaintenanceDomainToUpdate(data);
      return assetsApi.updateMaintenance(recordId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      showToast.success('toast.assets.maintenanceUpdated');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.maintenanceUpdateFailed'),
  });
};

export const useRemoveMaintenance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => assetsApi.deleteMaintenance(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      showToast.success('toast.assets.maintenanceRemoved');
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.assets.maintenanceRemoveFailed'),
  });
};

export const useAssetHistory = (assetId?: string) => {
  const { user } = useAuth();
  return useQuery<AssetApi.AssetHistory[]>({
    queryKey: ['asset-history', assetId],
    queryFn: async () => {
      if (!user || !assetId) return [];
      return assetsApi.history(assetId);
    },
    enabled: !!user && !!assetId,
  });
};

// Assets Dashboard Interface
export interface AssetsDashboard {
  totalAssets: number;
  totalValue: number;
  maintenanceCost: number;
  statusCounts: Record<string, number>;
  recentAssignments: Array<{
    id: string;
    assetId: string;
    assetName: string;
    assetTag: string;
    assignedToType: string;
    assignedToId: string | null;
    assignedToName: string | null;
    assignedOn: Date | null;
    expectedReturnDate: Date | null;
    status: string;
  }>;
  assetsByCategory: Array<{
    categoryId: string | null;
    categoryName: string | null;
    total: number;
    count: number;
  }>;
  assetsByAccount?: Array<{
    account_id: string;
    account_name: string;
    total_value: number;
    asset_count: number;
    currency_code: string;
  }>;
}

export const useAssetsDashboard = () => {
  const { user, profile } = useAuth();
  const { data: stats } = useAssetStats();
  const { assets = [] } = useAssets(undefined, false);

  return useQuery<AssetsDashboard | null>({
    queryKey: ['assets-dashboard', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !stats) return null;

      // Collect all assignments from all assets
      const allAssignments: Array<{
        id: string;
        assetId: string;
        assetName: string;
        assetTag: string;
        assignedToType: string;
        assignedToId: string | null;
        assignedToName: string | null;
        assignedOn: Date | null;
        expectedReturnDate: Date | null;
        status: string;
      }> = [];

      assets.forEach((asset) => {
        if (asset.assignments && asset.assignments.length > 0) {
          asset.assignments.forEach((assignment) => {
            allAssignments.push({
              id: assignment.id,
              assetId: asset.id,
              assetName: asset.name,
              assetTag: asset.assetTag,
              assignedToType: assignment.assignedToType,
              assignedToId: assignment.assignedToId,
              assignedToName: null, // Will be resolved in component if needed
              assignedOn: assignment.assignedOn,
              expectedReturnDate: assignment.expectedReturnDate,
              status: assignment.status,
            });
          });
        }
      });

      // Sort assignments by date (most recent first)
      allAssignments.sort((a, b) => {
        const dateA = a.assignedOn ? a.assignedOn.getTime() : 0;
        const dateB = b.assignedOn ? b.assignedOn.getTime() : 0;
        return dateB - dateA;
      });

      // Group assets by category (calculate value as price × total_copies)
      const categoryMap = new Map<string | null, { categoryId: string | null; categoryName: string | null; total: number; count: number }>();
      
      assets.forEach((asset) => {
        const categoryId = asset.categoryId;
        const categoryName = asset.categoryName || asset.category || 'Uncategorized';
        // Calculate value: price × total_copies (at least 1 copy)
        const price = asset.purchasePrice || 0;
        const copies = Math.max(1, asset.totalCopies || asset.totalCopiesCount || 1);
        const value = price * copies;

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            categoryId,
            categoryName,
            total: 0,
            count: 0,
          });
        }

        const category = categoryMap.get(categoryId)!;
        category.total += value;
        category.count += 1;
      });

      const assetsByCategory = Array.from(categoryMap.values());

      return {
        totalAssets: stats.asset_count || 0,
        totalValue: stats.total_purchase_value || 0, // Already calculated correctly in backend (price × copies)
        maintenanceCost: stats.maintenance_cost_total || 0,
        statusCounts: stats.status_counts || {},
        recentAssignments: allAssignments.slice(0, 10), // Get top 10 most recent
        assetsByCategory,
        assetsByAccount: (stats as any).assets_by_account || [],
      };
    },
    enabled: !!user && !!profile?.organization_id && !!stats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};
