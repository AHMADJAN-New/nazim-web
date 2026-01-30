// Domain Types for SaaS Subscription System

// Billing period types
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

// Payment types
export type PaymentType = 'license' | 'maintenance' | 'renewal';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  // Legacy pricing (for backward compatibility)
  priceYearlyAfn: number;
  priceYearlyUsd: number;
  // New fee separation fields
  billingPeriod: BillingPeriod;
  billingPeriodLabel: string;
  billingPeriodDays: number;
  customBillingDays: number | null;
  licenseFeeAfn: number;
  licenseFeeUsd: number;
  maintenanceFeeAfn: number;
  maintenanceFeeUsd: number;
  hasLicenseFee: boolean;
  hasMaintenanceFee: boolean;
  // Total fees (for display convenience)
  totalFeeAfn: number;
  totalFeeUsd: number;
  // Other plan fields
  isActive: boolean;
  isDefault: boolean;
  isCustom: boolean;
  trialDays: number;
  gracePeriodDays: number;
  readonlyPeriodDays: number;
  maxSchools: number;
  perSchoolPriceAfn: number;
  perSchoolPriceUsd: number;
  sortOrder: number;
  features: string[];
  limits: Record<string, number>;
  landingOffer?: LandingOffer | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface LandingOffer {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount: number | null;
  currency: 'AFN' | 'USD' | null;
  validFrom: Date | null;
  validUntil: Date | null;
  metadata?: Record<string, unknown> | null;
  discountAmountAfn: number;
  discountAmountUsd: number;
  discountedTotalFeeAfn: number;
  discountedTotalFeeUsd: number;
}

export type SubscriptionStatus = 
  | 'trial'
  | 'active'
  | 'pending_renewal'
  | 'grace_period'
  | 'readonly'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export type AccessLevel = 'none' | 'blocked' | 'readonly' | 'grace' | 'full';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  accessLevel: AccessLevel;
  message: string;
  canRead: boolean;
  canWrite: boolean;
  plan: {
    id: string;
    name: string;
    slug: string;
  } | null;
  startedAt: Date | null;
  expiresAt: Date | null;
  trialEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
  readonlyPeriodEndsAt: Date | null;
  daysLeft: number | null;
  trialDaysLeft: number | null;
  isTrial: boolean;
  additionalSchools: number;
  totalSchoolsAllowed: number;
  // New fee tracking fields
  billingPeriod: BillingPeriod | null;
  licensePaidAt: Date | null;
  licensePaymentId: string | null;
  hasLicensePaid: boolean;
  nextMaintenanceDueAt: Date | null;
  lastMaintenancePaidAt: Date | null;
  isMaintenanceOverdue: boolean;
  daysUntilMaintenanceDue: number | null;
}

export interface UsageInfo {
  resourceKey: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isWarning: boolean;
  isUnlimited: boolean;
}

export interface UsageWarning {
  resourceKey: string;
  name: string;
  current: number;
  limit: number;
  percentage: number;
  isBlocked: boolean;
}

export interface FeatureInfo {
  featureKey: string;
  name: string;
  description: string | null;
  category: string;
  isEnabled: boolean;
  isAccessible: boolean;
  accessLevel: 'none' | 'readonly' | 'full';
  missingDependencies: string[];
  requiredPlan: { slug: string; name: string } | null;
  parentFeature: string | null;
  isAddon: boolean;
  canPurchaseAddon: boolean;
  addonPriceAfn: number;
  addonPriceUsd: number;
}

export interface PriceBreakdown {
  planId: string;
  planName: string;
  currency: 'AFN' | 'USD';
  basePrice: number;
  additionalSchools: number;
  schoolsPrice: number;
  subtotal: number;
  discountAmount: number;
  discountInfo: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
  } | null;
  total: number;
  // New fee separation fields
  licenseFee: number;
  maintenanceFee: number;
  billingPeriod: BillingPeriod | null;
}

export interface RenewalRequest {
  id: string;
  organizationId: string;
  subscriptionId: string;
  requestedPlanId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  processedBy: string | null;
  processedAt: Date | null;
  paymentRecordId: string | null;
  discountCodeId: string | null;
  additionalSchools: number;
  notes: string | null;
  rejectionReason: string | null;
  requestedPlan?: SubscriptionPlan;
  createdAt: Date;
}

export interface PaymentRecord {
  id: string;
  organizationId: string;
  subscriptionId: string | null;
  amount: number;
  currency: 'AFN' | 'USD';
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
  paymentReference: string | null;
  paymentDate: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedBy: string | null;
  confirmedAt: Date | null;
  discountAmount: number;
  notes: string | null;
  // New fee separation fields
  paymentType: PaymentType | null;
  billingPeriod: BillingPeriod | null;
  isRecurring: boolean;
  invoiceNumber: string | null;
  createdAt: Date;
}

export interface SubscriptionHistoryEntry {
  id: string;
  organizationId: string;
  subscriptionId: string | null;
  action: string;
  fromPlanId: string | null;
  toPlanId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  performedBy: string | null;
  notes: string | null;
  fromPlanName?: string;
  toPlanName?: string;
  createdAt: Date;
}

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount: number | null;
  currency: 'AFN' | 'USD' | null;
  applicablePlanId: string | null;
  maxUses: number | null;
  currentUses: number;
  maxUsesPerOrg: number;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  isValid: boolean;
}

// Dashboard types
export interface SubscriptionDashboardStats {
  totalOrganizations: number;
  totalSchools: number;
  totalStudents: number;
  subscriptionsByStatus: Record<SubscriptionStatus, number>;
  subscriptionsByPlan: Record<string, number>;
  revenueThisYear: {
    afn: number;
    usd: number;
  };
  revenueByType?: Record<PaymentType, {
    afn: number;
    usd: number;
  }>;
  pendingPayments: number;
  pendingRenewals: number;
  expiringSoon: number;
  recentlyExpired: number;
}

// Usage check result
export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  warning: boolean;
  message: string | null;
}

// Maintenance Invoice
export interface MaintenanceInvoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: 'AFN' | 'USD';
  billingPeriod: BillingPeriod;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  generatedAt: Date;
  sentAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  paymentRecordId: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  organization?: {
    id: string;
    name: string;
  };
  subscription?: SubscriptionInfo;
  paymentRecord?: PaymentRecord;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Maintenance Fee Status
export interface MaintenanceFeeStatus {
  hasSubscription: boolean;
  maintenanceRequired: boolean;
  subscriptionId?: string;
  billingPeriod?: BillingPeriod;
  billingPeriodLabel?: string;
  nextDueDate?: Date | null;
  lastPaidDate?: Date | null;
  isOverdue?: boolean;
  daysUntilDue?: number | null;
  daysOverdue?: number;
  amount?: number;
  currency?: 'AFN' | 'USD';
}

// License Fee Status
export interface LicenseFeeStatus {
  hasSubscription: boolean;
  licenseRequired: boolean;
  subscriptionId?: string;
  licensePaid?: boolean;
  licensePaidAt?: Date | null;
  licensePaymentId?: string | null;
  licensePending?: boolean;
  licenseAmount?: number;
  currency?: 'AFN' | 'USD';
}
