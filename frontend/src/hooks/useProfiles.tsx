import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useHasPermission } from './usePermissions';
import type * as ProfileApi from '@/types/api/profile';
import type { Profile } from '@/types/domain/profile';
import { mapProfileApiToDomain, mapProfileDomainToUpdate } from '@/mappers/profileMapper';

// Re-export domain types for convenience
export type { Profile } from '@/types/domain/profile';

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
  const hasPermission = useHasPermission('profiles.read');

  return useQuery<Profile[]>({
    queryKey: ['profiles', organizationId, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !currentProfile || orgsLoading) return [];

      // Check permissions (backend enforces this, this is just for UX)
      if (!hasPermission) {
        throw new Error('Insufficient permissions to view profiles');
      }

      // Use Laravel API - backend handles organization filtering
      const params = organizationId ? { organization_id: organizationId } : undefined;
      const apiProfiles = await profilesApi.list(params);

      // Sort by created_at (descending)
      const sorted = (apiProfiles as ProfileApi.Profile[]).sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate; // Descending order
      });

      // Map API → Domain
      return sorted.map(mapProfileApiToDomain);
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

      // Convert Domain → API for update payload
      const domainUpdate: Partial<Profile> = {};

      if (isOwnProfile) {
        // Users can update: fullName, phone, avatarUrl, defaultSchoolId
        if (updates.fullName !== undefined) domainUpdate.fullName = updates.fullName;
        if (updates.phone !== undefined) domainUpdate.phone = updates.phone;
        if (updates.avatarUrl !== undefined) domainUpdate.avatarUrl = updates.avatarUrl;
        if (updates.defaultSchoolId !== undefined) domainUpdate.defaultSchoolId = updates.defaultSchoolId;
      } else {
        // Admins can update: fullName, email, phone, avatarUrl, role, isActive, organizationId, defaultSchoolId
        if (updates.fullName !== undefined) domainUpdate.fullName = updates.fullName;
        if (updates.email !== undefined) domainUpdate.email = updates.email;
        if (updates.phone !== undefined) domainUpdate.phone = updates.phone;
        if (updates.avatarUrl !== undefined) domainUpdate.avatarUrl = updates.avatarUrl;
        if (updates.role !== undefined) domainUpdate.role = updates.role;
        if (updates.isActive !== undefined) domainUpdate.isActive = updates.isActive;
        if (updates.defaultSchoolId !== undefined) domainUpdate.defaultSchoolId = updates.defaultSchoolId;

        // Organization changes are not allowed (all users are organization-scoped)
        if (updates.organizationId !== undefined && updates.organizationId !== currentProfile?.organization_id) {
          throw new Error('Cannot change organization_id');
        }
      }

      // Map Domain → API
      const updateData = mapProfileDomainToUpdate(domainUpdate);

      // Use Laravel API - backend handles authorization
      const apiProfile = await profilesApi.update(id, updateData);

      // Map API → Domain
      return mapProfileApiToDomain(apiProfile as ProfileApi.Profile);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      // School switch affects almost every query; invalidate everything to prevent cross-school stale caches.
      queryClient.invalidateQueries();
      showToast.success('toast.profileUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.profileUpdateFailed');
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

