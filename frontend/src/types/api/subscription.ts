// API Types for SaaS Subscription System

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_yearly_afn: number;
  price_yearly_usd: number;
  is_active: boolean;
  is_default: boolean;
  is_custom: boolean;
  trial_days: number;
  grace_period_days: number;
  readonly_period_days: number;
  max_schools: number;
  per_school_price_afn: number;
  per_school_price_usd: number;
  sort_order: number;
  features?: string[];
  limits?: Record<string, number>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  readonly_period_ends_at: string | null;
  cancelled_at: string | null;
  suspension_reason: string | null;
  auto_renew: boolean;
  currency: 'AFN' | 'USD';
  amount_paid: number;
  additional_schools: number;
  notes: string | null;
  plan?: SubscriptionPlan;
  organization?: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
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

export interface SubscriptionStatusResponse {
  status: SubscriptionStatus;
  access_level: AccessLevel;
  message: string;
  can_read: boolean;
  can_write: boolean;
  plan: {
    id: string;
    name: string;
    slug: string;
  } | null;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  readonly_period_ends_at: string | null;
  days_left: number | null;
  trial_days_left: number | null;
  is_trial: boolean;
  additional_schools: number;
  total_schools_allowed: number;
}

export interface UsageInfo {
  name: string;
  description: string;
  category: string;
  unit: string;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  warning: boolean;
  unlimited: boolean;
}

export interface UsageWarning {
  resource_key: string;
  name: string;
  current: number;
  limit: number;
  percentage: number;
  blocked: boolean;
}

export interface UsageResponse {
  usage: Record<string, UsageInfo>;
  warnings: UsageWarning[];
}

export interface FeatureStatus {
  feature_key: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  is_addon: boolean;
  can_purchase_addon: boolean;
  addon_price_afn: number;
  addon_price_usd: number;
}

export interface PriceCalculation {
  plan_id: string;
  plan_name: string;
  currency: 'AFN' | 'USD';
  base_price: number;
  additional_schools: number;
  schools_price: number;
  subtotal: number;
  discount_amount: number;
  discount_info: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
  } | null;
  total: number;
}

export interface DiscountCodeValidation {
  valid: boolean;
  message?: string;
  code?: string;
  name?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  max_discount_amount?: number | null;
}

export interface RenewalRequest {
  id: string;
  organization_id: string;
  subscription_id: string;
  requested_plan_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_by: string | null;
  processed_at: string | null;
  payment_record_id: string | null;
  discount_code_id: string | null;
  additional_schools: number;
  notes: string | null;
  rejection_reason: string | null;
  requested_plan?: SubscriptionPlan;
  payment_record?: PaymentRecord;
  organization?: {
    id: string;
    name: string;
  };
  subscription?: {
    id: string;
    plan?: SubscriptionPlan;
  };
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  amount: number;
  currency: 'AFN' | 'USD';
  payment_method: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
  payment_reference: string | null;
  payment_date: string;
  period_start: string | null;
  period_end: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmed_by: string | null;
  confirmed_at: string | null;
  discount_code_id: string | null;
  discount_amount: number;
  notes: string | null;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistory {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  action: string;
  from_plan_id: string | null;
  to_plan_id: string | null;
  from_status: string | null;
  to_status: string | null;
  performed_by: string | null;
  notes: string | null;
  from_plan?: SubscriptionPlan;
  to_plan?: SubscriptionPlan;
  created_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount: number | null;
  currency: 'AFN' | 'USD' | null;
  applicable_plan_id: string | null;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_org: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureDefinition {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  category: string;
  is_addon: boolean;
  addon_price_yearly_afn: number;
  addon_price_yearly_usd: number;
  sort_order: number;
  is_active: boolean;
}

export interface LimitDefinition {
  id: string;
  resource_key: string;
  name: string;
  description: string | null;
  unit: 'count' | 'gb' | 'mb';
  reset_period: 'never' | 'monthly' | 'yearly';
  category: string;
  sort_order: number;
  is_active: boolean;
}

// Admin Dashboard Types
export interface SubscriptionDashboard {
  total_organizations: number;
  total_schools: number;
  total_students: number;
  subscriptions_by_status: Record<SubscriptionStatus, number>;
  subscriptions_by_plan: Record<string, number>;
  revenue_this_year: Record<string, number>;
  pending_payments: number;
  pending_renewals: number;
  expiring_soon: number;
  recently_expired: number;
}

// Request Types
export interface CreateRenewalRequestData {
  plan_id: string;
  additional_schools?: number;
  discount_code?: string;
  notes?: string;
}

export interface SubmitPaymentData {
  renewal_request_id: string;
  amount: number;
  currency: 'AFN' | 'USD';
  payment_method: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
  payment_reference?: string;
  payment_date: string;
  notes?: string;
}

export interface CalculatePriceData {
  plan_id: string;
  additional_schools?: number;
  discount_code?: string;
  currency?: 'AFN' | 'USD';
}

export interface CreateDiscountCodeData {
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount?: number;
  currency?: 'AFN' | 'USD';
  applicable_plan_id?: string;
  max_uses?: number;
  max_uses_per_org?: number;
  valid_from?: string;
  valid_until?: string;
}

export interface CreatePlanData {
  name: string;
  slug: string;
  description?: string;
  price_yearly_afn: number;
  price_yearly_usd: number;
  trial_days?: number;
  grace_period_days?: number;
  readonly_period_days?: number;
  max_schools?: number;
  per_school_price_afn?: number;
  per_school_price_usd?: number;
  sort_order?: number;
  features?: Record<string, boolean>;
  limits?: Record<string, number>;
}

export interface ActivateSubscriptionData {
  plan_id: string;
  currency: 'AFN' | 'USD';
  amount_paid: number;
  additional_schools?: number;
  notes?: string;
}

export interface AddLimitOverrideData {
  resource_key: string;
  limit_value: number;
  reason: string;
  expires_at?: string;
}

export interface AddFeatureAddonData {
  feature_key: string;
  price_paid: number;
  currency: 'AFN' | 'USD';
}
