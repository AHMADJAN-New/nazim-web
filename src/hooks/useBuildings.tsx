import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';

export interface Building {
  id: string;
  building_name: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export const useBuildings = (organizationId?: string) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['buildings', organizationId || profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];

      let query = supabase.from('buildings').select('*');

      // Super admin can see all or filter by org
      const isSuperAdmin = profile.organization_id === null && profile.role === 'super_admin';
      if (isSuperAdmin) {
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }
        // Otherwise show all
      } else {
        // Regular users see only their organization's buildings
        const userOrgId = profile.organization_id;
        if (userOrgId) {
          query = query.eq('organization_id', userOrgId);
        } else {
          return []; // No organization assigned
        }
      }

      const { data, error } = await query.order('building_name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as Building[];
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateBuilding = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const userOrgId = useUserOrganization();

  return useMutation({
    mutationFn: async (buildingData: { building_name: string; organization_id?: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get organization_id - use provided or user's org
      let organizationId = buildingData.organization_id;
      if (!organizationId) {
        if (profile.organization_id) {
          organizationId = profile.organization_id;
        } else if (profile.role === 'super_admin') {
          throw new Error('Organization ID is required for super admin');
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

      // Check for duplicates within the same organization
      const { data: existing } = await supabase
        .from('buildings')
        .select('id')
        .eq('building_name', trimmedName)
        .eq('organization_id', organizationId)
        .single();

      if (existing) {
        throw new Error('This building name already exists in your organization');
      }

      const { data, error } = await supabase
        .from('buildings')
        .insert({ 
          building_name: trimmedName,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
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
      const updateData = { ...updates };
      if (updateData.building_name) {
        const trimmedName = updateData.building_name.trim();
        if (!trimmedName) {
          throw new Error('Building name cannot be empty');
        }
        updateData.building_name = trimmedName;
      }

      // Get current building to check organization
      const { data: currentBuilding } = await supabase
        .from('buildings')
        .select('organization_id')
        .eq('id', id)
        .single();

      if (!currentBuilding) {
        throw new Error('Building not found');
      }

      // Check for duplicates within the same organization (excluding current record)
      if (updateData.building_name) {
        const { data: existing } = await supabase
          .from('buildings')
          .select('id')
          .eq('building_name', updateData.building_name)
          .eq('organization_id', currentBuilding.organization_id)
          .neq('id', id)
          .single();

        if (existing) {
          throw new Error('This building name already exists in your organization');
        }
      }

      const { data, error } = await supabase
        .from('buildings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
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
      // Check if building has rooms
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('building_id', id)
        .limit(1);

      if (rooms && rooms.length > 0) {
        throw new Error('This building has rooms assigned and cannot be deleted');
      }

      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503') {
          throw new Error('This building is in use and cannot be deleted');
        }
        throw new Error(error.message);
      }
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

