/**
 * Maintenance Fee Hooks
 * Hooks for managing maintenance fees, invoices, and payments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { useHasPermission } from './usePermissions';

import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type * as SubscriptionApi from '@/types/api/subscription';
import type {
  MaintenanceFeeStatus,
  MaintenanceInvoice,
  PaymentRecord,
} from '@/types/domain/subscription';
import {
  mapMaintenanceFeeStatusApiToDomain,
  mapMaintenanceInvoiceApiToDomain,
  mapPaymentRecordApiToDomain,
  mapMaintenancePaymentToApi,
} from '@/mappers/subscriptionMapper';

// =====================================================
// MAINTENANCE FEE HOOKS
// =====================================================

/**
 * Get maintenance fee status for the current organization
 */
export const useMaintenanceFeeStatus = () => {
  const { user, profile } = useAuth();
  const hasSubscriptionRead = useHasPermission('subscription.read');

  return useQuery<MaintenanceFeeStatus | null>({
    queryKey: ['maintenance-fee-status', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.MaintenanceFeeStatus }>(
          '/subscription/maintenance-fees/status',
          { method: 'GET' }
        );
        return mapMaintenanceFeeStatusApiToDomain(response.data);
      } catch (error: any) {
        // If it's a 403 error (permission denied), return null gracefully
        if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
          if (import.meta.env.DEV) {
            console.log('[useMaintenanceFeeStatus] User does not have subscription.read permission, returning null');
          }
          return null;
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id && hasSubscriptionRead === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 3;
    },
    placeholderData: null,
  });
};

/**
 * Get upcoming maintenance fees for the current organization
 */
export const useUpcomingMaintenanceFees = () => {
  const { user, profile } = useAuth();
  const hasSubscriptionRead = useHasPermission('subscription.read');

  return useQuery<MaintenanceInvoice[]>({
    queryKey: ['maintenance-fees-upcoming', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.MaintenanceInvoice[] }>(
          '/subscription/maintenance-fees/upcoming',
          { method: 'GET' }
        );
        return response.data.map(mapMaintenanceInvoiceApiToDomain);
      } catch (error: any) {
        if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
          if (import.meta.env.DEV) {
            console.log('[useUpcomingMaintenanceFees] Permission denied, returning empty array');
          }
          return [];
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id && hasSubscriptionRead === true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 3;
    },
    placeholderData: [],
  });
};

/**
 * Get maintenance invoices for the current organization
 */
export const useMaintenanceInvoices = (params?: {
  status?: SubscriptionApi.MaintenanceInvoiceStatus;
  limit?: number;
}) => {
  const { user, profile } = useAuth();
  const hasSubscriptionRead = useHasPermission('subscription.read');

  return useQuery<MaintenanceInvoice[]>({
    queryKey: ['maintenance-invoices', profile?.organization_id, params?.status, params?.limit],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      try {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        
        const url = `/subscription/maintenance-fees/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
        const response = await apiClient.request<{ data: SubscriptionApi.MaintenanceInvoice[] }>(
          url,
          { method: 'GET' }
        );
        return response.data.map(mapMaintenanceInvoiceApiToDomain);
      } catch (error: any) {
        if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
          if (import.meta.env.DEV) {
            console.log('[useMaintenanceInvoices] Permission denied, returning empty array');
          }
          return [];
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id && hasSubscriptionRead === true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 3;
    },
    placeholderData: [],
  });
};

/**
 * Submit a maintenance fee payment
 */
export const usePayMaintenanceFee = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: {
      subscriptionId: string;
      invoiceId?: string;
      amount: number;
      currency: 'AFN' | 'USD';
      paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
      paymentReference?: string;
      paymentDate: Date;
      notes?: string;
    }): Promise<PaymentRecord> => {
      const apiData = mapMaintenancePaymentToApi(data);
      
      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord }>(
        '/subscription/maintenance-fees/pay',
        {
          method: 'POST',
          body: JSON.stringify(apiData),
        }
      );
      
      return mapPaymentRecordApiToDomain(response.data);
    },
    onSuccess: () => {
      showToast.success(t('toast.maintenancePaymentSubmitted') || 'Maintenance payment submitted successfully');
      void queryClient.invalidateQueries({ queryKey: ['maintenance-fee-status'] });
      void queryClient.invalidateQueries({ queryKey: ['maintenance-fees-upcoming'] });
      void queryClient.invalidateQueries({ queryKey: ['maintenance-invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.maintenancePaymentFailed') || 'Failed to submit maintenance payment');
    },
  });
};

// Re-export domain types
export type {
  MaintenanceFeeStatus,
  MaintenanceInvoice,
} from '@/types/domain/subscription';


