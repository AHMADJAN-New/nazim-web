// Domain Types for SaaS Subscription System

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceYearlyAfn: number;
  priceYearlyUsd: number;
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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
  subscriptionsByStatus: Record<SubscriptionStatus, number>;
  subscriptionsByPlan: Record<string, number>;
  revenueThisYear: {
    afn: number;
    usd: number;
  };
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
