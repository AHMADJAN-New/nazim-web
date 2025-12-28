import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type * as SubscriptionApi from '@/types/api/subscription';
import type { SubscriptionDashboardStats } from '@/types/domain/subscription';

// =====================================================
// ADMIN DASHBOARD
// =====================================================

/**
 * Get subscription dashboard statistics (admin)
 */
export const useSubscriptionDashboard = () => {
  const { user, profile } = useAuth();

  return useQuery<SubscriptionDashboardStats>({
    queryKey: ['subscription-admin-dashboard'],
    queryFn: async () => {
      const response = await apiClient.request<{ data: SubscriptionApi.SubscriptionDashboard }>(
        '/admin/subscription/dashboard',
        { method: 'GET' }
      );
      
      return {
        totalOrganizations: response.data.total_organizations,
        subscriptionsByStatus: response.data.subscriptions_by_status,
        subscriptionsByPlan: response.data.subscriptions_by_plan,
        revenueThisYear: {
          afn: Number(response.data.revenue_this_year['AFN'] || 0),
          usd: Number(response.data.revenue_this_year['USD'] || 0),
        },
        pendingPayments: response.data.pending_payments,
        pendingRenewals: response.data.pending_renewals,
        expiringSoon: response.data.expiring_soon,
        recentlyExpired: response.data.recently_expired,
      };
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// =====================================================
// PLANS MANAGEMENT
// =====================================================

/**
 * List all plans (admin)
 */
export const useAdminPlans = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-plans'],
    queryFn: async () => {
      const response = await apiClient.request<{ data: SubscriptionApi.SubscriptionPlan[] }>(
        '/admin/subscription/plans',
        { method: 'GET' }
      );
      return response.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a new plan (admin)
 */
export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.CreatePlanData) => {
      const response = await apiClient.request<{ data: SubscriptionApi.SubscriptionPlan }>(
        '/admin/subscription/plans',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.planCreated') || 'Plan created successfully');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create plan');
    },
  });
};

/**
 * Update a plan (admin)
 */
export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SubscriptionApi.CreatePlanData> & { id: string }) => {
      const response = await apiClient.request<{ data: SubscriptionApi.SubscriptionPlan }>(
        `/admin/subscription/plans/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.planUpdated') || 'Plan updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update plan');
    },
  });
};

// =====================================================
// ORGANIZATION SUBSCRIPTIONS
// =====================================================

/**
 * List all subscriptions (admin)
 */
export const useAdminSubscriptions = (params?: {
  status?: string;
  plan_id?: string;
  expiring_days?: number;
  page?: number;
  per_page?: number;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-list', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.plan_id) searchParams.set('plan_id', params.plan_id);
      if (params?.expiring_days) searchParams.set('expiring_days', String(params.expiring_days));
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.per_page) searchParams.set('per_page', String(params.per_page));

      const response = await apiClient.request<{
        data: SubscriptionApi.OrganizationSubscription[];
        current_page: number;
        last_page: number;
        total: number;
      }>(
        `/admin/subscription/subscriptions?${searchParams.toString()}`,
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
};

/**
 * Get organization subscription details (admin)
 */
export const useOrganizationSubscription = (organizationId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-org', organizationId],
    queryFn: async () => {
      const response = await apiClient.request<{
        data: {
          subscription: SubscriptionApi.OrganizationSubscription | null;
          status: SubscriptionApi.SubscriptionStatusResponse;
          usage: Record<string, SubscriptionApi.UsageInfo>;
          features: SubscriptionApi.FeatureStatus[];
        };
      }>(
        `/admin/subscription/organizations/${organizationId}/subscription`,
        { method: 'GET' }
      );
      return response.data;
    },
    enabled: !!user && !!organizationId,
    staleTime: 60 * 1000,
  });
};

/**
 * Activate subscription for an organization (admin)
 */
export const useActivateSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ organizationId, ...data }: SubscriptionApi.ActivateSubscriptionData & { organizationId: string }) => {
      const response = await apiClient.request<{ data: SubscriptionApi.OrganizationSubscription }>(
        `/admin/subscription/organizations/${organizationId}/activate`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.subscriptionActivated') || 'Subscription activated successfully');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-org', variables.organizationId] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-list'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to activate subscription');
    },
  });
};

/**
 * Suspend subscription (admin)
 */
export const useSuspendSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ organizationId, reason }: { organizationId: string; reason: string }) => {
      const response = await apiClient.request<{ data: SubscriptionApi.OrganizationSubscription }>(
        `/admin/subscription/organizations/${organizationId}/suspend`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.subscriptionSuspended') || 'Subscription suspended');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-org', variables.organizationId] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-list'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to suspend subscription');
    },
  });
};

/**
 * Add limit override (admin)
 */
export const useAddLimitOverride = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ organizationId, ...data }: SubscriptionApi.AddLimitOverrideData & { organizationId: string }) => {
      const response = await apiClient.request<{ data: unknown }>(
        `/admin/subscription/organizations/${organizationId}/limit-override`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.limitOverrideAdded') || 'Limit override added');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-org', variables.organizationId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to add limit override');
    },
  });
};

/**
 * Add feature addon (admin)
 */
export const useAddFeatureAddon = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ organizationId, ...data }: SubscriptionApi.AddFeatureAddonData & { organizationId: string }) => {
      const response = await apiClient.request<{ data: unknown }>(
        `/admin/subscription/organizations/${organizationId}/feature-addon`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      showToast.success(t('toast.featureAddonAdded') || 'Feature addon added');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-org', variables.organizationId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to add feature addon');
    },
  });
};

// =====================================================
// PAYMENTS & RENEWALS
// =====================================================

/**
 * List pending payments (admin)
 */
export const usePendingPayments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-pending-payments'],
    queryFn: async () => {
      const response = await apiClient.request<{
        data: SubscriptionApi.PaymentRecord[];
        current_page: number;
        last_page: number;
        total: number;
      }>(
        '/admin/subscription/payments/pending',
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};

/**
 * Confirm payment (admin)
 */
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord }>(
        `/admin/subscription/payments/${paymentId}/confirm`,
        { method: 'POST' }
      );
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.paymentConfirmed') || 'Payment confirmed successfully');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-pending-payments'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-list'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to confirm payment');
    },
  });
};

/**
 * Reject payment (admin)
 */
export const useRejectPayment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord }>(
        `/admin/subscription/payments/${paymentId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.paymentRejected') || 'Payment rejected');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-pending-payments'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to reject payment');
    },
  });
};

