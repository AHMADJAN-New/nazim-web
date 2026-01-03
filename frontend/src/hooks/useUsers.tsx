import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useAuth } from './useAuth';
import { useHasPermission } from './usePermissions';

import { usersApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapUserProfileApiToDomain, mapCreateUserDataDomainToApi, mapUpdateUserDataDomainToApi } from '@/mappers/userMapper';
import type * as UserApi from '@/types/api/user';
import type { UserProfile, CreateUserData, UpdateUserData } from '@/types/domain/user';

// Re-export domain types for convenience
export type { UserProfile, CreateUserData, UpdateUserData } from '@/types/domain/user';

export const useUsers = (filters?: {
  role?: string;
  organization_id?: string | null;
  is_active?: boolean;
  search?: string;
}) => {
  const { profile: currentProfile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<UserProfile[]>({
    queryKey: ['users', filters, orgIds.join(',')],
    queryFn: async () => {
      if (!currentProfile || orgsLoading) {
        throw new Error('User not authenticated');
      }

      // Check permissions (backend enforces this, this is just for UX)
      // Frontend permission check is handled at component level

      if (orgIds.length === 0) {
        return [];
      }

      // Fetch users from Laravel API
      const apiUsers = await usersApi.list(filters);
      
      // Debug: Log raw API response in development
      if (import.meta.env.DEV) {
        console.log('[useUsers] Raw API response:', apiUsers);
      }
      
      // Map API → Domain
      const mappedUsers = (apiUsers as UserApi.UserProfile[]).map(mapUserProfileApiToDomain);
      
      // Debug: Log mapped users in development
      if (import.meta.env.DEV) {
        console.log('[useUsers] Mapped users:', mappedUsers);
      }
      
      return mappedUsers;
    },
    enabled: !!currentProfile && !orgsLoading,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const hasPermission = useHasPermission('users.create');

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      if (!currentProfile || orgsLoading) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission) {
        throw new Error('Insufficient permissions to create users');
      }

      // Determine organizationId within accessible orgs
      let organizationId: string | null = userData.organizationId ?? currentProfile.organizationId ?? null;
      if (organizationId && !orgIds.includes(organizationId)) {
        throw new Error('Cannot create user for a non-accessible organization');
      }
      if (!organizationId && orgIds.length > 0) {
        organizationId = orgIds[0];
      }

      // Update domain data with resolved organizationId
      const domainDataWithOrg: CreateUserData = {
        ...userData,
        organizationId,
      };

      // Map Domain → API
      const apiData = mapCreateUserDataDomainToApi(domainDataWithOrg);

      // Create user via Laravel API
      const apiResult = await usersApi.create(apiData);

      // Map API → Domain
      return mapUserProfileApiToDomain(apiResult as UserApi.UserProfile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showToast.success('toast.userCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.userCreateFailed');
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const hasPermission = useHasPermission('users.update');

  return useMutation({
    mutationFn: async (userData: UpdateUserData) => {
      if (!currentProfile || orgsLoading) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission) {
        throw new Error('Insufficient permissions to update users');
      }

      // Validate organizationId if provided (admin can only assign to their org)
      if (userData.organizationId !== undefined) {
        if (userData.organizationId && !orgIds.includes(userData.organizationId)) {
          throw new Error('Cannot assign user to a non-accessible organization');
        }
      }

      // Map Domain → API
      const updateData = mapUpdateUserDataDomainToApi(userData);

      // Update user via Laravel API
      const apiResult = await usersApi.update(userData.id, updateData);
      
      // Map API → Domain
      return mapUserProfileApiToDomain(apiResult as UserApi.UserProfile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showToast.success('toast.userUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.userUpdateFailed');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useAuth();
  const hasPermission = useHasPermission('users.delete');

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!currentProfile) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission) {
        throw new Error('Insufficient permissions to delete users');
      }

      // Delete user via Laravel API
      await usersApi.delete(userId);
      return { id: userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      showToast.success('toast.userDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.userDeleteFailed');
    },
  });
};

export const useResetUserPassword = () => {
  const { profile: currentProfile } = useAuth();
  const hasPermission = useHasPermission('users.reset_password');

  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      if (!currentProfile) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission) {
        throw new Error('Insufficient permissions to reset passwords');
      }

      // Reset password via Laravel API
      await usersApi.resetPassword(userId, newPassword);
      return { id: userId };
    },
    onSuccess: () => {
      showToast.success('toast.passwordReset');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.passwordResetFailed');
    },
  });
};
