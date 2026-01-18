/**
 * License Fee Hooks
 * Hooks for managing license fees and payments (one-time payments)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { useHasPermission } from './usePermissions';

import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type * as SubscriptionApi from '@/types/api/subscription';
import type {
  LicenseFeeStatus,
  PaymentRecord,
} from '@/types/domain/subscription';
import {
  mapLicenseFeeStatusApiToDomain,
  mapPaymentRecordApiToDomain,
  mapLicensePaymentToApi,
} from '@/mappers/subscriptionMapper';

// =====================================================
// LICENSE FEE HOOKS
// =====================================================

/**
 * Get license fee status for the current organization
 */
export const useLicenseFeeStatus = () => {
  const { user, profile } = useAuth();
  const hasSubscriptionRead = useHasPermission('subscription.read');

  return useQuery<LicenseFeeStatus | null>({
    queryKey: ['license-fee-status', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.LicenseFeeStatus }>(
          '/subscription/license-fees/status',
          { method: 'GET' }
        );
        return mapLicenseFeeStatusApiToDomain(response.data);
      } catch (error: any) {
        // If it's a 403 error (permission denied), return null gracefully
        if (error?.status === 403 || error?.message?.includes('unauthorized') || error?.message?.includes('Forbidden')) {
          if (import.meta.env.DEV) {
            console.log('[useLicenseFeeStatus] User does not have subscription.read permission, returning null');
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
 * Submit a license fee payment (one-time payment)
 */
export const usePayLicenseFee = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: {
      subscriptionId: string;
      amount: number;
      currency: 'AFN' | 'USD';
      paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
      paymentReference?: string;
      paymentDate: Date;
      notes?: string;
    }): Promise<PaymentRecord> => {
      const apiData = mapLicensePaymentToApi(data);
      
      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord }>(
        '/subscription/license-fees/pay',
        {
          method: 'POST',
          body: JSON.stringify(apiData),
        }
      );
      
      return mapPaymentRecordApiToDomain(response.data);
    },
    onSuccess: () => {
      showToast.success(t('toast.licensePaymentSubmitted') || 'License payment submitted successfully');
      void queryClient.invalidateQueries({ queryKey: ['license-fee-status'] });
      void queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.licensePaymentFailed') || 'Failed to submit license payment');
    },
  });
};

// Re-export domain types
export type {
  LicenseFeeStatus,
} from '@/types/domain/subscription';



