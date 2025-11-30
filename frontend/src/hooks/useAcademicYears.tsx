import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Use generated type from database schema
export type AcademicYear = Tables<'academic_years'>;
export type AcademicYearInsert = TablesInsert<'academic_years'>;
export type AcademicYearUpdate = TablesUpdate<'academic_years'>;

export const useAcademicYears = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['academic-years', organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return [];

      let query = (supabase as any)
        .from('academic_years')
        .select('*');

      const resolvedOrgIds = organizationId ? [organizationId] : orgIds;

      if (resolvedOrgIds.length === 0) {
        // Only show global years if no orgs; otherwise empty
        query = query.is('organization_id', null);
      } else {
        query = query.or(
          `organization_id.is.null,organization_id.in.(${resolvedOrgIds.join(',')})`
        );
      }

      const { data, error } = await query
        .is('deleted_at', null)
        .order('start_date', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as AcademicYear[];
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCurrentAcademicYear = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['current-academic-year', organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return null;

      let query = (supabase as any)
        .from('academic_years')
        .select('*')
        .eq('is_current', true);

      const resolvedOrgIds = organizationId ? [organizationId] : orgIds;

      if (resolvedOrgIds.length === 0) {
        query = query.is('organization_id', null);
      } else {
        query = query.or(`organization_id.is.null,organization_id.in.(${resolvedOrgIds.join(',')})`);
      }

      const { data, error } = await query
        .is('deleted_at', null)
        .maybeSingle();
      
      if (error) {
        throw new Error(error.message);
      }

      return (data || null) as AcademicYear | null;
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (academicYearData: { 
      name: string; 
      start_date: string;
      end_date: string;
      is_current?: boolean;
      description?: string | null;
      status?: string;
      organization_id?: string | null;
    }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get organization_id - use provided or user's org
      let organizationId = academicYearData.organization_id;
      if (organizationId === undefined) {
        if (profile.role === 'super_admin') {
          // Super admin can create global years (NULL) or org-specific
          organizationId = null; // Default to global
        } else if (profile.organization_id) {
          organizationId = profile.organization_id;
        } else {
          throw new Error('User must be assigned to an organization');
        }
      }

      // Validate organization access (unless super admin)
      if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
        throw new Error('Cannot create academic year for different organization');
      }

      // Validation: max 100 characters for name
      if (academicYearData.name.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }

      // Validation: date range
      const startDate = new Date(academicYearData.start_date);
      const endDate = new Date(academicYearData.end_date);
      
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
      }
      
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Trim whitespace
      const trimmedName = academicYearData.name.trim();
      
      if (!trimmedName) {
        throw new Error('Name cannot be empty');
      }

      // Check for duplicates (name must be unique per organization)
      const { data: existing } = await (supabase as any)
        .from('academic_years')
        .select('id')
        .eq('name', trimmedName)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        throw new Error('This academic year name already exists for this organization');
      }

      // If setting as current, the trigger will handle unsetting others
      const { data, error } = await (supabase as any)
        .from('academic_years')
        .insert({ 
          name: trimmedName,
          start_date: academicYearData.start_date,
          end_date: academicYearData.end_date,
          is_current: academicYearData.is_current || false,
          description: academicYearData.description || null,
          status: academicYearData.status || 'active',
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create academic year');
    },
  });
};

export const useUpdateAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AcademicYear> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const { data: currentAcademicYear } = await (supabase as any)
        .from('academic_years')
        .select('organization_id, start_date, end_date')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!currentAcademicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (unless super admin)
      if (profile.role !== 'super_admin' && currentAcademicYear.organization_id !== profile.organization_id && currentAcademicYear.organization_id !== null) {
        throw new Error('Cannot update academic year from different organization');
      }

      // Prevent organization_id changes (unless super admin)
      if (updates.organization_id !== undefined && profile.role !== 'super_admin') {
        throw new Error('Cannot change organization_id');
      }

      // Validation: max 100 characters for name
      if (updates.name && updates.name.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }

      // Validation: date range
      const startDate = updates.start_date ? new Date(updates.start_date) : new Date(currentAcademicYear.start_date);
      const endDate = updates.end_date ? new Date(updates.end_date) : new Date(currentAcademicYear.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Trim whitespace if name is being updated
      const updateData = { ...updates };
      if (updateData.name) {
        const trimmedName = updateData.name.trim();
        if (!trimmedName) {
          throw new Error('Name cannot be empty');
        }
        updateData.name = trimmedName;
      }

      // Check for duplicates (name must be unique per organization)
      if (updateData.name) {
        const organizationId = updateData.organization_id !== undefined 
          ? updateData.organization_id 
          : currentAcademicYear.organization_id;

        const { data: existing } = await (supabase as any)
          .from('academic_years')
          .select('id')
          .eq('name', updateData.name)
          .eq('organization_id', organizationId)
          .neq('id', id)
          .is('deleted_at', null)
          .maybeSingle();

        if (existing) {
          throw new Error('This academic year name already exists for this organization');
        }
      }

      // If setting as current, the trigger will handle unsetting others
      const { data, error } = await (supabase as any)
        .from('academic_years')
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
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update academic year');
    },
  });
};

export const useDeleteAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const { data: currentAcademicYear } = await (supabase as any)
        .from('academic_years')
        .select('organization_id, is_current')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!currentAcademicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (unless super admin)
      // Note: Global years (organization_id = NULL) can only be deleted by super admin
      if (profile.role !== 'super_admin') {
        if (currentAcademicYear.organization_id === null) {
          throw new Error('Cannot delete global academic years');
        }
        if (currentAcademicYear.organization_id !== profile.organization_id) {
          throw new Error('Cannot delete academic year from different organization');
        }
      }

      // Prevent deletion of current year (warn user)
      if (currentAcademicYear.is_current) {
        throw new Error('Cannot delete the current academic year. Please set another year as current first.');
      }

      // Soft delete: set deleted_at timestamp
      const { error } = await (supabase as any)
        .from('academic_years')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete academic year');
    },
  });
};

export const useSetCurrentAcademicYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current academic year to check organization
      const { data: academicYear } = await (supabase as any)
        .from('academic_years')
        .select('organization_id, is_current')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!academicYear) {
        throw new Error('Academic year not found');
      }

      // Validate organization access (unless super admin)
      if (profile.role !== 'super_admin' && academicYear.organization_id !== profile.organization_id && academicYear.organization_id !== null) {
        throw new Error('Cannot set academic year from different organization as current');
      }

      // Set as current (trigger will unset others)
      const { data, error } = await (supabase as any)
        .from('academic_years')
        .update({ is_current: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['current-academic-year'] });
      toast.success('Academic year set as current successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set academic year as current');
    },
  });
};

