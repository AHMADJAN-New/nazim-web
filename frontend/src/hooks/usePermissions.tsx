import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi, rolesApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { showToast } from '@/lib/toast';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useHasFeature, useFeatures } from './useSubscription';
import type * as PermissionApi from '@/types/api/permission';
import type { Permission, RolePermission } from '@/types/domain/permission';
import { mapPermissionApiToDomain, mapRolePermissionApiToDomain } from '@/mappers/permissionMapper';

// Re-export domain types for convenience
export type { Permission, RolePermission } from '@/types/domain/permission';

export const usePermissions = () => {
  const { profile } = useAuth();

  return useQuery<Permission[]>({
    queryKey: ['permissions', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      // Laravel API automatically filters permissions by user's organization
      // Returns: global permissions (organization_id = NULL) + user's org permissions
      const apiPermissions = await permissionsApi.list();
      // Laravel API returns permissions sorted, but ensure they're sorted by resource and action
      const sorted = (apiPermissions as PermissionApi.Permission[]).sort((a, b) => {
        if (a.resource !== b.resource) {
          return a.resource.localeCompare(b.resource);
        }
        return a.action.localeCompare(b.action);
      });
      // Map API → Domain
      return sorted.map(mapPermissionApiToDomain);
    },
    enabled: !!profile?.organization_id, // Only fetch if user has organization
    staleTime: 30 * 60 * 1000, // 30 minutes - permissions don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useRolePermissions = (role: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['role-permissions', role, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!role || !profile?.organization_id) return { role, permissions: [] };

      const response = await permissionsApi.rolePermissions(role);
      return response as { role: string; permissions: string[] };
    },
    enabled: !!role && !!profile?.organization_id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

export interface Role {
  id: string;
  name: string;
  description: string | null;
  organization_id: string | null;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const useRoles = () => {
  const { profile } = useAuth();

  return useQuery<Role[]>({
    queryKey: ['roles', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      const roles = await rolesApi.list();
      return (roles as Role[]);
    },
    enabled: !!profile && !!profile.organization_id,
    staleTime: 30 * 60 * 1000, // 30 minutes - roles don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canCreateRoles = useHasPermission('roles.create');

  return useMutation({
    mutationFn: async (roleData: {
      name: string;
      description?: string | null;
      guard_name?: string;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canCreateRoles) {
        throw new Error('You do not have permission to create roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await rolesApi.create({
        name: roleData.name,
        description: roleData.description || null,
        guard_name: roleData.guard_name || 'web',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleCreateFailed');
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdateRoles = useHasPermission('roles.update');

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdateRoles) {
        throw new Error('You do not have permission to update roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await rolesApi.update(id, {
        name: updates.name,
        description: updates.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleUpdateFailed');
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canDeleteRoles = useHasPermission('roles.delete');

  return useMutation({
    mutationFn: async (roleId: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canDeleteRoles) {
        throw new Error('You do not have permission to delete roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Delete role via Laravel API (soft delete)
      // Backend handles all validation: permission check, organization access, and "in use" check
      await rolesApi.delete(roleId);
    },
    onSuccess: async () => {
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      await queryClient.refetchQueries({ queryKey: ['roles'] });
      showToast.success('toast.roleDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleDeleteFailed');
    },
  });
};

export const useUserPermissions = () => {
  const { profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['user-permissions', profile?.organization_id, profile?.default_school_id ?? null, profile?.id, orgIds.join(',')],
    queryFn: async () => {
      // Require organization_id - backend enforces this
      if (!profile?.organization_id) return [];

      if (orgsLoading) return [];
      if (orgIds.length === 0 && profile.organization_id === null) {
        // Super admin with no orgs might still have permissions
        // Allow the API call to proceed
      }

      // Use Laravel API - it handles all permission logic on backend
      const response = await permissionsApi.userPermissions();

      // Laravel returns { permissions: string[] }
      const permissions = (response as { permissions?: string[] })?.permissions || [];

      return permissions.sort();
    },
    // FIXED: Check organization_id instead of role (role column is deprecated)
    enabled: !!profile?.organization_id && !orgsLoading,
    staleTime: 60 * 60 * 1000, // 1 hour - permissions don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // FIXED: Must refetch on mount to get permissions!
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Never auto-refetch
    // Use placeholderData instead of initialData to allow fetching
    placeholderData: [],
  });
};

export const useHasPermission = (permissionName: string): boolean | undefined => {
  const { profile } = useAuth();
  const { data: permissions, isLoading } = useUserPermissions();

  // Check permissions for all users
  // Use cached permissions even during background refetch
  // Only return undefined if we truly have no cached data AND we're loading
  if (permissions && permissions.length > 0) {
    // We have cached permissions, use them even if refetching in background
    return permissions.includes(permissionName);
  }

  // If loading and no cached data, return undefined (PermissionGuard will show loading)
  // This only happens on initial load, not on tab switches (cache should be available)
  if (isLoading && !permissions) {
    return undefined; // Indicates loading state
  }

  // No permissions found (not loading, but no permissions)
  return false;
};

/**
 * Map permission names to feature keys
 * This determines which subscription feature is required for a permission
 */
const PERMISSION_TO_FEATURE_MAP: Record<string, string> = {
  // Hostel feature
  'hostel.read': 'hostel',
  'hostel.create': 'hostel',
  'hostel.update': 'hostel',
  'hostel.delete': 'hostel',
  
  // Finance feature
  'finance_accounts.read': 'finance',
  'finance_accounts.create': 'finance',
  'finance_accounts.update': 'finance',
  'finance_accounts.delete': 'finance',
  'income_entries.read': 'finance',
  'income_entries.create': 'finance',
  'income_entries.update': 'finance',
  'income_entries.delete': 'finance',
  'expense_entries.read': 'finance',
  'expense_entries.create': 'finance',
  'expense_entries.update': 'finance',
  'expense_entries.delete': 'finance',
  'finance_projects.read': 'finance',
  'finance_projects.create': 'finance',
  'finance_projects.update': 'finance',
  'finance_projects.delete': 'finance',
  'donors.read': 'finance',
  'donors.create': 'finance',
  'donors.update': 'finance',
  'donors.delete': 'finance',
  'finance_reports.read': 'finance',
  'currencies.read': 'finance',
  'currencies.create': 'finance',
  'currencies.update': 'finance',
  'currencies.delete': 'finance',
  'exchange_rates.read': 'finance',
  'exchange_rates.create': 'finance',
  'exchange_rates.update': 'finance',
  'exchange_rates.delete': 'finance',
  'fees.read': 'finance',
  'fees.create': 'finance',
  'fees.update': 'finance',
  'fees.delete': 'finance',
  'fee_payments.read': 'finance',
  'fee_payments.create': 'finance',
  'fee_payments.update': 'finance',
  'fee_payments.delete': 'finance',
  'fee_exceptions.read': 'finance',
  'fee_exceptions.create': 'finance',
  'fee_exceptions.update': 'finance',
  'fee_exceptions.delete': 'finance',
  'finance_documents.read': 'finance',
  'finance_documents.create': 'finance',
  'finance_documents.update': 'finance',
  'finance_documents.delete': 'finance',
  
  // Library feature
  'library_books.read': 'library',
  'library_books.create': 'library',
  'library_books.update': 'library',
  'library_books.delete': 'library',
  'library_categories.read': 'library',
  'library_categories.create': 'library',
  'library_categories.update': 'library',
  'library_categories.delete': 'library',
  'library_loans.read': 'library',
  'library_loans.create': 'library',
  'library_loans.update': 'library',
  'library_loans.delete': 'library',
  
  // Events feature
  'events.read': 'events',
  'events.create': 'events',
  'events.update': 'events',
  'events.delete': 'events',
  'event_types.read': 'events',
  'event_types.create': 'events',
  'event_types.update': 'events',
  'event_types.delete': 'events',
  'event_guests.read': 'events',
  'event_guests.create': 'events',
  'event_guests.update': 'events',
  'event_guests.delete': 'events',
  'event_checkins.read': 'events',
  'event_checkins.create': 'events',
  'event_checkins.update': 'events',
  'event_checkins.delete': 'events',
  
  // Short-term courses feature
  'short_term_courses.read': 'short_courses',
  'short_term_courses.create': 'short_courses',
  'short_term_courses.update': 'short_courses',
  'short_term_courses.delete': 'short_courses',
  'short_term_courses.close': 'short_courses',
  'course_students.read': 'short_courses',
  'course_students.create': 'short_courses',
  'course_students.update': 'short_courses',
  'course_students.delete': 'short_courses',
  'course_students.report': 'short_courses',
  'course_attendance.read': 'short_courses',
  'course_attendance.create': 'short_courses',
  'course_attendance.update': 'short_courses',
  'course_attendance.delete': 'short_courses',
  'course_documents.read': 'short_courses',
  'course_documents.create': 'short_courses',
  'course_documents.update': 'short_courses',
  'course_documents.delete': 'short_courses',
  'certificate_templates.read': 'short_courses',
  'certificate_templates.create': 'short_courses',
  'certificate_templates.update': 'short_courses',
  'certificate_templates.delete': 'short_courses',
};

/**
 * Get the feature key required for a permission (if any)
 */
function getFeatureKeyForPermission(permissionName: string): string | null {
  return PERMISSION_TO_FEATURE_MAP[permissionName] || null;
}

/**
 * Combined hook that checks both permission AND feature access
 * Returns true only if BOTH conditions are met:
 * 1. User has the permission
 * 2. User's organization has the required feature enabled (if feature is required)
 * 
 * CRITICAL: Always calls useFeatures() unconditionally to follow Rules of Hooks
 */
export const useHasPermissionAndFeature = (permissionName: string): boolean | undefined => {
  const hasPermission = useHasPermission(permissionName);
  const featureKey = getFeatureKeyForPermission(permissionName);
  
  // CRITICAL: Always call useFeatures() unconditionally (Rules of Hooks)
  // Even if no feature is required, we still call the hook to maintain hook order
  const { data: features, isLoading: featuresLoading, error: featuresError } = useFeatures();
  
  // If no feature is required for this permission, just check permission
  if (!featureKey) {
    return hasPermission;
  }
  
  // If permissions are loading, return undefined
  if (hasPermission === undefined) {
    return undefined;
  }
  
  // If features query has an error (e.g., 402 Payment Required), treat as feature not available
  // This ensures buttons are hidden when features are disabled, even if the query fails
  if (featuresError) {
    // If permission is false, return false
    if (!hasPermission) {
      return false;
    }
    // Permission is true but feature query failed - assume feature is not available
    // This handles 402 errors where features endpoint itself might be blocked
    return false;
  }
  
  // If features are loading, return undefined (wait for data)
  // But only if we have placeholder data (empty array) - otherwise wait
  if (featuresLoading) {
    // If we have placeholder data (empty array), we can make a decision
    // Otherwise, wait for actual data
    if (features !== undefined && Array.isArray(features)) {
      // We have placeholder data, check if feature exists
      if (features.length === 0) {
        // Empty array means no features available
        return false;
      }
      // Has some features, check if our feature is in the list
      const feature = features.find((f) => f.featureKey === featureKey);
      if (!feature) {
        return false; // Feature not in list
      }
      return feature.isEnabled && hasPermission;
    }
    // No placeholder data yet, wait
    return undefined;
  }
  
  // If features data is not yet loaded (undefined), return undefined (wait for data)
  if (features === undefined) {
    return undefined;
  }
  
  // If features array is empty, assume feature is not enabled
  // This handles cases where the query returns empty array (e.g., 402 error handled in queryFn)
  if (!features || features.length === 0) {
    return false;
  }
  
  // Check if the specific feature is enabled
  const feature = features.find((f) => f.featureKey === featureKey);
  const hasFeature = feature?.isEnabled ?? false;
  
  // Both must be true - if permission is false, return false immediately
  if (!hasPermission) {
    return false;
  }
  
  // Permission is true, but feature must also be true
  return hasFeature;
};

export const useAssignPermissionToRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.assignPermissionToRole({
        role,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success(`Permission assigned to ${variables.role} role`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionAssignFailed');
    },
  });
};

export const useRemovePermissionFromRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.removePermissionFromRole({
        role,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.role] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success(`Permission removed from ${variables.role} role`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionRemoveFailed');
    },
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canCreatePermissions = useHasPermission('permissions.create');

  return useMutation({
    mutationFn: async (permissionData: {
      name: string;
      resource: string;
      action: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canCreatePermissions) {
        throw new Error('You do not have permission to create permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.create({
        name: permissionData.name,
        resource: permissionData.resource,
        action: permissionData.action,
        description: permissionData.description || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionCreateFailed');
    },
  });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      resource?: string;
      action?: string;
      description?: string | null;
    }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to update permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.update(id, {
        name: updates.name,
        resource: updates.resource,
        action: updates.action,
        description: updates.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionUpdateFailed');
    },
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async (permissionId: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to delete permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.delete(permissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      showToast.success('toast.permissionDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionDeleteFailed');
    },
  });
};

// ============================================================================
// User Permissions Hooks (for managing per-user permissions)
// ============================================================================

export const useUserPermissionsForUser = (userId: string) => {
  const { profile } = useAuth();
  const { data: allPermissions } = usePermissions();

  return useQuery({
    queryKey: ['user-permissions-for-user', userId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!userId) {
        return { userPermissions: [], rolePermissions: [], allPermissions: [] };
      }

      if (!profile?.organization_id) {
        return { userPermissions: [], rolePermissions: [], allPermissions: [] };
      }

      const response = await permissionsApi.userPermissionsForUser(userId);
      const data = response as {
        user_id: string;
        all_permissions: string[];
        direct_permissions: Array<{ id: string; name: string }>;
        role_permissions: Array<{ id: string; name: string }>;
      };

      // Map permission objects from backend response to component format
      const directPerms = (data.direct_permissions || []).map(permData => {
        const perm = allPermissions?.find(p => p.id === permData.id || p.name === permData.name);
        return {
          permission_id: permData.id, // Use ID directly from backend
          permission: perm || null,
        };
      });

      const rolePerms = (data.role_permissions || []).map(permData => {
        const perm = allPermissions?.find(p => p.id === permData.id || p.name === permData.name);
        return {
          permission_id: permData.id, // Use ID directly from backend
          permission: perm || null,
        };
      });

      return {
        userPermissions: directPerms,
        rolePermissions: rolePerms,
        allPermissions: data.all_permissions || [],
      };
    },
    enabled: !!userId && !!profile && !!allPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAssignPermissionToUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign user permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Validate permission ID is valid (permissions use integer IDs, not UUIDs)
      if (!permissionId || (typeof permissionId !== 'number' && typeof permissionId !== 'string')) {
        throw new Error('Invalid permission ID. Please refresh the page and try again.');
      }

      return await permissionsApi.assignPermissionToUser({
        user_id: userId,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionAssignedToUser');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionAssignFailed');
    },
  });
};

export const useRemovePermissionFromUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove user permissions');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      // Validate permission ID is valid (permissions use integer IDs, not UUIDs)
      if (!permissionId || (typeof permissionId !== 'number' && typeof permissionId !== 'string')) {
        throw new Error('Invalid permission ID. Please refresh the page and try again.');
      }

      return await permissionsApi.removePermissionFromUser({
        user_id: userId,
        permission_id: permissionId,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      showToast.success('toast.permissionRemovedFromUser');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.permissionRemoveFailed');
    },
  });
};

// ============================================================================
// User Role Management Hooks
// ============================================================================

export const useAssignRoleToUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to assign roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.assignRoleToUser({
        user_id: userId,
        role,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      showToast.success(`Role ${variables.role} assigned to user`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleAssignFailed');
    },
  });
};

export const useRemoveRoleFromUser = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const canUpdatePermissions = useHasPermission('permissions.update');

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      if (!canUpdatePermissions) {
        throw new Error('You do not have permission to remove roles');
      }

      if (!profile.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      return await permissionsApi.removeRoleFromUser({
        user_id: userId,
        role,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions-for-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', variables.userId] });
      showToast.success(`Role ${variables.role} removed from user`);
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.roleRemoveFailed');
    },
  });
};

export const useUserRoles = (userId: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-roles', userId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!userId || !profile?.organization_id) {
        return { user_id: userId, roles: [] };
      }

      const response = await permissionsApi.userRoles(userId);
      return response as { user_id: string; roles: string[] };
    },
    enabled: !!userId && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
