import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from './useAuth';
import { usePagination } from './usePagination';

import { buildingsApi, schoolsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapBuildingApiToDomain, mapBuildingDomainToInsert, mapBuildingDomainToUpdate } from '@/mappers/buildingMapper';
import type * as BuildingApi from '@/types/api/building';
import type { Building } from '@/types/domain/building';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';



// Re-export domain types for convenience
export type { Building } from '@/types/domain/building';

export const useBuildings = (schoolId?: string, organizationId?: string, usePaginated?: boolean) => {
  const { user, profile, profileLoading } = useAuth();
  const isEventUser = profile?.is_event_user === true;
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<Building[] | PaginatedResponse<BuildingApi.Building>>({
    queryKey: ['buildings', schoolId, organizationId || profile?.organization_id, profile?.default_school_id ?? null, usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Fetch buildings via Laravel API
      const params: { school_id?: string; organization_id?: string; page?: number; per_page?: number } = {};
      if (schoolId) {
        params.school_id = schoolId;
      } else if (organizationId || profile.organization_id) {
        params.organization_id = organizationId || profile.organization_id || undefined;
      }

      // Add pagination params if using pagination
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }

      const apiBuildings = await buildingsApi.list(params);
      
      // Check if response is paginated (Laravel returns meta fields directly, not nested)
      if (usePaginated && apiBuildings && typeof apiBuildings === 'object' && 'data' in apiBuildings && 'current_page' in apiBuildings) {
        // Laravel's paginated response has data and meta fields at the same level
        const paginatedResponse = apiBuildings as any;
        // Map API models to domain models
        const buildings = (paginatedResponse.data as BuildingApi.Building[]).map(mapBuildingApiToDomain);
        // Extract meta from Laravel's response structure
        const meta: PaginationMeta = {
          current_page: paginatedResponse.current_page,
          from: paginatedResponse.from,
          last_page: paginatedResponse.last_page,
          per_page: paginatedResponse.per_page,
          to: paginatedResponse.to,
          total: paginatedResponse.total,
          path: paginatedResponse.path,
          first_page_url: paginatedResponse.first_page_url,
          last_page_url: paginatedResponse.last_page_url,
          next_page_url: paginatedResponse.next_page_url,
          prev_page_url: paginatedResponse.prev_page_url,
        };
        return { data: buildings, meta } as PaginatedResponse<BuildingApi.Building>;
      }
      
      // Map API models to domain models (non-paginated)
      return (apiBuildings as BuildingApi.Building[]).map(mapBuildingApiToDomain);
    },
    enabled: !!user && !!profile && !profileLoading && !isEventUser, // Disable for event users and wait for profile
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<BuildingApi.Building>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<BuildingApi.Building> | undefined;
    return {
      buildings: paginatedData?.data || [],
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
    data: data as Building[] | undefined,
    isLoading,
    error,
  };
};

export const useCreateBuilding = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (buildingData: { buildingName: string; schoolId?: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get school_id - use provided, user's default_school_id, or get first school for user's org
      let schoolId = buildingData.schoolId;
      if (!schoolId) {
        // First, try to use user's default_school_id
        if (profile.default_school_id) {
          schoolId = profile.default_school_id;
        } else if (profile.organization_id) {
          // Get first active school for user's organization
          const schools = await schoolsApi.list({
            organization_id: profile.organization_id,
            is_active: true,
          });

          if (schools && Array.isArray(schools) && schools.length > 0) {
            schoolId = schools[0].id;
          } else {
            throw new Error('No schools found for your organization. Please create a school first.');
          }
        } else {
          throw new Error('User must be assigned to an organization');
        }
      }

      // Validation: max 100 characters
      if (buildingData.buildingName.length > 100) {
        throw new Error('Building name must be 100 characters or less');
      }

      // Trim whitespace
      const trimmedName = buildingData.buildingName.trim();
      if (!trimmedName) {
        throw new Error('Building name cannot be empty');
      }

      // Convert domain model to API insert payload
      const insertData = mapBuildingDomainToInsert({
        buildingName: trimmedName,
        schoolId,
      });

      // Create building via Laravel API (validation handled server-side)
      const apiBuilding = await buildingsApi.create(insertData);
      
      // Map API response back to domain model
      return mapBuildingApiToDomain(apiBuilding as BuildingApi.Building);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      showToast.success('buildings.buildingCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.buildings.createFailed');
    },
  });
};

export const useUpdateBuilding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Building> & { id: string }) => {
      // Validation: max 100 characters
      if (updates.buildingName && updates.buildingName.length > 100) {
        throw new Error('Building name must be 100 characters or less');
      }

      // Prepare update data
      const updateData: Partial<Building> = {};
      if (updates.buildingName) {
        const trimmedName = updates.buildingName.trim();
        if (!trimmedName) {
          throw new Error('Building name cannot be empty');
        }
        updateData.buildingName = trimmedName;
      }
      if (updates.schoolId) {
        updateData.schoolId = updates.schoolId;
      }

      // Convert domain model to API update payload
      const apiUpdateData = mapBuildingDomainToUpdate(updateData);

      // Update building via Laravel API (validation handled server-side)
      const apiBuilding = await buildingsApi.update(id, apiUpdateData);
      
      // Map API response back to domain model
      return mapBuildingApiToDomain(apiBuilding as BuildingApi.Building);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      showToast.success('buildings.buildingUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.buildings.updateFailed');
    },
  });
};

export const useDeleteBuilding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete building via Laravel API (validation handled server-side)
      await buildingsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      showToast.success('buildings.buildingDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.buildings.deleteFailed');
    },
  });
};
