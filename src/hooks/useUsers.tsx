import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfile } from './useProfiles';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_id: string | null;
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
  phone?: string;
}

export interface UpdateUserData {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  organization_id?: string | null;
  phone?: string;
  is_active?: boolean;
}

export const useUsers = (filters?: {
  role?: string;
  organization_id?: string | null;
  is_active?: boolean;
  search?: string;
}) => {
  const { data: currentProfile } = useProfile();

  return useQuery({
    queryKey: ['users', filters],
    queryFn: async (): Promise<UserProfile[]> => {
      if (!currentProfile) {
        throw new Error('User not authenticated');
      }

      // Check permissions
      const isSuperAdmin = currentProfile.role === 'super_admin';
      const isAdmin = currentProfile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to view users');
      }

      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, organization_id, phone, avatar_url, is_active, created_at, updated_at');

      // Apply organization filter for admins
      if (isAdmin && !isSuperAdmin) {
        query = query.eq('organization_id', currentProfile.organization_id);
      }

      // Apply filters
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      if (filters?.organization_id !== undefined) {
        if (filters.organization_id === null) {
          query = query.is('organization_id', null);
        } else {
          query = query.eq('organization_id', filters.organization_id);
        }
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      let users = (data || []).map((u) => ({
        id: u.id,
        name: u.full_name || u.email || '',
        email: u.email || '',
        role: u.role || '',
        organization_id: u.organization_id,
        phone: u.phone,
        avatar: (u as any).avatar_url || null,
        is_active: u.is_active ?? true,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));

      // Apply search filter client-side (for better performance with small datasets)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower) ||
            u.role.toLowerCase().includes(searchLower)
        );
      }

      return users;
    },
    enabled: !!currentProfile,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { data: currentProfile } = useProfile();

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      if (!currentProfile) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = currentProfile.role === 'super_admin';
      const isAdmin = currentProfile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to create users');
      }

      // Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role,
          organization_id: userData.organization_id || (isAdmin ? currentProfile.organization_id : null),
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: userData.full_name,
          role: userData.role,
          organization_id: userData.organization_id || (isAdmin ? currentProfile.organization_id : null),
          phone: userData.phone || null,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        // Try to clean up auth user if profile update fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(profileError.message);
      }

      return authData.user;
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
  const { data: currentProfile } = useProfile();

  return useMutation({
    mutationFn: async (userData: UpdateUserData) => {
      if (!currentProfile) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = currentProfile.role === 'super_admin';
      const isAdmin = currentProfile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to update users');
      }

      // Get target user's profile
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.id)
        .single();

      if (!targetProfile) {
        throw new Error('User not found');
      }

      // Check organization access for admins
      if (isAdmin && !isSuperAdmin) {
        if (targetProfile.organization_id !== currentProfile.organization_id) {
          throw new Error('Cannot update user from different organization');
        }
      }

      // Update profile
      const updateData: any = {};
      if (userData.full_name !== undefined) updateData.full_name = userData.full_name;
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.is_active !== undefined) updateData.is_active = userData.is_active;
      if (userData.organization_id !== undefined && isSuperAdmin) {
        updateData.organization_id = userData.organization_id;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userData.id);

      if (error) {
        throw new Error(error.message);
      }

      // Update auth user email if changed
      if (userData.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(userData.id, {
          email: userData.email,
        });

        if (authError) {
          console.error('Failed to update auth email:', authError);
          // Don't throw - profile update succeeded
        }
      }

      return { id: userData.id };
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
  const { data: currentProfile } = useProfile();

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

      // Get target user's profile
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', userId)
        .single();

      if (!targetProfile) {
        throw new Error('User not found');
      }

      // Prevent deleting super admin
      if (targetProfile.role === 'super_admin') {
        throw new Error('Cannot delete super admin user');
      }

      // Check organization access for admins
      if (isAdmin && !isSuperAdmin) {
        if (targetProfile.organization_id !== currentProfile.organization_id) {
          throw new Error('Cannot delete user from different organization');
        }
      }

      // Delete user (cascade will delete profile)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        throw new Error(error.message);
      }

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
  const { data: currentProfile } = useProfile();

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

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

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
