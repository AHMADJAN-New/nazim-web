import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { residencyTypesApi } from '@/lib/api/client';

// TypeScript interfaces for Residency Type
export interface ResidencyType {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ResidencyTypeInsert {
  name: string;
  code: string;
  description?: string | null;
  is_active?: boolean;
  organization_id?: string | null;
}

export interface ResidencyTypeUpdate {
  name?: string;
  code?: string;
  description?: string | null;
  is_active?: boolean;
  organization_id?: string | null;
}

export const useResidencyTypes = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['residency-types', organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return [];

      // Fetch residency types from Laravel API
      const data = await residencyTypesApi.list({
        organization_id: organizationId,
      });

      return (data || []) as ResidencyType[];
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateResidencyType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { orgIds } = useAccessibleOrganizations();

  return useMutation({
    mutationFn: async (residencyTypeData: ResidencyTypeInsert) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get organization_id - use provided or user's org
      let organizationId = residencyTypeData.organization_id ?? profile.organization_id ?? null;
      if (organizationId && !orgIds.includes(organizationId)) {
        throw new Error('Cannot create residency type for different organization');
      }

      // Validation: max 100 characters for name
      if (residencyTypeData.name.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }

      // Validation: max 50 characters for code
      if (residencyTypeData.code.length > 50) {
        throw new Error('Code must be 50 characters or less');
      }

      // Trim whitespace
      const trimmedName = residencyTypeData.name.trim();
      const trimmedCode = residencyTypeData.code.trim().toLowerCase();
      
      if (!trimmedName) {
        throw new Error('Name cannot be empty');
      }
      
      if (!trimmedCode) {
        throw new Error('Code cannot be empty');
      }

      // Create residency type via Laravel API
      // Laravel handles duplicate code validation server-side
      const data = await residencyTypesApi.create({
        name: trimmedName,
        code: trimmedCode,
        description: residencyTypeData.description || null,
        is_active: residencyTypeData.is_active !== undefined ? residencyTypeData.is_active : true,
        organization_id: organizationId,
      });

      return data as ResidencyType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      toast.success('Residency type created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create residency type');
    },
  });
};

export const useUpdateResidencyType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ResidencyType> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current residency type to check organization
      const currentResidencyType = await residencyTypesApi.get(id);

      if (!currentResidencyType) {
        throw new Error('Residency type not found');
      }

      // Validate organization access (unless super admin)
      if (profile.role !== 'super_admin' && currentResidencyType.organization_id !== profile.organization_id && currentResidencyType.organization_id !== null) {
        throw new Error('Cannot update residency type from different organization');
      }

      // Prevent organization_id changes (unless super admin)
      if (updates.organization_id !== undefined && profile.role !== 'super_admin') {
        throw new Error('Cannot change organization_id');
      }

      // Validation: max 100 characters for name
      if (updates.name && updates.name.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }

      // Validation: max 50 characters for code
      if (updates.code && updates.code.length > 50) {
        throw new Error('Code must be 50 characters or less');
      }

      // Trim whitespace if name or code is being updated
      const updateData: ResidencyTypeUpdate = { ...updates };
      if (updateData.name) {
        const trimmedName = updateData.name.trim();
        if (!trimmedName) {
          throw new Error('Name cannot be empty');
        }
        updateData.name = trimmedName;
      }

      if (updateData.code) {
        const trimmedCode = updateData.code.trim().toLowerCase();
        if (!trimmedCode) {
          throw new Error('Code cannot be empty');
        }
        updateData.code = trimmedCode;
      }

      // Update residency type via Laravel API
      // Laravel handles duplicate code validation server-side
      const data = await residencyTypesApi.update(id, updateData);

      return data as ResidencyType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      toast.success('Residency type updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update residency type');
    },
  });
};

export const useDeleteResidencyType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get current residency type to check organization
      const currentResidencyType = await residencyTypesApi.get(id);

      if (!currentResidencyType) {
        throw new Error('Residency type not found');
      }

      // Validate organization access (unless super admin)
      // Note: Global types (organization_id = NULL) can only be deleted by super admin
      if (profile.role !== 'super_admin') {
        if (currentResidencyType.organization_id === null) {
          throw new Error('Cannot delete global residency types');
        }
        if (currentResidencyType.organization_id !== profile.organization_id) {
          throw new Error('Cannot delete residency type from different organization');
        }
      }

      // Delete residency type via Laravel API (soft delete)
      await residencyTypesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      toast.success('Residency type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete residency type');
    },
  });
};
