import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  const { user } = useAuth();
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
    enabled: !!user,
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
  const { user } = useAuth();
  return useQuery<AssetApi.AssetStats>({
    queryKey: ['asset-stats'],
    queryFn: async () => {
      if (!user) return { asset_count: 0, maintenance_cost_total: 0, status_counts: {}, total_purchase_value: 0 };
      return assetsApi.stats();
    },
    enabled: !!user,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      toast.success('Asset saved successfully');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save asset'),
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      }
      toast.success('Asset updated');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update asset'),
  });
};

export const useDeleteAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => assetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-stats'] });
      toast.success('Asset removed');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to remove asset'),
  });
};

export const useAssignAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, assignment }: { assetId: string; assignment: Partial<AssetAssignmentDomain> }) => {
      const payload = mapAssetAssignmentDomainToInsert(assignment);
      return assetsApi.createAssignment(assetId, payload);
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (variables.assetId) {
        queryClient.invalidateQueries({ queryKey: ['assets', variables.assetId] });
        queryClient.invalidateQueries({ queryKey: ['asset-assignments', variables.assetId] });
      }
      toast.success('Assignment saved');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to assign asset'),
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      if (variables.assignmentId) {
        queryClient.invalidateQueries({ queryKey: ['asset-assignments', variables.assignmentId] });
      }
      toast.success('Assignment updated');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update assignment'),
  });
};

export const useRemoveAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => assetsApi.deleteAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-assignments'] });
      toast.success('Assignment removed');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to remove assignment'),
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
      toast.success('Maintenance saved');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to log maintenance'),
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
      toast.success('Maintenance updated');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update maintenance'),
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
      toast.success('Maintenance removed');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to remove maintenance record'),
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
