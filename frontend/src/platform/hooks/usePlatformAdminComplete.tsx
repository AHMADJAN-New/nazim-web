// This file contains all platform admin hooks - extending usePlatformAdmin.tsx
// Import and re-export from usePlatformAdmin, then add additional hooks here

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { platformApi } from '../lib/platformApi';

import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { mapOrganizationApiToDomain, mapOrganizationDomainToInsert } from '@/mappers/organizationMapper';
import type * as OrganizationApi from '@/types/api/organization';
import type * as SubscriptionApi from '@/types/api/subscription';
import type { Organization } from '@/types/domain/organization';

// Re-export from usePlatformAdmin
export * from './usePlatformAdmin';

import type * as HelpCenterApi from '@/types/api/helpCenter';

/**
 * Get organization subscription details (platform admin)
 */
export const usePlatformOrganizationSubscription = (organizationId: string) => {
  return useQuery({
    queryKey: ['platform-org-subscription', organizationId],
    queryFn: async () => {
      try {
        const response = await platformApi.subscriptions.get(organizationId);
        
        // Backend returns: { data: { subscription, status, usage, features } }
        // The API client returns response.json() directly, so response should be { data: { ... } }
        // But check if response itself is the data object or if it's wrapped
        let subscriptionData: any;
        
        if (response && typeof response === 'object') {
          if ('data' in response) {
            // Response has data property: { data: { subscription, status, usage, features } }
            subscriptionData = (response as any).data;
          } else if ('subscription' in response || 'status' in response) {
            // Response is already the data object: { subscription, status, usage, features }
            subscriptionData = response;
          } else {
            // Unknown structure, try to extract
            subscriptionData = response;
          }
        } else {
          subscriptionData = null;
        }
        
        // Map features to domain types (same format as useOrganizationSubscription)
        const mappedFeatures = ((subscriptionData?.features || []) as any[]).map((apiFeature: any) => ({
          featureKey: apiFeature.feature_key || apiFeature.featureKey,
          name: apiFeature.name,
          description: apiFeature.description,
          category: apiFeature.category,
          isEnabled: apiFeature.is_enabled ?? apiFeature.isEnabled ?? false,
          isAddon: apiFeature.is_addon ?? apiFeature.isAddon ?? false,
          canPurchaseAddon: apiFeature.can_purchase_addon ?? apiFeature.canPurchaseAddon ?? false,
          addonPriceAfn: Number(apiFeature.addon_price_afn || apiFeature.addonPriceAfn || 0),
          addonPriceUsd: Number(apiFeature.addon_price_usd || apiFeature.addonPriceUsd || 0),
        }));
        
        // Return the data structure expected by the component
        return {
          subscription: subscriptionData?.subscription || null,
          status: subscriptionData?.status || 'inactive',
          usage: subscriptionData?.usage || {},
          features: mappedFeatures,
        };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[usePlatformOrganizationSubscription] Error fetching subscription:', error);
        }
        throw error;
      }
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
};

/**
 * Activate subscription (platform admin)
 */
export const usePlatformActivateSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ organizationId, ...data }: SubscriptionApi.ActivateSubscriptionData & { organizationId: string }) => {
      const response = await platformApi.subscriptions.activate(organizationId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.subscriptionActivated') || 'Subscription activated successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-org-subscription', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['platform-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to activate subscription');
    },
  });
};

/**
 * Suspend subscription (platform admin)
 */
export const usePlatformSuspendSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ organizationId, reason }: { organizationId: string; reason: string }) => {
      const response = await platformApi.subscriptions.suspend(organizationId, { reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.subscriptionSuspended') || 'Subscription suspended');
      queryClient.invalidateQueries({ queryKey: ['platform-org-subscription', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['platform-subscriptions'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to suspend subscription');
    },
  });
};

/**
 * Confirm payment (platform admin)
 */
export const usePlatformConfirmPayment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      return platformApi.payments.confirm(paymentId);
    },
    onSuccess: () => {
      showToast.success(t('toast.paymentConfirmed') || 'Payment confirmed successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['platform-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to confirm payment');
    },
  });
};

/**
 * Reject payment (platform admin)
 */
export const usePlatformRejectPayment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      return platformApi.payments.reject(paymentId, { reason });
    },
    onSuccess: () => {
      showToast.success(t('toast.paymentRejected') || 'Payment rejected');
      queryClient.invalidateQueries({ queryKey: ['platform-pending-payments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to reject payment');
    },
  });
};

/**
 * Get renewal request (platform admin)
 */
