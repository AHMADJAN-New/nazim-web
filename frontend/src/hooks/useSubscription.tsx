import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { useHasPermission } from './usePermissions';

import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type * as SubscriptionApi from '@/types/api/subscription';
import type {
  SubscriptionPlan,
  SubscriptionInfo,
  UsageInfo,
  UsageWarning,
  FeatureInfo,
  PriceBreakdown,
  RenewalRequest,
  PaymentRecord,
  SubscriptionHistoryEntry,
} from '@/types/domain/subscription';

// =====================================================
// MAPPERS
// =====================================================

function mapPlanApiToDomain(api: SubscriptionApi.SubscriptionPlan): SubscriptionPlan {
  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    description: api.description,
    priceYearlyAfn: Number(api.price_yearly_afn),
    priceYearlyUsd: Number(api.price_yearly_usd),
    isActive: api.is_active,
    isDefault: api.is_default,
    isCustom: api.is_custom,
    trialDays: api.trial_days,
    gracePeriodDays: api.grace_period_days,
    readonlyPeriodDays: api.readonly_period_days,
    maxSchools: api.max_schools,
    perSchoolPriceAfn: Number(api.per_school_price_afn),
    perSchoolPriceUsd: Number(api.per_school_price_usd),
    sortOrder: api.sort_order,
    features: api.features || [],
    limits: api.limits || {},
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
  };
}

function mapStatusApiToDomain(api: SubscriptionApi.SubscriptionStatusResponse): SubscriptionInfo {
  return {
    status: api.status,
    accessLevel: api.access_level,
    message: api.message,
    canRead: api.can_read,
    canWrite: api.can_write,
    plan: api.plan,
    startedAt: api.started_at ? new Date(api.started_at) : null,
    expiresAt: api.expires_at ? new Date(api.expires_at) : null,
    trialEndsAt: api.trial_ends_at ? new Date(api.trial_ends_at) : null,
    gracePeriodEndsAt: api.grace_period_ends_at ? new Date(api.grace_period_ends_at) : null,
    readonlyPeriodEndsAt: api.readonly_period_ends_at ? new Date(api.readonly_period_ends_at) : null,
    daysLeft: api.days_left,
    trialDaysLeft: api.trial_days_left,
    isTrial: api.is_trial,
    additionalSchools: api.additional_schools,
    totalSchoolsAllowed: api.total_schools_allowed,
  };
}

function mapUsageApiToDomain(api: Record<string, SubscriptionApi.UsageInfo>): UsageInfo[] {
  return Object.entries(api).map(([key, value]) => ({
    resourceKey: key,
    name: value.name,
    description: value.description,
    category: value.category,
    unit: value.unit,
    current: value.current,
    limit: value.limit,
    remaining: value.remaining,
    percentage: value.percentage,
    isWarning: value.warning,
    isUnlimited: value.unlimited,
  }));
}

function mapWarningsApiToDomain(api: SubscriptionApi.UsageWarning[]): UsageWarning[] {
  return api.map((w) => ({
    resourceKey: w.resource_key,
    name: w.name,
    current: w.current,
    limit: w.limit,
    percentage: w.percentage,
    isBlocked: w.blocked,
  }));
}

function mapFeatureApiToDomain(api: SubscriptionApi.FeatureStatus): FeatureInfo {
  return {
    featureKey: api.feature_key,
    name: api.name,
    description: api.description,
    category: api.category,
    isEnabled: api.is_enabled,
    isAddon: api.is_addon,
    canPurchaseAddon: api.can_purchase_addon,
    addonPriceAfn: Number(api.addon_price_afn),
    addonPriceUsd: Number(api.addon_price_usd),
  };
}

function mapPriceApiToDomain(api: SubscriptionApi.PriceCalculation): PriceBreakdown {
  return {
    planId: api.plan_id,
    planName: api.plan_name,
    currency: api.currency,
    basePrice: Number(api.base_price),
    additionalSchools: api.additional_schools,
    schoolsPrice: Number(api.schools_price),
    subtotal: Number(api.subtotal),
    discountAmount: Number(api.discount_amount),
    discountInfo: api.discount_info,
    total: Number(api.total),
  };
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Get available subscription plans
 */
export const useSubscriptionPlans = () => {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await apiClient.request<{ data: SubscriptionApi.SubscriptionPlan[] }>(
        '/subscription/plans',
        { method: 'GET' }
      );
      return response.data.map(mapPlanApiToDomain);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });
};

/**
 * Get current subscription status
 * CRITICAL: Only accessible to users with subscription.read permission (admin and organization_admin)
 */
