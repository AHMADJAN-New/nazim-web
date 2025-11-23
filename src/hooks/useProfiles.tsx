import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  organization_id: string | null;
  default_school_id: string | null;
  role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// DEPRECATED: Use useAuth() instead
// This hook is kept for backward compatibility but now uses AuthContext
export const useProfile = () => {
  const { profile } = useAuth();

  // Return in the same format as before for compatibility
  return {
    data: profile,
    isLoading: false,
    error: null,
  };
};

export const useProfiles = (organizationId?: string) => {
  const { user, profile: currentProfile } = useAuth();

  return useQuery({
    queryKey: ['profiles', organizationId],
    queryFn: async () => {
      if (!user || !currentProfile) return [];

      // Super admin can see all profiles
      // Admin can see profiles in their organization
      // Others cannot see profiles list
      if (currentProfile.role !== 'super_admin' && currentProfile.role !== 'admin') {
        throw new Error('Insufficient permissions to view profiles');
      }

      // Use untyped client for profiles table (has custom columns)
      let query = (supabase as any).from('profiles').select('*');

      if (currentProfile.role === 'admin') {
        // Admin can only see profiles in their organization
        query = query.eq('organization_id', currentProfile.organization_id);
      } else if (organizationId) {
        // Super admin can filter by organization
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as Profile[];
    },
    enabled: !!user && !!currentProfile,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, profile: currentProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }) => {
      if (!user || !currentProfile) {
        throw new Error('User not authenticated');
      }

      // Users can update their own profile (limited fields)
      // Admins can update profiles in their organization
      // Super admins can update any profile
      const isOwnProfile = id === user.id;
      const isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'super_admin';
      const isSuperAdmin = currentProfile.role === 'super_admin';

      if (!isOwnProfile && !isAdmin) {
        throw new Error('Insufficient permissions to update this profile');
      }

      // If updating another user's profile, check organization access
      if (!isOwnProfile && !isSuperAdmin) {
        const { data: targetProfile } = await (supabase as any)
          .from('profiles')
          .select('organization_id')
          .eq('id', id)
          .single();

        if (targetProfile?.organization_id !== currentProfile.organization_id) {
          throw new Error('Cannot update profile from different organization');
        }
      }

      // Users can only update limited fields on their own profile
      const updateData: any = {};
      if (isOwnProfile) {
        // Users can update: full_name, phone, avatar_url
        if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
      } else {
        // Admins can update: full_name, email, phone, avatar_url, role, is_active, organization_id
        if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
        if (updates.role !== undefined) updateData.role = updates.role;
        if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
        if (updates.organization_id !== undefined && isSuperAdmin) {
          updateData.organization_id = updates.organization_id;
        }
      }

      const { data, error } = await (supabase as any)
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
};

export const useUserRole = () => {
  const { profile } = useAuth();
  return profile?.role || null;
};

export const useUserOrganization = () => {
  const { profile } = useAuth();
  return {
    data: profile?.organization_id ?? null,
    isLoading: false,
    error: null,
  };
};

export const useIsSuperAdmin = () => {
  const { profile } = useAuth();
  // Super admin is identified by role, not by organization_id
  // (organization_id can be null or set to an organization)
  return profile?.role === 'super_admin';
};

