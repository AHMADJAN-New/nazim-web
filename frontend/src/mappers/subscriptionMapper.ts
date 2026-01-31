/**
 * Subscription Mapper
 * Converts between API (snake_case) and Domain (camelCase) subscription types
 */

import type * as SubscriptionApi from '@/types/api/subscription';
import type {
  SubscriptionPlan,
  SubscriptionInfo,
  PaymentRecord,
  PriceBreakdown,
  MaintenanceFeeStatus,
  MaintenanceInvoice,
  LicenseFeeStatus,
  BillingPeriod,
  PaymentType,
  LandingOffer,
} from '@/types/domain/subscription';

// Helper to convert billing period
function mapBillingPeriod(period: SubscriptionApi.BillingPeriod | null | undefined): BillingPeriod | null {
  if (!period) return null;
  return period;
}

// Helper to convert payment type
function mapPaymentType(type: SubscriptionApi.PaymentType | null | undefined): PaymentType | null {
  if (!type) return null;
  return type;
}

// Helper to get billing period label
function getBillingPeriodLabel(period: SubscriptionApi.BillingPeriod, customDays?: number | null): string {
  switch (period) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'yearly': return 'Yearly';
    case 'custom': return customDays ? `Every ${customDays} days` : 'Custom';
    default: return 'Yearly';
  }
}

// Helper to get billing period days
function getBillingPeriodDays(period: SubscriptionApi.BillingPeriod, customDays?: number | null): number {
  switch (period) {
    case 'monthly': return 30;
    case 'quarterly': return 90;
    case 'yearly': return 365;
    case 'custom': return customDays || 365;
    default: return 365;
  }
}

/**
 * Map API SubscriptionPlan to Domain SubscriptionPlan
 */