export const usePlatformRenewalRequest = (renewalId: string) => {
  return useQuery({
    queryKey: ['platform-renewal', renewalId],
    queryFn: async () => {
      const response = await platformApi.renewals.get(renewalId);
      return response.data;
    },
    enabled: !!renewalId,
    staleTime: 60 * 1000,
  });
};

/**
 * Approve renewal (platform admin)
 */
export const usePlatformApproveRenewal = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ renewalId, ...data }: SubscriptionApi.ApproveRenewalData & { renewalId: string }) => {
      const response = await platformApi.renewals.approve(renewalId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.renewalApproved') || 'Renewal request approved');
      queryClient.invalidateQueries({ queryKey: ['platform-renewal', variables.renewalId] });
      queryClient.invalidateQueries({ queryKey: ['platform-pending-renewals'] });
      queryClient.invalidateQueries({ queryKey: ['platform-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['platform-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to approve renewal');
    },
  });
};

/**
 * Reject renewal (platform admin)
 */
export const usePlatformRejectRenewal = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ renewalId, reason }: { renewalId: string; reason: string }) => {
      const response = await platformApi.renewals.reject(renewalId, { reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.renewalRejected') || 'Renewal request rejected');
      queryClient.invalidateQueries({ queryKey: ['platform-renewal', variables.renewalId] });
      queryClient.invalidateQueries({ queryKey: ['platform-pending-renewals'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to reject renewal');
    },
  });
};

/**
 * List discount codes (platform admin)
 */
export const usePlatformDiscountCodes = () => {
  return useQuery({
    queryKey: ['platform-discount-codes'],
    queryFn: async () => {
      const response = await platformApi.discountCodes.list();
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create discount code (platform admin)
 */
export const usePlatformCreateDiscountCode = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.CreateDiscountCodeData) => {
      const response = await platformApi.discountCodes.create(data);
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.discountCodeCreated') || 'Discount code created successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-discount-codes'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create discount code');
    },
  });
};

/**
 * Update discount code (platform admin)
 */
export const usePlatformUpdateDiscountCode = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SubscriptionApi.CreateDiscountCodeData> & { id: string }) => {
      const response = await platformApi.discountCodes.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.discountCodeUpdated') || 'Discount code updated');
      queryClient.invalidateQueries({ queryKey: ['platform-discount-codes'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update discount code');
    },
  });
};

/**
 * Delete discount code (platform admin)
 */
export const usePlatformDeleteDiscountCode = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await platformApi.discountCodes.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.discountCodeDeleted') || 'Discount code deleted');
      queryClient.invalidateQueries({ queryKey: ['platform-discount-codes'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete discount code');
    },
  });
};

/**
 * Toggle feature for organization (platform admin)
 */
export const usePlatformToggleFeature = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      organizationId,
      featureKey,
    }: {
      organizationId: string;
      featureKey: string;
    }) => {
      const response = await platformApi.organizations.toggleFeature(organizationId, featureKey);
      return { response, organizationId, featureKey };
    },
    onMutate: async ({ organizationId, featureKey }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['platform-org-subscription', organizationId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['platform-org-subscription', organizationId]);

      // Optimistically update the cache
      queryClient.setQueryData(['platform-org-subscription', organizationId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          features: old.features?.map((feature: any) =>
            feature.featureKey === featureKey
              ? { ...feature, isEnabled: !feature.isEnabled }
              : feature
          ) || [],
        };
      });

      return { previousData };
    },
    onSuccess: async (data, variables) => {
      showToast.success(data.response?.message || 'Feature toggled successfully');
      
      // Invalidate and refetch to ensure we have the latest data from server
      await queryClient.invalidateQueries({
        queryKey: ['platform-org-subscription', variables.organizationId],
      });
      await queryClient.refetchQueries({
        queryKey: ['platform-org-subscription', variables.organizationId],
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ['platform-org-subscription', variables.organizationId],
          context.previousData
        );
      }
      showToast.error(error.message || 'Failed to toggle feature');
    },
  });
};

/**
 * Create organization (platform admin)
 */
export const usePlatformCreateOrganization = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (orgData: Partial<Organization> & { 
      admin_email: string;
      admin_password: string;
      admin_full_name: string;
    }) => {
      // Convert domain model to API insert payload using mapper
      const insertData = mapOrganizationDomainToInsert(orgData);
      
      // Add admin fields required by backend
      const payload = {
        ...insertData,
        admin_email: orgData.admin_email,
        admin_password: orgData.admin_password,
        admin_full_name: orgData.admin_full_name,
      };

      const apiOrganization = await platformApi.organizations.create(payload);
      return mapOrganizationApiToDomain(apiOrganization as OrganizationApi.Organization);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      showToast.success(t('toast.organizationCreated') || 'Organization created successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.organizationCreateFailed') || 'Failed to create organization');
    },
  });
};