/**
 * List pending renewals (admin)
 */
export const usePendingRenewals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-pending-renewals'],
    queryFn: async () => {
      const response = await apiClient.request<{
        data: SubscriptionApi.RenewalRequest[];
        current_page: number;
        last_page: number;
        total: number;
      }>(
        '/admin/subscription/renewals/pending',
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};

// =====================================================
// DISCOUNT CODES
// =====================================================

/**
 * List discount codes (admin)
 */
export const useAdminDiscountCodes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-discount-codes'],
    queryFn: async () => {
      const response = await apiClient.request<{
        data: SubscriptionApi.DiscountCode[];
        current_page: number;
        last_page: number;
        total: number;
      }>(
        '/admin/subscription/discount-codes',
        { method: 'GET' }
      );
      return response;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create discount code (admin)
 */
export const useCreateDiscountCode = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.CreateDiscountCodeData) => {
      const response = await apiClient.request<{ data: SubscriptionApi.DiscountCode }>(
        '/admin/subscription/discount-codes',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.discountCodeCreated') || 'Discount code created successfully');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-discount-codes'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create discount code');
    },
  });
};

/**
 * Update discount code (admin)
 */
export const useUpdateDiscountCode = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SubscriptionApi.CreateDiscountCodeData> & { id: string }) => {
      const response = await apiClient.request<{ data: SubscriptionApi.DiscountCode }>(
        `/admin/subscription/discount-codes/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      showToast.success(t('toast.discountCodeUpdated') || 'Discount code updated');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-discount-codes'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update discount code');
    },
  });
};

/**
 * Delete discount code (admin)
 */
export const useDeleteDiscountCode = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.request(
        `/admin/subscription/discount-codes/${id}`,
        { method: 'DELETE' }
      );
    },
    onSuccess: () => {
      showToast.success(t('toast.discountCodeDeleted') || 'Discount code deleted');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-discount-codes'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete discount code');
    },
  });
};

// =====================================================
// DEFINITIONS
// =====================================================

/**
 * Get feature definitions (admin)
 */
export const useFeatureDefinitions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-feature-definitions'],
    queryFn: async () => {
      const response = await apiClient.request<{ data: SubscriptionApi.FeatureDefinition[] }>(
        '/admin/subscription/feature-definitions',
        { method: 'GET' }
      );
      return response.data;
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Get limit definitions (admin)
 */
export const useLimitDefinitions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-admin-limit-definitions'],
    queryFn: async () => {
      const response = await apiClient.request<{ data: SubscriptionApi.LimitDefinition[] }>(
        '/admin/subscription/limit-definitions',
        { method: 'GET' }
      );
      return response.data;
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// =====================================================
// SYSTEM OPERATIONS
// =====================================================

/**
 * Process subscription status transitions (admin)
 */
export const useProcessTransitions = () => {
  const queryClient = useQueryClient();
  const { t: _t } = useLanguage();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.request<{
        data: { to_grace_period: number; to_readonly: number; to_expired: number };
      }>(
        '/admin/subscription/process-transitions',
        { method: 'POST' }
      );
      return response.data;
    },
    onSuccess: (data) => {
      const total = data.to_grace_period + data.to_readonly + data.to_expired;
      if (total > 0) {
        showToast.success(`Processed ${total} subscription transitions`);
      } else {
        showToast.info('No subscriptions needed transition');
      }
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-list'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-dashboard'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to process transitions');
    },
  });
};

/**
 * Recalculate usage for an organization (admin)
 */
export const useRecalculateUsage = () => {
  const queryClient = useQueryClient();
  const { t: _t } = useLanguage();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await apiClient.request<{ data: Record<string, number> }>(
        `/admin/subscription/organizations/${organizationId}/recalculate-usage`,
        { method: 'POST' }
      );
      return response.data;
    },
    onSuccess: (_, organizationId) => {
      showToast.success('Usage recalculated successfully');
      void queryClient.invalidateQueries({ queryKey: ['subscription-admin-org', organizationId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to recalculate usage');
    },
  });
};
