import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { buildingsApi, schoolsApi } from '@/lib/api/client';
import type * as BuildingApi from '@/types/api/building';
import type { Building } from '@/types/domain/building';
import { mapBuildingApiToDomain, mapBuildingDomainToInsert, mapBuildingDomainToUpdate } from '@/mappers/buildingMapper';

// Re-export domain types for convenience
export type { Building } from '@/types/domain/building';

export const useBuildings = (schoolId?: string, organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Building[]>({
    queryKey: ['buildings', schoolId, organizationId || profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Fetch buildings via Laravel API
      const params: { school_id?: string; organization_id?: string } = {};
      if (schoolId) {
        params.school_id = schoolId;
      } else if (organizationId || profile.organization_id) {
        params.organization_id = organizationId || profile.organization_id || undefined;
      }

      const apiBuildings = await buildingsApi.list(params);
      
      // Map API models to domain models
      return (apiBuildings as BuildingApi.Building[]).map(mapBuildingApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
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
      toast.success('Building created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create building');
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
      toast.success('Building updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update building');
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
      toast.success('Building deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete building');
    },
  });
};
