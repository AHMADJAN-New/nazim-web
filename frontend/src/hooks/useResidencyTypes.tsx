import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useLanguage } from './useLanguage';
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
    queryKey: ['residency-types', organizationId || profile?.organization_id, orgIds.join(','), profile?.default_school_id ?? null],
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
  const { t } = useLanguage();

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
        throw new Error(t('academic.academicYears.nameMaxLength'));
      }

      // Validation: max 50 characters for code
      if (residencyTypeData.code.length > 50) {
        throw new Error(t('academic.classes.codeMaxLength'));
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      await queryClient.refetchQueries({ queryKey: ['residency-types'] });
      showToast.success('toast.residencyTypeCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.residencyTypeCreateFailed');
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

      // Prevent organization_id changes (all users)
      // Backend handles organization access validation
      if (updates.organization_id !== undefined) {
        throw new Error('Cannot change organization_id');
      }

      // Validation: max 100 characters for name
      if (updates.name && updates.name.length > 100) {
        throw new Error(t('academic.academicYears.nameMaxLength'));
      }

      // Validation: max 50 characters for code
      if (updates.code && updates.code.length > 50) {
        throw new Error(t('academic.classes.codeMaxLength'));
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      await queryClient.refetchQueries({ queryKey: ['residency-types'] });
      showToast.success('toast.residencyTypeUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.residencyTypeUpdateFailed');
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

      // Delete residency type via Laravel API (soft delete)
      // Backend handles all validation: permission check, organization access, and "in use" check
      await residencyTypesApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['residency-types'] });
      await queryClient.refetchQueries({ queryKey: ['residency-types'] });
      showToast.success('toast.residencyTypeDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.residencyTypeDeleteFailed');
    },
  });
};
