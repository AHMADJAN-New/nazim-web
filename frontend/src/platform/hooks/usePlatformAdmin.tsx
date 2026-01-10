import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { platformApi } from '../lib/platformApi';

import { showToast } from '@/lib/toast';
import { mapOrganizationApiToDomain } from '@/mappers/organizationMapper';
import type * as OrganizationApi from '@/types/api/organization';
import type * as SubscriptionApi from '@/types/api/subscription';
import type { Organization } from '@/types/domain/organization';
import type { SubscriptionDashboardStats, SubscriptionPlan } from '@/types/domain/subscription';

/**
 * Map API SubscriptionPlan to domain SubscriptionPlan
 */
function mapPlanApiToDomain(api: SubscriptionApi.SubscriptionPlan): SubscriptionPlan {
  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    description: api.description,
    priceYearlyAfn: api.price_yearly_afn,
    priceYearlyUsd: api.price_yearly_usd,
    isActive: api.is_active,
    isDefault: api.is_default,
    isCustom: api.is_custom,
    trialDays: api.trial_days,
    gracePeriodDays: api.grace_period_days,
    readonlyPeriodDays: api.readonly_period_days,
    maxSchools: api.max_schools,
    perSchoolPriceAfn: api.per_school_price_afn,
    perSchoolPriceUsd: api.per_school_price_usd,
    sortOrder: api.sort_order,
    features: api.features || [],
    limits: api.limits || {},
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Get platform admin dashboard statistics
 */
export const usePlatformDashboard = () => {
  return useQuery<SubscriptionDashboardStats>({
    queryKey: ['platform-dashboard'],
    queryFn: async () => {
      const response = await platformApi.dashboard();
      
      // Map revenue by type
      const revenueByType = response.data.revenue_by_type ? {
        license: {
          afn: Number(response.data.revenue_by_type.license?.['AFN'] || 0),
          usd: Number(response.data.revenue_by_type.license?.['USD'] || 0),
        },
        maintenance: {
          afn: Number(response.data.revenue_by_type.maintenance?.['AFN'] || 0),
          usd: Number(response.data.revenue_by_type.maintenance?.['USD'] || 0),
        },
        renewal: {
          afn: Number(response.data.revenue_by_type.renewal?.['AFN'] || 0),
          usd: Number(response.data.revenue_by_type.renewal?.['USD'] || 0),
        },
      } : undefined;

      return {
        totalOrganizations: response.data.total_organizations,
        totalSchools: response.data.total_schools || 0,
        totalStudents: response.data.total_students || 0,
        subscriptionsByStatus: response.data.subscriptions_by_status,
        subscriptionsByPlan: response.data.subscriptions_by_plan,
        revenueThisYear: {
          afn: Number(response.data.revenue_this_year['AFN'] || 0),
          usd: Number(response.data.revenue_this_year['USD'] || 0),
        },
        revenueByType,
        pendingPayments: response.data.pending_payments,
        pendingRenewals: response.data.pending_renewals,
        expiringSoon: response.data.expiring_soon,
        recentlyExpired: response.data.recently_expired,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

/**
 * List all subscription plans (platform admin)
 */
export const usePlatformPlans = () => {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const response = await platformApi.plans.list();
      return response.data.map(mapPlanApiToDomain);
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get organization revenue history (platform admin)
 */
export const usePlatformOrganizationRevenueHistory = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['platform-organization-revenue-history', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await platformApi.subscriptions.getRevenueHistory(organizationId);
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * List all organizations (platform admin)
 */
export const usePlatformOrganizations = () => {
  return useQuery<Organization[]>({
    queryKey: ['platform-organizations'],
    queryFn: async () => {
      const response = await platformApi.organizations.list();
      return (response as OrganizationApi.Organization[]).map(mapOrganizationApiToDomain);
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get a single organization (platform admin)
 */
export const usePlatformOrganization = (organizationId: string | null) => {
  return useQuery<Organization | null>({
    queryKey: ['platform-organization', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await platformApi.organizations.get(organizationId);
      return mapOrganizationApiToDomain(response as OrganizationApi.Organization);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get organization admins (platform admin)
 */
export const usePlatformOrganizationAdmins = () => {
  return useQuery({
    queryKey: ['platform-organization-admins'],
    queryFn: async () => {
      return platformApi.organizations.admins();
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * List all subscriptions (platform admin)
 */
export const usePlatformSubscriptions = (params?: { status?: string; plan_id?: string }) => {
  return useQuery({
    queryKey: ['platform-subscriptions', params],
    queryFn: async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('[usePlatformSubscriptions] Fetching subscriptions with params:', params);
        }
        
        // Backend returns Laravel paginated response: { data: [], current_page, last_page, total, ... }
        // The API client's get() method returns response.json() directly
        const response = await platformApi.subscriptions.list(params);
        
        if (import.meta.env.DEV) {
          console.log('[usePlatformSubscriptions] Raw API response:', response);
          console.log('[usePlatformSubscriptions] Response type:', typeof response);
          console.log('[usePlatformSubscriptions] Is array:', Array.isArray(response));
          console.log('[usePlatformSubscriptions] Response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
        }
        
        // The response should be the paginated object with 'data' property
        const paginatedResponse = response as any;
        
        // Extract data from paginated response
        if (paginatedResponse && typeof paginatedResponse === 'object') {
          // Check for 'data' property (Laravel paginated response)
          if ('data' in paginatedResponse) {
            const data = paginatedResponse.data;
            if (import.meta.env.DEV) {
              console.log('[usePlatformSubscriptions] Found data property:', {
                type: typeof data,
                isArray: Array.isArray(data),
                length: Array.isArray(data) ? data.length : 'N/A',
                firstItem: Array.isArray(data) && data.length > 0 ? data[0] : 'N/A',
              });
            }
            if (Array.isArray(data)) {
              if (import.meta.env.DEV) {
                console.log('[usePlatformSubscriptions] Returning', data.length, 'subscriptions');
              }
              return data;
            }
          }
          // Check if response itself is an array (shouldn't happen, but handle it)
          if (Array.isArray(paginatedResponse)) {
            if (import.meta.env.DEV) {
              console.log('[usePlatformSubscriptions] Response is array, returning', paginatedResponse.length, 'items');
            }
            return paginatedResponse;
          }
        }
        
        // Fallback to empty array
        if (import.meta.env.DEV) {
          console.warn('[usePlatformSubscriptions] Could not extract data from response. Full response:', JSON.stringify(paginatedResponse, null, 2));
        }
        return [];
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[usePlatformSubscriptions] Error fetching subscriptions:', error);
          if (error instanceof Error) {
            console.error('[usePlatformSubscriptions] Error message:', error.message);
            console.error('[usePlatformSubscriptions] Error stack:', error.stack);
          }
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Get pending payments (platform admin)
 */
export const usePlatformPendingPayments = () => {
  return useQuery({
    queryKey: ['platform-pending-payments'],
    queryFn: async () => {
      const response = await platformApi.payments.pending();
      // Backend returns paginated data: { data: [], current_page, last_page, total }
      // Return the full response to maintain pagination structure
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - payments change frequently
  });
};

/**
 * Get pending renewals (platform admin)
 */
export const usePlatformPendingRenewals = () => {
  return useQuery({
    queryKey: ['platform-pending-renewals'],
    queryFn: async () => {
      const response = await platformApi.renewals.pending();
      // Backend returns paginated data: { data: [], current_page, last_page, total }
      // Return the full response to maintain pagination structure
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Create subscription plan (platform admin)
 */
export const useCreatePlatformPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.CreatePlanData) => {
      const response = await platformApi.plans.create(data);
      return mapPlanApiToDomain(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      showToast.success('Plan created successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create plan');
    },
  });
};

/**
 * Update subscription plan (platform admin)
 */
export const useUpdatePlatformPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & SubscriptionApi.UpdatePlanData) => {
      const response = await platformApi.plans.update(id, data);
      return mapPlanApiToDomain(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      showToast.success('Plan updated successfully');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to update plan');
    },
  });
};

