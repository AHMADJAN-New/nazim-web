import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Use generated type from database schema, extended with computed organization_id
export type Building = Tables<'buildings'> & {
  organization_id?: string | null;  // Computed from school relationship
};
export type BuildingInsert = TablesInsert<'buildings'>;
export type BuildingUpdate = TablesUpdate<'buildings'>;

export const useBuildings = (schoolId?: string, organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['buildings', schoolId, organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return [];

      let query = (supabase as any)
        .from('buildings')
        .select('*');

      if (schoolId) {
        // Filter by specific school
        // @ts-expect-error TS2589: Type instantiation is excessively deep and possibly infinite
        query = query.eq('school_id', schoolId);
      } else {
        const resolvedOrgIds = organizationId ? [organizationId] : orgIds;
        if (resolvedOrgIds.length === 0) return [];

        const { data: schools, error: schoolsError } = await (supabase as any)
          .from('school_branding')
          .select('id')
          .in('organization_id', resolvedOrgIds)
          .is('deleted_at', null);

        if (schoolsError) {
          throw new Error(schoolsError.message);
        }

        if (schools && schools.length > 0) {
          const schoolIds = schools.map((s: any) => s.id);
          query = query.in('school_id', schoolIds);
        } else {
          return [];
        }
      }
      // If super admin and no filters, show all

      // Try with deleted_at filter, fallback if column doesn't exist
      const { data, error } = await query.is('deleted_at', null).order('building_name', { ascending: true });
      
      // If error is about missing column, retry without the filter
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        const { data: retryData, error: retryError } = await query.order('building_name', { ascending: true });
        if (retryError) {
          throw new Error(retryError.message);
        }
        return (retryData || []) as unknown as Building[];
      }

      if (error) {
        throw new Error(error.message);
      }

      // Enrich buildings with organization_id from schools
      const buildings = (data || []) as any[];
      if (buildings.length === 0) {
        return [] as Building[];
      }

      // Get unique school IDs
      const schoolIds = [...new Set(buildings.map(b => b.school_id).filter(Boolean))];
      
      // Fetch organization_id for each school
      let schoolsMap: Record<string, string | null> = {};
      if (schoolIds.length > 0) {
        const { data: schools } = await (supabase as any)
          .from('school_branding')
          .select('id, organization_id')
          .in('id', schoolIds);
        
        if (schools) {
          schoolsMap = schools.reduce((acc: Record<string, string | null>, school: any) => {
            acc[school.id] = school.organization_id || null;
            return acc;
          }, {});
        }
      }

      // Transform data to include organization_id
      const transformedData = buildings.map((building: any) => ({
        ...building,
        organization_id: schoolsMap[building.school_id] || null,
      }));

      return transformedData as unknown as Building[];
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
        } else if (profile.role === 'super_admin') {
          // For super admin: get schools from their organizations
          // First, try to get primary organization (with error handling)
          let orgId: string | null = null;
          
          try {
            const { data: primaryOrg, error: primaryError } = await (supabase as any)
              .from('super_admin_organizations')
              .select('organization_id')
              .eq('super_admin_id', user.id)
              .eq('is_primary', true)
              .is('deleted_at', null)
              .single();
            
            if (!primaryError && primaryOrg) {
              orgId = primaryOrg.organization_id;
            } else {
              // If no primary, get any organization
              const { data: anyOrg, error: anyError } = await (supabase as any)
                .from('super_admin_organizations')
                .select('organization_id')
                .eq('super_admin_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();
              
              if (!anyError && anyOrg) {
                orgId = anyOrg.organization_id;
              } else if (profile.organization_id) {
                // Fallback to profile's organization_id
                orgId = profile.organization_id;
              }
            }
          } catch (error) {
            // If super_admin_organizations table doesn't exist, fallback to profile
            if (profile.organization_id) {
              orgId = profile.organization_id;
            }
          }
          
          if (orgId) {
            // Get first active school from the organization
            const { data: schools } = await (supabase as any)
              .from('school_branding')
              .select('id')
              .eq('organization_id', orgId)
              .is('deleted_at', null)
              .order('created_at', { ascending: true })
              .limit(1);
            
            if (schools && schools.length > 0) {
              schoolId = schools[0].id;
            } else {
              throw new Error('No schools found in your organization. Please create a school first.');
            }
          } else {
            throw new Error('No organization assigned. Please assign an organization first.');
          }
        } else if (profile.organization_id) {
          // Get first active school for user's organization (if default_school_id not set)
          const { data: schools } = await (supabase as any)
            .from('school_branding')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(1);
          
          if (schools && schools.length > 0) {
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

      // Check for duplicates within the same school (excluding soft-deleted)
      const { data: existing } = await supabase
        .from('buildings')
        .select('id')
        .eq('building_name', trimmedName)
        .eq('school_id', schoolId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        throw new Error('This building name already exists in this school');
      }

      const { data, error } = await (supabase as any)
        .from('buildings')
        .insert({ 
          building_name: trimmedName,
          school_id: schoolId
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

      // Get current building to check school (excluding soft-deleted)
      const { data: currentBuilding } = await (supabase as any)
        .from('buildings')
        .select('school_id')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!currentBuilding) {
        throw new Error('Building not found');
      }

      // Use provided school_id or keep current
      const schoolId = updateData.school_id || currentBuilding.school_id;

      // Check for duplicates within the same school (excluding current record and soft-deleted)
      if (updateData.building_name) {
        const { data: existing } = await supabase
          .from('buildings')
          .select('id')
          .eq('building_name', updateData.building_name)
          .eq('school_id', schoolId)
          .neq('id', id)
          .is('deleted_at', null)
          .maybeSingle();

        if (existing) {
          throw new Error('This building name already exists in this school');
        }
      }

      const { data, error } = await (supabase as any)
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
      // Check if building has rooms (excluding soft-deleted)
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('building_id', id)
        .is('deleted_at', null)
        .limit(1);

      if (rooms && rooms.length > 0) {
        throw new Error('This building has rooms assigned and cannot be deleted');
      }

      // Soft delete: set deleted_at timestamp
      const { error } = await (supabase as any)
        .from('buildings')
        .update({ deleted_at: new Date().toISOString() })
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