export const useSubscriptionStatus = () => {
  const { user, profile } = useAuth();
  const hasSubscriptionRead = useHasPermission('subscription.read');

  return useQuery<SubscriptionInfo | null>({
    queryKey: ['subscription-status', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.SubscriptionStatusResponse }>(
          '/subscription/status',
          { method: 'GET' }
        );
        return mapStatusApiToDomain(response.data);
      } catch (error: any) {
        // If it's a 403 error (permission denied), return null gracefully
        if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
          if (import.meta.env.DEV) {
            console.log('[useSubscriptionStatus] User does not have subscription.read permission, returning null');
          }
          return null;
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id && hasSubscriptionRead === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 403 errors (permission denied)
      if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 3;
    },
    placeholderData: null,
  });
};

/**
 * Get current usage statistics
 * CRITICAL: Only accessible to users with subscription.read permission (admin and organization_admin)
 */
export const useUsage = () => {
  const { user, profile } = useAuth();
  const hasSubscriptionRead = useHasPermission('subscription.read');

  return useQuery<{ usage: UsageInfo[]; warnings: UsageWarning[] }>({
    queryKey: ['subscription-usage', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) {
        return { usage: [], warnings: [] };
      }

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.UsageResponse }>(
          '/subscription/usage',
          { method: 'GET' }
        );
        
        return {
          usage: mapUsageApiToDomain(response.data.usage),
          warnings: mapWarningsApiToDomain(response.data.warnings),
        };
      } catch (error: any) {
        // If it's a 403 error (permission denied), return empty arrays gracefully
        if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
          if (import.meta.env.DEV) {
            console.log('[useUsage] User does not have subscription.read permission, returning empty arrays');
          }
          return { usage: [], warnings: [] };
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id && hasSubscriptionRead === true,
    staleTime: 0, // Always refetch - usage changes frequently
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60 * 1000, // Refetch every minute in case of background changes
    retry: (failureCount, error: any) => {
      // Don't retry on 403 errors (permission denied)
      if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 3;
    },
    placeholderData: { usage: [], warnings: [] },
  });
};

/**
 * Get all features and their status
 */
// Track recently invalidated features to prevent infinite loops
const recentlyInvalidatedFeatures = new Set<string>();
const invalidationTimeouts = new Map<string, NodeJS.Timeout>();

export const useFeatures = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const hasSubscriptionRead = useHasPermission('subscription.read');
  
  // Use stable organization ID to prevent dependency array size changes
  const organizationId = profile?.organization_id ?? null;

  // Use a ref to store the debounced invalidation function to ensure it's stable
  const invalidateFeaturesDebouncedRef = useRef<((featureKey: string) => void) | null>(null);

  // Initialize the debounced function once
  if (!invalidateFeaturesDebouncedRef.current) {
    invalidateFeaturesDebouncedRef.current = (featureKey: string) => {
      // Prevent infinite loops: only invalidate if we haven't invalidated this feature recently
      if (recentlyInvalidatedFeatures.has(featureKey)) {
        // Silently skip - no need to log every skip
        return;
      }
      
      // Mark as recently invalidated
      recentlyInvalidatedFeatures.add(featureKey);
      
      // Clear feature from "recently invalidated" set after 5 seconds
      const timeout = setTimeout(() => {
        recentlyInvalidatedFeatures.delete(featureKey);
        invalidationTimeouts.delete(featureKey);
      }, 5000);
      
      // Clear any existing timeout for this feature
      const existingTimeout = invalidationTimeouts.get(featureKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      invalidationTimeouts.set(featureKey, timeout);
      
      // Only log when actually invalidating (not when skipping)
      if (import.meta.env.DEV) {
        console.log('[useFeatures] Invalidating features cache due to 402 error for feature:', featureKey);
      }
      
      // Invalidate for all organizations (in case user switches orgs)
      // Use a small delay to prevent immediate refetch loops
      setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: ['subscription-features'],
        });
      }, 100);
    };
  }

  // Listen for subscription errors (402) and invalidate features cache
  useEffect(() => {
    const handleSubscriptionError = (event: CustomEvent) => {
      const detail = event.detail as { featureKey?: string; code?: string };
      
      // If it's a feature-related error, invalidate features cache to refetch
      if (detail.code === 'FEATURE_NOT_AVAILABLE' && detail.featureKey) {
        invalidateFeaturesDebouncedRef.current?.(detail.featureKey);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('subscription-error', handleSubscriptionError as EventListener);
      return () => {
        window.removeEventListener('subscription-error', handleSubscriptionError as EventListener);
      };
    }
    // CRITICAL: Only depend on queryClient to keep dependency array size constant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  return useQuery<FeatureInfo[]>({
    queryKey: ['subscription-features', organizationId],
    queryFn: async () => {
      if (!user || !organizationId) return [];

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.FeatureStatus[] }>(
          '/subscription/features',
          { method: 'GET' }
        );
        return response.data.map(mapFeatureApiToDomain);
      } catch (error: any) {
        // If it's a 403 error (permission denied), return empty array gracefully
        if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
          if (import.meta.env.DEV) {
            console.log('[useFeatures] User does not have subscription.read permission, returning empty array');
          }
          return [];
        }
        // If it's a 402 error (feature not available), return empty array
        // This ensures buttons are hidden when features are disabled
        if (error?.isSubscriptionError || error?.status === 402) {
          if (import.meta.env.DEV) {
            console.log('[useFeatures] Features query returned 402, returning empty array');
          }
          return [];
        }
        // Re-throw other errors
        throw error;
      }
    },
    enabled: !!user && !!organizationId && hasSubscriptionRead === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on 403 errors (permission denied)
      if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      // Don't retry on 402 errors (subscription/feature errors)
      if (error?.isSubscriptionError || error?.status === 402 || error?.code === 'FEATURE_NOT_AVAILABLE') {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Return empty array as placeholder data when query is disabled or fails
    placeholderData: [],
  });
};