function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapSubscriptionPlanApiToDomain(api: SubscriptionApi.SubscriptionPlan): SubscriptionPlan {
  const billingPeriod = api.billing_period || 'yearly';
  const licenseFeeAfn = toNum(api.license_fee_afn);
  const licenseFeeUsd = toNum(api.license_fee_usd);
  const maintenanceFeeAfn = toNum(api.maintenance_fee_afn ?? api.price_yearly_afn);
  const maintenanceFeeUsd = toNum(api.maintenance_fee_usd ?? api.price_yearly_usd);
  const totalFeeAfn = licenseFeeAfn + maintenanceFeeAfn;
  const totalFeeUsd = licenseFeeUsd + maintenanceFeeUsd;
  const landingOffer: LandingOffer | null = api.landing_offer
    ? {
        id: api.landing_offer.id,
        code: api.landing_offer.code,
        name: api.landing_offer.name,
        description: api.landing_offer.description,
        discountType: api.landing_offer.discount_type,
        discountValue: toNum(api.landing_offer.discount_value),
        maxDiscountAmount: api.landing_offer.max_discount_amount != null ? toNum(api.landing_offer.max_discount_amount) : null,
        currency: api.landing_offer.currency,
        validFrom: api.landing_offer.valid_from ? new Date(api.landing_offer.valid_from) : null,
        validUntil: api.landing_offer.valid_until ? new Date(api.landing_offer.valid_until) : null,
        metadata: api.landing_offer.metadata,
        discountAmountAfn: toNum(api.landing_offer.discount_amount_afn),
        discountAmountUsd: toNum(api.landing_offer.discount_amount_usd),
        discountedTotalFeeAfn: toNum(api.landing_offer.discounted_total_fee_afn),
        discountedTotalFeeUsd: toNum(api.landing_offer.discounted_total_fee_usd),
      }
    : null;
  
  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    description: api.description,
    // Legacy pricing (for backward compatibility)
    priceYearlyAfn: api.price_yearly_afn,
    priceYearlyUsd: api.price_yearly_usd,
    // New fee separation fields
    billingPeriod,
    billingPeriodLabel: getBillingPeriodLabel(billingPeriod, api.custom_billing_days),
    billingPeriodDays: getBillingPeriodDays(billingPeriod, api.custom_billing_days),
    customBillingDays: api.custom_billing_days,
    licenseFeeAfn,
    licenseFeeUsd,
    maintenanceFeeAfn,
    maintenanceFeeUsd,
    hasLicenseFee: licenseFeeAfn > 0 || licenseFeeUsd > 0,
    hasMaintenanceFee: maintenanceFeeAfn > 0 || maintenanceFeeUsd > 0,
    // Total fees (for display convenience; always numbers, never NaN)
    totalFeeAfn,
    totalFeeUsd,
    // Other plan fields
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
    landingOffer,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Map API OrganizationSubscription to Domain SubscriptionInfo
 */
export function mapOrganizationSubscriptionApiToDomain(api: SubscriptionApi.OrganizationSubscription): SubscriptionInfo {
  return {
    id: api.id,
    organizationId: api.organization_id,
    planId: api.plan_id,
    status: api.status,
    startedAt: api.started_at ? new Date(api.started_at) : null,
    expiresAt: api.expires_at ? new Date(api.expires_at) : null,
    trialEndsAt: api.trial_ends_at ? new Date(api.trial_ends_at) : null,
    gracePeriodEndsAt: api.grace_period_ends_at ? new Date(api.grace_period_ends_at) : null,
    readonlyPeriodEndsAt: api.readonly_period_ends_at ? new Date(api.readonly_period_ends_at) : null,
    cancelledAt: api.cancelled_at ? new Date(api.cancelled_at) : null,
    suspensionReason: api.suspension_reason,
    autoRenew: api.auto_renew,
    currency: api.currency,
    amountPaid: api.amount_paid,
    additionalSchools: api.additional_schools,
    notes: api.notes,
    // New fee separation fields
    billingPeriod: mapBillingPeriod(api.billing_period),
    nextMaintenanceDueDate: api.next_maintenance_due_at ? new Date(api.next_maintenance_due_at) : null,
    lastMaintenancePaidAt: api.last_maintenance_paid_at ? new Date(api.last_maintenance_paid_at) : null,
    licensePaidAt: api.license_paid_at ? new Date(api.license_paid_at) : null,
    licensePaymentId: api.license_payment_id,
    plan: api.plan ? mapSubscriptionPlanApiToDomain(api.plan) : undefined,
    organization: api.organization,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
  };
}

/**
 * Map API PaymentRecord to Domain PaymentRecord
 */
export function mapPaymentRecordApiToDomain(api: SubscriptionApi.PaymentRecord): PaymentRecord {
  return {
    id: api.id,
    organizationId: api.organization_id,
    subscriptionId: api.subscription_id,
    amount: api.amount,
    currency: api.currency,
    paymentMethod: api.payment_method,
    paymentReference: api.payment_reference,
    paymentDate: new Date(api.payment_date),
    periodStart: api.period_start ? new Date(api.period_start) : null,
    periodEnd: api.period_end ? new Date(api.period_end) : null,
    status: api.status,
    confirmedBy: api.confirmed_by,
    confirmedAt: api.confirmed_at ? new Date(api.confirmed_at) : null,
    discountAmount: api.discount_amount,
    notes: api.notes,
    // New fee separation fields
    paymentType: mapPaymentType(api.payment_type),
    billingPeriod: mapBillingPeriod(api.billing_period),
    isRecurring: api.is_recurring || false,
    invoiceNumber: api.invoice_number,
    createdAt: new Date(api.created_at),
  };
}

/**
 * Map API PriceCalculation to Domain PriceBreakdown
 */
export function mapPriceCalculationApiToDomain(api: SubscriptionApi.PriceCalculation): PriceBreakdown {
  return {
    planId: api.plan_id,
    planName: api.plan_name,
    currency: api.currency,
    basePrice: api.base_price,
    additionalSchools: api.additional_schools,
    schoolsPrice: api.schools_price,
    subtotal: api.subtotal,
    discountAmount: api.discount_amount,
    discountInfo: api.discount_info,
    total: api.total,
    // New fee separation fields
    licenseFee: api.license_fee || 0,
    maintenanceFee: api.maintenance_fee || api.base_price,
    billingPeriod: mapBillingPeriod(api.billing_period),
  };
}

/**
 * Map API MaintenanceFeeStatus to Domain MaintenanceFeeStatus
 */
export function mapMaintenanceFeeStatusApiToDomain(api: SubscriptionApi.MaintenanceFeeStatus): MaintenanceFeeStatus {
  return {
    hasSubscription: api.has_subscription,
    maintenanceRequired: api.maintenance_required,
    subscriptionId: api.subscription_id,
    billingPeriod: mapBillingPeriod(api.billing_period) || undefined,
    billingPeriodLabel: api.billing_period_label,
    nextDueDate: api.next_due_date ? new Date(api.next_due_date) : null,
    lastPaidDate: api.last_paid_date ? new Date(api.last_paid_date) : null,
    isOverdue: api.is_overdue,
    daysUntilDue: api.days_until_due,
    daysOverdue: api.days_overdue,
    amount: api.amount,
    currency: api.currency,
  };
}

/**
 * Map API MaintenanceInvoice to Domain MaintenanceInvoice
 */
export function mapMaintenanceInvoiceApiToDomain(api: SubscriptionApi.MaintenanceInvoice): MaintenanceInvoice {
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
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Map API LicenseFeeStatus to Domain LicenseFeeStatus
 */
export function mapLicenseFeeStatusApiToDomain(api: SubscriptionApi.LicenseFeeStatus): LicenseFeeStatus {
  return {
    hasSubscription: api.has_subscription,
    licenseRequired: api.license_required,
    subscriptionId: api.subscription_id,
    licensePaid: api.license_paid,
    licensePaidAt: api.license_paid_at ? new Date(api.license_paid_at) : null,
    licensePaymentId: api.license_payment_id,
    licensePending: api.license_pending,
    licenseAmount: api.license_amount,
    currency: api.currency,
  };
}

/**
 * Map Domain SubscriptionPlan to API CreatePlanDataWithFees
 */
export function mapSubscriptionPlanDomainToApiCreate(domain: Partial<SubscriptionPlan>): SubscriptionApi.CreatePlanDataWithFees {
  return {
    name: domain.name || '',
    slug: domain.slug || '',
    description: domain.description || undefined,
    price_yearly_afn: domain.priceYearlyAfn || 0,
    price_yearly_usd: domain.priceYearlyUsd || 0,
    billing_period: domain.billingPeriod || 'yearly',
    license_fee_afn: domain.licenseFeeAfn || 0,
    license_fee_usd: domain.licenseFeeUsd || 0,
    maintenance_fee_afn: domain.maintenanceFeeAfn || 0,
    maintenance_fee_usd: domain.maintenanceFeeUsd || 0,
    custom_billing_days: domain.customBillingDays || undefined,
    trial_days: domain.trialDays,
    grace_period_days: domain.gracePeriodDays,
    readonly_period_days: domain.readonlyPeriodDays,
    max_schools: domain.maxSchools,
    per_school_price_afn: domain.perSchoolPriceAfn,
    per_school_price_usd: domain.perSchoolPriceUsd,
    sort_order: domain.sortOrder,
  };
}

/**
 * Map maintenance payment submission to API format
 */
export function mapMaintenancePaymentToApi(
  data: {
    subscriptionId: string;
    invoiceId?: string;
    amount: number;
    currency: 'AFN' | 'USD';
    paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
    paymentReference?: string;
    paymentDate: Date;
    notes?: string;
  }
): SubscriptionApi.SubmitMaintenancePaymentData {
  return {
    subscription_id: data.subscriptionId,
    invoice_id: data.invoiceId,
    amount: data.amount,
    currency: data.currency,
    payment_method: data.paymentMethod,
    payment_reference: data.paymentReference,
    payment_date: data.paymentDate.toISOString().split('T')[0],
    notes: data.notes,
  };
}

/**
 * Map license payment submission to API format
 */
export function mapLicensePaymentToApi(
  data: {
    subscriptionId: string;
    amount: number;
    currency: 'AFN' | 'USD';
    paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
    paymentReference?: string;
    paymentDate: Date;
    notes?: string;
  }
): SubscriptionApi.SubmitLicensePaymentData {
  return {
    subscription_id: data.subscriptionId,
    amount: data.amount,
    currency: data.currency,
    payment_method: data.paymentMethod,
    payment_reference: data.paymentReference,
    payment_date: data.paymentDate.toISOString().split('T')[0],
    notes: data.notes,
  };
}
