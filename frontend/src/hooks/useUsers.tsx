import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { usersApi } from '@/lib/api/client';

interface UserProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  organization_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  default_school_id: string | null;
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_id: string | null;
  default_school_id?: string | null;
  phone: string | null;
  avatar?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  organization_id?: string | null;
  default_school_id?: string | null;
  phone?: string;
}

export interface UpdateUserData {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  organization_id?: string | null;
  default_school_id?: string | null;
  phone?: string;
  is_active?: boolean;
}

export const useUsers = (filters?: {
  role?: string;
  organization_id?: string | null;
  is_active?: boolean;
  search?: string;
}) => {
  const { profile: currentProfile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['users', filters, orgIds.join(',')],
    queryFn: async (): Promise<UserProfile[]> => {
      if (!currentProfile || orgsLoading) {
        throw new Error('User not authenticated');
      }

      // Check permissions
      const isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'super_admin';
      if (!isAdmin) {
        throw new Error('Insufficient permissions to view users');
      }

      if (orgIds.length === 0) {
        return [];
      }

      // Fetch users from Laravel API
      const users = await usersApi.list(filters);
      return users as UserProfile[];
    },
    enabled: !!currentProfile && !orgsLoading,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      if (!currentProfile || orgsLoading) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = currentProfile.role === 'super_admin';
      const isAdmin = currentProfile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to create users');
      }

      // Determine organization_id within accessible orgs
      let organizationId: string | null = userData.organization_id ?? currentProfile.organization_id ?? null;
      if (organizationId && !orgIds.includes(organizationId)) {
        throw new Error('Cannot create user for a non-accessible organization');
      }
      if (!organizationId && orgIds.length > 0) {
        organizationId = orgIds[0];
      }

      // Create user via Laravel API
      const result = await usersApi.create({
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name,
        role: userData.role,
        organization_id: organizationId,
        default_school_id: userData.default_school_id,
        phone: userData.phone,
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useMutation({
    mutationFn: async (userData: UpdateUserData) => {
      if (!currentProfile || orgsLoading) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = currentProfile.role === 'super_admin';
      const isAdmin = currentProfile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to update users');
      }

      // Build update data
      const updateData: any = {};
      if (userData.full_name !== undefined) updateData.full_name = userData.full_name;
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.is_active !== undefined) updateData.is_active = userData.is_active;
      if (userData.organization_id !== undefined && isSuperAdmin) {
        if (userData.organization_id && !orgIds.includes(userData.organization_id)) {
          throw new Error('Cannot assign user to a non-accessible organization');
        }
        updateData.organization_id = userData.organization_id;
      }
      if (userData.default_school_id !== undefined && (isSuperAdmin || isAdmin)) {
        updateData.default_school_id = userData.default_school_id;
      }

      // Update user via Laravel API
      const result = await usersApi.update(userData.id, updateData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { profile: currentProfile } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!currentProfile) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = currentProfile.role === 'super_admin';
      const isAdmin = currentProfile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to delete users');
      }

      // Delete user via Laravel API
      await usersApi.delete(userId);
      return { id: userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
};

export const useResetUserPassword = () => {
  const { profile: currentProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      if (!currentProfile) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = currentProfile.role === 'super_admin';
      const isAdmin = currentProfile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to reset passwords');
      }

      // Reset password via Laravel API
      await usersApi.resetPassword(userId, newPassword);
      return { id: userId };
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });
};
