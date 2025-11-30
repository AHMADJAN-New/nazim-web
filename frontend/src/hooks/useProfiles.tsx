import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/lib/api/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';

// Profile type matching Laravel API response
export interface Profile {
  id: string;
  organization_id: string | null;
  role: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  default_school_id: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type ProfileUpdate = Partial<ProfileInsert>;

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
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['profiles', organizationId, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !currentProfile || orgsLoading) return [];

      // Super admin can see all profiles
      // Admin can see profiles in their organization
      // Others cannot see profiles list
      if (currentProfile.role !== 'super_admin' && currentProfile.role !== 'admin') {
        throw new Error('Insufficient permissions to view profiles');
      }

      // Use Laravel API - backend handles organization filtering
      const params = organizationId ? { organization_id: organizationId } : undefined;
      const profiles = await profilesApi.list(params);

      return (profiles as Profile[]).sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate; // Descending order
      });
    },
    enabled: !!user && !!currentProfile && !orgsLoading,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, profile: currentProfile } = useAuth();
  const { orgIds } = useAccessibleOrganizations();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }) => {
      if (!user || !currentProfile) {
        throw new Error('User not authenticated');
      }

      // Build update data - backend will handle authorization
      // Frontend still filters fields based on permissions for better UX
      const isOwnProfile = id === user.id;
      const isSuperAdmin = currentProfile.role === 'super_admin';

      const updateData: any = {};
      
      if (isOwnProfile) {
        // Users can update: full_name, phone, avatar_url, default_school_id
        if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
        if (updates.default_school_id !== undefined) updateData.default_school_id = updates.default_school_id;
      } else {
        // Admins can update: full_name, email, phone, avatar_url, role, is_active, organization_id, default_school_id
        if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;
        if (updates.role !== undefined) updateData.role = updates.role;
        if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
        if (updates.default_school_id !== undefined) updateData.default_school_id = updates.default_school_id;
        
        // Only super admin can change organization_id
        if (updates.organization_id !== undefined && isSuperAdmin) {
          // Validate organization is accessible
          if (updates.organization_id && !orgIds.includes(updates.organization_id)) {
            throw new Error('Cannot assign profile to a non-accessible organization');
          }
          updateData.organization_id = updates.organization_id;
        }
      }

      // Use Laravel API - backend handles authorization
      const updatedProfile = await profilesApi.update(id, updateData);
      return updatedProfile as Profile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
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