/**
 * Check if a specific feature is enabled
 */
export const useHasFeature = (featureKey: string): boolean => {
  const { data: features } = useFeatures();
  
  if (!features) return false;
  
  const feature = features.find((f) => f.featureKey === featureKey);
  return feature?.isEnabled ?? false;
};

/**
 * Get usage for a specific resource
 */
export const useResourceUsage = (resourceKey: string) => {
  const { data } = useUsage();
  
  if (!data?.usage) {
    return {
      current: 0,
      limit: -1,
      remaining: -1,
      percentage: 0,
      isWarning: false,
      isUnlimited: true,
      canCreate: true,
    };
  }
  
  const usage = data.usage.find((u) => u.resourceKey === resourceKey);
  
  if (!usage) {
    return {
      current: 0,
      limit: -1,
      remaining: -1,
      percentage: 0,
      isWarning: false,
      isUnlimited: true,
      canCreate: true,
    };
  }
  
  return {
    ...usage,
    canCreate: usage.isUnlimited || usage.current < usage.limit,
  };
};

/**
 * Calculate price for a plan
 */
export const useCalculatePrice = () => {
  const { t: _t } = useLanguage();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.CalculatePriceData): Promise<PriceBreakdown> => {
      const response = await apiClient.request<{ data: SubscriptionApi.PriceCalculation }>(
        '/subscription/calculate-price',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return mapPriceApiToDomain(response.data);
    },
  });
};

/**
 * Validate a discount code
 */
export const useValidateDiscountCode = () => {
  return useMutation({
    mutationFn: async (data: { code: string; plan_id?: string }): Promise<SubscriptionApi.DiscountCodeValidation> => {
      const response = await apiClient.request<SubscriptionApi.DiscountCodeValidation>(
        '/subscription/validate-discount',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return response;
    },
  });
};

/**
 * Create a renewal request
 */
export const useCreateRenewalRequest = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.CreateRenewalRequestData): Promise<RenewalRequest> => {
      const response = await apiClient.request<{ data: SubscriptionApi.RenewalRequest }>(
        '/subscription/renewal-request',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      return {
        id: response.data.id,
        organizationId: response.data.organization_id,
        subscriptionId: response.data.subscription_id,
        requestedPlanId: response.data.requested_plan_id,
        status: response.data.status,
        requestedAt: new Date(response.data.requested_at),
        processedBy: response.data.processed_by,
        processedAt: response.data.processed_at ? new Date(response.data.processed_at) : null,
        paymentRecordId: response.data.payment_record_id,
        discountCodeId: response.data.discount_code_id,
        additionalSchools: response.data.additional_schools,
        notes: response.data.notes,
        rejectionReason: response.data.rejection_reason,
        createdAt: new Date(response.data.created_at),
      };
    },
    onSuccess: () => {
      showToast.success(t('toast.renewalRequestSubmitted') || 'Renewal request submitted successfully');
      void queryClient.invalidateQueries({ queryKey: ['renewal-history'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.renewalRequestFailed') || 'Failed to submit renewal request');
    },
  });
};

/**
 * Submit payment for a renewal
 */
export const useSubmitPayment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.SubmitPaymentData): Promise<PaymentRecord> => {
      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord }>(
        '/subscription/submit-payment',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      return {
        id: response.data.id,
        organizationId: response.data.organization_id,
        subscriptionId: response.data.subscription_id,
        amount: Number(response.data.amount),
        currency: response.data.currency,
        paymentMethod: response.data.payment_method,
        paymentReference: response.data.payment_reference,
        paymentDate: new Date(response.data.payment_date),
        periodStart: response.data.period_start ? new Date(response.data.period_start) : null,
        periodEnd: response.data.period_end ? new Date(response.data.period_end) : null,
        status: response.data.status,
        confirmedBy: response.data.confirmed_by,
        confirmedAt: response.data.confirmed_at ? new Date(response.data.confirmed_at) : null,
        discountAmount: Number(response.data.discount_amount),
        notes: response.data.notes,
        createdAt: new Date(response.data.created_at),
      };
    },
    onSuccess: () => {
      showToast.success(t('toast.paymentSubmitted') || 'Payment submitted successfully');
      void queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      void queryClient.invalidateQueries({ queryKey: ['renewal-history'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.paymentFailed') || 'Failed to submit payment');
    },
  });
};

