import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type * as SubscriptionApi from '@/types/api/subscription';
import type { MaintenanceInvoice, MaintenanceFeeStatus, LicenseFeeStatus, PaymentRecord } from '@/types/domain/subscription';

/**
 * Map API MaintenanceInvoice to Domain MaintenanceInvoice
 */
function mapMaintenanceInvoiceApiToDomain(api: SubscriptionApi.MaintenanceInvoice): MaintenanceInvoice {
  return {
    id: api.id,
    organizationId: api.organization_id,
    subscriptionId: api.subscription_id,
    invoiceNumber: api.invoice_number,
    amount: api.amount,
    currency: api.currency,
    billingPeriod: api.billing_period,
    periodStart: new Date(api.period_start),
    periodEnd: new Date(api.period_end),
    dueDate: new Date(api.due_date),
    status: api.status,
    generatedAt: new Date(api.generated_at),
    sentAt: api.sent_at ? new Date(api.sent_at) : null,
    paidAt: api.paid_at ? new Date(api.paid_at) : null,
    cancelledAt: api.cancelled_at ? new Date(api.cancelled_at) : null,
    paymentRecordId: api.payment_record_id,
    notes: api.notes,
    metadata: api.metadata,
    organization: api.organization,
    subscription: api.subscription ? {
      id: api.subscription.id,
      organizationId: api.subscription.organization_id,
      planId: api.subscription.plan_id,
      status: api.subscription.status,
      startedAt: api.subscription.started_at ? new Date(api.subscription.started_at) : null,
      expiresAt: api.subscription.expires_at ? new Date(api.subscription.expires_at) : null,
      trialEndsAt: api.subscription.trial_ends_at ? new Date(api.subscription.trial_ends_at) : null,
      gracePeriodEndsAt: api.subscription.grace_period_ends_at ? new Date(api.subscription.grace_period_ends_at) : null,
      readonlyPeriodEndsAt: api.subscription.readonly_period_ends_at ? new Date(api.subscription.readonly_period_ends_at) : null,
      cancelledAt: api.subscription.cancelled_at ? new Date(api.subscription.cancelled_at) : null,
      suspensionReason: api.subscription.suspension_reason,
      autoRenew: api.subscription.auto_renew,
      currency: api.subscription.currency,
      amountPaid: api.subscription.amount_paid,
      additionalSchools: api.subscription.additional_schools,
      notes: api.subscription.notes,
      billingPeriod: api.subscription.billing_period,
      licensePaidAt: api.subscription.license_paid_at ? new Date(api.subscription.license_paid_at) : null,
      licensePaymentId: api.subscription.license_payment_id,
      nextMaintenanceDueAt: api.subscription.next_maintenance_due_at ? new Date(api.subscription.next_maintenance_due_at) : null,
      lastMaintenancePaidAt: api.subscription.last_maintenance_paid_at ? new Date(api.subscription.last_maintenance_paid_at) : null,
      plan: api.subscription.plan,
      organization: api.subscription.organization,
      createdAt: new Date(api.subscription.created_at),
      updatedAt: new Date(api.subscription.updated_at),
    } : undefined,
    paymentRecord: api.payment_record ? mapPaymentRecordApiToDomain(api.payment_record) : undefined,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Map API PaymentRecord to Domain PaymentRecord
 */
function mapPaymentRecordApiToDomain(api: SubscriptionApi.PaymentRecord): PaymentRecord {
  return {
    id: api.id,
    organizationId: api.organization_id,
    subscriptionId: api.subscription_id,
    amount: api.amount,
    currency: api.currency,
    paymentMethod: api.payment_method,
    paymentReference: api.payment_reference,
    paymentDate: api.payment_date ? new Date(api.payment_date) : new Date(),
    periodStart: api.period_start ? new Date(api.period_start) : null,
    periodEnd: api.period_end ? new Date(api.period_end) : null,
    status: api.status,
    confirmedBy: api.confirmed_by,
    confirmedAt: api.confirmed_at ? new Date(api.confirmed_at) : null,
    discountAmount: api.discount_amount,
    notes: api.notes,
    paymentType: api.payment_type,
    billingPeriod: api.billing_period,
    isRecurring: api.is_recurring,
    invoiceNumber: api.invoice_number,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
  };
}

/**
 * Get maintenance fee status for current organization
 */
export const useMaintenanceFees = () => {
  const { user, profile } = useAuth();

  return useQuery<MaintenanceFeeStatus | null>({
    queryKey: ['maintenance-fees-status', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.MaintenanceFeeStatus }>(
          '/subscription/maintenance-fees',
          { method: 'GET' }
        );
        const apiData = response.data;
        return {
          hasSubscription: apiData.has_subscription,
          maintenanceRequired: apiData.maintenance_required,
          subscriptionId: apiData.subscription_id,
          billingPeriod: apiData.billing_period,
          billingPeriodLabel: apiData.billing_period_label,
          nextDueDate: apiData.next_due_date ? new Date(apiData.next_due_date) : null,
          lastPaidDate: apiData.last_paid_date ? new Date(apiData.last_paid_date) : null,
          isOverdue: apiData.is_overdue,
          daysUntilDue: apiData.days_until_due,
          daysOverdue: apiData.days_overdue,
          amount: apiData.amount,
          currency: apiData.currency,
        };
      } catch (error: any) {
        if (error?.status === 403 || error?.message?.includes('unauthorized')) {
          if (import.meta.env.DEV) {
            console.log('[useMaintenanceFees] User does not have permission, returning null');
          }
          return null;
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Get upcoming maintenance fees
 */
export const useUpcomingMaintenanceFees = () => {
  const { user, profile } = useAuth();

  return useQuery<MaintenanceFeeStatus[]>({
    queryKey: ['upcoming-maintenance-fees', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.MaintenanceFeeStatus[] }>(
          '/subscription/maintenance-fees/upcoming',
          { method: 'GET' }
        );
        return (response.data || []).map((apiData) => ({
          hasSubscription: apiData.has_subscription,
          maintenanceRequired: apiData.maintenance_required,
          subscriptionId: apiData.subscription_id,
          billingPeriod: apiData.billing_period,
          billingPeriodLabel: apiData.billing_period_label,
          nextDueDate: apiData.next_due_date ? new Date(apiData.next_due_date) : null,
          lastPaidDate: apiData.last_paid_date ? new Date(apiData.last_paid_date) : null,
          isOverdue: apiData.is_overdue,
          daysUntilDue: apiData.days_until_due,
          daysOverdue: apiData.days_overdue,
          amount: apiData.amount,
          currency: apiData.currency,
        }));
      } catch (error: any) {
        if (error?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Get maintenance invoices for current organization
 */
export const useMaintenanceInvoices = () => {
  const { user, profile } = useAuth();

  return useQuery<MaintenanceInvoice[]>({
    queryKey: ['maintenance-invoices', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.MaintenanceInvoice[] }>(
          '/subscription/maintenance-fees/invoices',
          { method: 'GET' }
        );
        return (response.data || []).map(mapMaintenanceInvoiceApiToDomain);
      } catch (error: any) {
        if (error?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Get maintenance payment history
 */
export const useMaintenancePaymentHistory = () => {
  const { user, profile } = useAuth();

  return useQuery<PaymentRecord[]>({
    queryKey: ['maintenance-payment-history', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord[] }>(
          '/subscription/maintenance-fees/payment-history',
          { method: 'GET' }
        );
        return (response.data || []).map(mapPaymentRecordApiToDomain);
      } catch (error: any) {
        if (error?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Submit maintenance fee payment
 */
export const usePayMaintenanceFee = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.SubmitMaintenancePaymentData) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord }>(
        '/subscription/maintenance-fees/pay',
        {
          method: 'POST',
          body: data,
        }
      );
      return mapPaymentRecordApiToDomain(response.data);
    },
    onSuccess: () => {
      showToast.success(t('subscription.maintenancePaymentSubmitted') || 'Maintenance payment submitted successfully');
      void queryClient.invalidateQueries({ queryKey: ['maintenance-fees-status'] });
      void queryClient.invalidateQueries({ queryKey: ['maintenance-invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['maintenance-payment-history'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('subscription.maintenancePaymentFailed') || 'Failed to submit maintenance payment');
    },
  });
};

/**
 * Get license fee status for current organization
 */
export const useLicenseFees = () => {
  const { user, profile } = useAuth();

  return useQuery<LicenseFeeStatus | null>({
    queryKey: ['license-fees-status', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.LicenseFeeStatus }>(
          '/subscription/license-fees',
          { method: 'GET' }
        );
        const apiData = response.data;
        return {
          hasSubscription: apiData.has_subscription,
          licenseRequired: apiData.license_required,
          subscriptionId: apiData.subscription_id,
          licensePaid: apiData.license_paid,
          licensePaidAt: apiData.license_paid_at ? new Date(apiData.license_paid_at) : null,
          licensePaymentId: apiData.license_payment_id,
          licensePending: apiData.license_pending,
          licenseAmount: apiData.license_amount,
          currency: apiData.currency,
        };
      } catch (error: any) {
        if (error?.status === 403 || error?.message?.includes('unauthorized')) {
          if (import.meta.env.DEV) {
            console.log('[useLicenseFees] User does not have permission, returning null');
          }
          return null;
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Get license payment history
 */
export const useLicensePaymentHistory = () => {
  const { user, profile } = useAuth();

  return useQuery<PaymentRecord[]>({
    queryKey: ['license-payment-history', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];

      try {
        const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord[] }>(
          '/subscription/license-fees/payment-history',
          { method: 'GET' }
        );
        return (response.data || []).map(mapPaymentRecordApiToDomain);
      } catch (error: any) {
        if (error?.status === 403) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Submit license fee payment
 */
export const usePayLicenseFee = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: SubscriptionApi.SubmitLicensePaymentData) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      const response = await apiClient.request<{ data: SubscriptionApi.PaymentRecord }>(
        '/subscription/license-fees/pay',
        {
          method: 'POST',
          body: data,
        }
      );
      return mapPaymentRecordApiToDomain(response.data);
    },
    onSuccess: () => {
      showToast.success(t('subscription.licensePaymentSubmitted') || 'License payment submitted successfully');
      void queryClient.invalidateQueries({ queryKey: ['license-fees-status'] });
      void queryClient.invalidateQueries({ queryKey: ['license-payment-history'] });
      void queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('subscription.licensePaymentFailed') || 'Failed to submit license payment');
    },
  });
};