/**
 * Update organization (platform admin)
 */
export const usePlatformUpdateOrganization = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      // Convert domain model to API update payload using mapper
      const updateData = mapOrganizationDomainToInsert(updates);
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const apiOrganization = await platformApi.organizations.update(id, updateData);
      return mapOrganizationApiToDomain(apiOrganization as OrganizationApi.Organization);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      showToast.success(t('toast.organizationUpdated') || 'Organization updated successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.organizationUpdateFailed') || 'Failed to update organization');
    },
  });
};

/**
 * Delete organization (platform admin)
 */
export const usePlatformDeleteOrganization = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await platformApi.organizations.delete(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
      await queryClient.refetchQueries({ queryKey: ['platform-organizations'] });
      showToast.success(t('toast.organizationDeleted') || 'Organization deleted successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.organizationDeleteFailed') || 'Failed to delete organization');
    },
  });
};

/**
 * Get permissions for an organization (platform admin)
 */
export const usePlatformOrganizationPermissions = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['platform-org-permissions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await platformApi.permissions.getForOrganization(organizationId);
      // Backend returns: { organization: {...}, permissions: [...], roles: [...], total_permissions: 123 }
      // Extract the permissions array from the response
      return (response as any)?.permissions || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get user permissions (platform admin)
 */
export const usePlatformUserPermissions = (userId: string | null) => {
  return useQuery({
    queryKey: ['platform-user-permissions', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await platformApi.userPermissions.get(userId);
      return response;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Assign permission to user (platform admin)
 */
export const usePlatformAssignPermissionToUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: number }) => {
      return platformApi.userPermissions.assign(userId, permissionId);
    },
    onSuccess: async (_, variables) => {
      showToast.success(t('toast.permissionAssignedToUser') || 'Permission assigned successfully');
      // Invalidate and refetch to get updated permissions
      await queryClient.invalidateQueries({ queryKey: ['platform-user-permissions', variables.userId] });
      await queryClient.refetchQueries({ queryKey: ['platform-user-permissions', variables.userId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.permissionAssignFailed') || 'Failed to assign permission');
    },
  });
};

/**
 * Remove permission from user (platform admin)
 */
export const usePlatformRemovePermissionFromUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: number }) => {
      return platformApi.userPermissions.remove(userId, permissionId);
    },
    onSuccess: async (_, variables) => {
      showToast.success(t('toast.permissionRemovedFromUser') || 'Permission removed successfully');
      // Invalidate and refetch to get updated permissions
      await queryClient.invalidateQueries({ queryKey: ['platform-user-permissions', variables.userId] });
      await queryClient.refetchQueries({ queryKey: ['platform-user-permissions', variables.userId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.permissionRemoveFailed') || 'Failed to remove permission');
    },
  });
};

/**
 * ============================================
 * PERMISSION GROUPS (Platform Admin)
 * ============================================
 */

/**
 * List all permission groups (platform admin)
 * Groups are global and can be assigned to any organization
 */
export const usePlatformPermissionGroups = () => {
  return useQuery({
    queryKey: ['platform-permission-groups'],
    queryFn: async () => {
      return platformApi.permissionGroups.list();
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create permission group (platform admin)
 */
export const usePlatformCreatePermissionGroup = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; permission_ids: number[] }) => {
      return platformApi.permissionGroups.create(data);
    },
    onSuccess: () => {
      showToast.success(t('toast.permissionGroupCreated') || 'Permission group created successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-permission-groups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.permissionGroupCreateFailed') || 'Failed to create permission group');
    },
  });
};

/**
 * Update permission group (platform admin)
 */
export const usePlatformUpdatePermissionGroup = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: { name?: string; description?: string; permission_ids?: number[] } }) => {
      return platformApi.permissionGroups.update(groupId, data);
    },
    onSuccess: () => {
      showToast.success(t('toast.permissionGroupUpdated') || 'Permission group updated successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-permission-groups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.permissionGroupUpdateFailed') || 'Failed to update permission group');
    },
  });
};

/**
 * Delete permission group (platform admin)
 */
export const usePlatformDeletePermissionGroup = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (groupId: string) => {
      return platformApi.permissionGroups.delete(groupId);
    },
    onSuccess: () => {
      showToast.success(t('toast.permissionGroupDeleted') || 'Permission group deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-permission-groups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.permissionGroupDeleteFailed') || 'Failed to delete permission group');
    },
  });
};

/**
 * Assign permission group to user (platform admin)
 * Assigns all permissions in the group at once
 */
export const usePlatformAssignPermissionGroupToUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ userId, permissionGroupId }: { userId: string; permissionGroupId: string }) => {
      return platformApi.permissionGroups.assignToUser(userId, permissionGroupId);
    },
    onSuccess: async (response, variables) => {
      const message = response.assigned > 0 
        ? `Assigned ${response.assigned} permission(s)${response.skipped > 0 ? ` (${response.skipped} already assigned)` : ''}`
        : 'All permissions were already assigned';
      showToast.success(message);
      // Invalidate and refetch to get updated permissions
      await queryClient.invalidateQueries({ queryKey: ['platform-user-permissions', variables.userId] });
      await queryClient.refetchQueries({ queryKey: ['platform-user-permissions', variables.userId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.permissionGroupAssignFailed') || 'Failed to assign permission group');
    },
  });
};

/**
 * Get feature definitions (platform admin)
 */
export const usePlatformFeatureDefinitions = () => {
  return useQuery({
    queryKey: ['platform-feature-definitions'],
    queryFn: async () => {
      const response = await platformApi.featureDefinitions();
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Remove permission group from user (platform admin)
 * Removes all permissions in the group at once
 */
export const usePlatformRemovePermissionGroupFromUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ userId, permissionGroupId }: { userId: string; permissionGroupId: string }) => {
      return platformApi.permissionGroups.removeFromUser(userId, permissionGroupId);
    },
    onSuccess: async (response, variables) => {
      showToast.success(`Removed ${response.removed} permission(s) from user`);
      // Invalidate and refetch to get updated permissions
      await queryClient.invalidateQueries({ queryKey: ['platform-user-permissions', variables.userId] });
      await queryClient.refetchQueries({ queryKey: ['platform-user-permissions', variables.userId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.permissionGroupRemoveFailed') || 'Failed to remove permission group');
    },
  });
};

/**
 * Create help center category (platform admin)
 */
export const usePlatformCreateHelpCenterCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: HelpCenterApi.HelpCenterCategoryInsert) => {
      const response = await platformApi.helpCenter.categories.create(data);
      return (response as { data: HelpCenterApi.HelpCenterCategory })?.data || response as HelpCenterApi.HelpCenterCategory;
    },
    onSuccess: () => {
      showToast.success(t('toast.categoryCreated') || 'Category created successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-help-center-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryCreateFailed') || 'Failed to create category');
    },
  });
};

/**
 * Update help center category (platform admin)
 */
export const usePlatformUpdateHelpCenterCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & HelpCenterApi.HelpCenterCategoryUpdate) => {
      const response = await platformApi.helpCenter.categories.update(id, data);
      return (response as { data: HelpCenterApi.HelpCenterCategory })?.data || response as HelpCenterApi.HelpCenterCategory;
    },
    onSuccess: () => {
      showToast.success(t('toast.categoryUpdated') || 'Category updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-help-center-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryUpdateFailed') || 'Failed to update category');
    },
  });
};

/**
 * Delete help center category (platform admin)
 */
export const usePlatformDeleteHelpCenterCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await platformApi.helpCenter.categories.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.categoryDeleted') || 'Category deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['platform-help-center-categories'] });
      await queryClient.refetchQueries({ queryKey: ['platform-help-center-categories'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.categoryDeleteFailed') || 'Failed to delete category');
    },
  });
};

/**
 * Create help center article (platform admin)
 */
export const usePlatformCreateHelpCenterArticle = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: HelpCenterApi.HelpCenterArticleInsert) => {
      const response = await platformApi.helpCenter.articles.create(data);
      return (response as { data: HelpCenterApi.HelpCenterArticle })?.data || response as HelpCenterApi.HelpCenterArticle;
    },
    onSuccess: () => {
      showToast.success(t('toast.articleCreated') || 'Article created successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-help-center-articles'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.articleCreateFailed') || 'Failed to create article');
    },
  });
};

/**
 * Update help center article (platform admin)
 */
export const usePlatformUpdateHelpCenterArticle = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & HelpCenterApi.HelpCenterArticleUpdate) => {
      const response = await platformApi.helpCenter.articles.update(id, data);
      return (response as { data: HelpCenterApi.HelpCenterArticle })?.data || response as HelpCenterApi.HelpCenterArticle;
    },
    onSuccess: () => {
      showToast.success(t('toast.articleUpdated') || 'Article updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-help-center-articles'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.articleUpdateFailed') || 'Failed to update article');
    },
  });
};

/**
 * Delete help center article (platform admin)
 */
export const usePlatformDeleteHelpCenterArticle = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await platformApi.helpCenter.articles.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.articleDeleted') || 'Article deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['platform-help-center-articles'] });
      await queryClient.refetchQueries({ queryKey: ['platform-help-center-articles'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.articleDeleteFailed') || 'Failed to delete article');
    },
  });
};