/**
 * Get renewal request history
 */
export const useRenewalHistory = () => {
  const { user, profile } = useAuth();

  return useQuery<RenewalRequest[]>({
    queryKey: ['renewal-history', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      const response = await apiClient.request<{ data: SubscriptionApi.RenewalRequest[] }>(
        '/subscription/renewal-history',
        { method: 'GET' }
      );
      
      return response.data.map((r) => ({
        id: r.id,
        organizationId: r.organization_id,
        subscriptionId: r.subscription_id,
        requestedPlanId: r.requested_plan_id,
        status: r.status,
        requestedAt: new Date(r.requested_at),
        processedBy: r.processed_by,
        processedAt: r.processed_at ? new Date(r.processed_at) : null,
        paymentRecordId: r.payment_record_id,
        discountCodeId: r.discount_code_id,
        additionalSchools: r.additional_schools,
        notes: r.notes,
        rejectionReason: r.rejection_reason,
        requestedPlan: r.requested_plan ? mapPlanApiToDomain(r.requested_plan) : undefined,
        createdAt: new Date(r.created_at),
      }));
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get payment history
 */
export const usePaymentHistory = () => {
  const { user, profile } = useAuth();

  return useQuery<PaymentRecord[]>({
    queryKey: ['payment-history', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord[] }>(
        '/subscription/payment-history',
        { method: 'GET' }
      );
      
      return response.data.map((p) => ({
        id: p.id,
        organizationId: p.organization_id,
        subscriptionId: p.subscription_id,
        amount: Number(p.amount),
        currency: p.currency,
        paymentMethod: p.payment_method,
        paymentReference: p.payment_reference,
        paymentDate: new Date(p.payment_date),
        periodStart: p.period_start ? new Date(p.period_start) : null,
        periodEnd: p.period_end ? new Date(p.period_end) : null,
        status: p.status,
        confirmedBy: p.confirmed_by,
        confirmedAt: p.confirmed_at ? new Date(p.confirmed_at) : null,
        discountAmount: Number(p.discount_amount),
        notes: p.notes,
        createdAt: new Date(p.created_at),
      }));
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get subscription history
 */
export const useSubscriptionHistory = () => {
  const { user, profile } = useAuth();

  return useQuery<SubscriptionHistoryEntry[]>({
    queryKey: ['subscription-history', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      const response = await apiClient.request<{ data: SubscriptionApi.SubscriptionHistory[] }>(
        '/subscription/history',
        { method: 'GET' }
      );
      
      return response.data.map((h) => ({
        id: h.id,
        organizationId: h.organization_id,
        subscriptionId: h.subscription_id,
        action: h.action,
        fromPlanId: h.from_plan_id,
        toPlanId: h.to_plan_id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        performedBy: h.performed_by,
        notes: h.notes,
        fromPlanName: h.from_plan?.name,
        toPlanName: h.to_plan?.name,
        createdAt: new Date(h.created_at),
      }));
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

// Re-export domain types
export type {
  SubscriptionPlan,
  SubscriptionInfo,
  UsageInfo,
  UsageWarning,
  FeatureInfo,
  PriceBreakdown,
  RenewalRequest,
  PaymentRecord,
  SubscriptionHistoryEntry,
  SubscriptionDashboardStats,
} from '@/types/domain/subscription';
