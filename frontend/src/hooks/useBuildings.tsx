import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { buildingsApi, schoolsApi } from '@/lib/api/client';

// TypeScript interfaces for Building
export interface Building {
  id: string;
  building_name: string;
  school_id: string;
  organization_id?: string | null; // Computed from school relationship
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface BuildingInsert {
  building_name: string;
  school_id: string;
}

export interface BuildingUpdate {
  building_name?: string;
  school_id?: string;
}

export const useBuildings = (schoolId?: string, organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
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

      const buildings = await buildingsApi.list(params);
      return (buildings || []) as Building[];
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateBuilding = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (buildingData: { building_name: string; school_id?: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get school_id - use provided, user's default_school_id, or get first school for user's org
      let schoolId = buildingData.school_id;
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
      if (buildingData.building_name.length > 100) {
        throw new Error('Building name must be 100 characters or less');
      }

      // Trim whitespace
      const trimmedName = buildingData.building_name.trim();
      if (!trimmedName) {
        throw new Error('Building name cannot be empty');
      }

      // Create building via Laravel API (validation handled server-side)
      const building = await buildingsApi.create({
        building_name: trimmedName,
        school_id: schoolId,
      });

      return building as Building;
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
      if (updates.building_name && updates.building_name.length > 100) {
        throw new Error('Building name must be 100 characters or less');
      }

      // Trim whitespace if building_name is being updated
      const updateData: BuildingUpdate = {};
      if (updates.building_name) {
        const trimmedName = updates.building_name.trim();
        if (!trimmedName) {
          throw new Error('Building name cannot be empty');
        }
        updateData.building_name = trimmedName;
      }
      if (updates.school_id) {
        updateData.school_id = updates.school_id;
      }

      // Update building via Laravel API (validation handled server-side)
      const building = await buildingsApi.update(id, updateData);
      return building as Building;
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
