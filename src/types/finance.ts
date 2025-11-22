// Financial Management Types
// All financial lookup tables for multi-tenant Islamic school management

/**
 * Base type for all financial lookup tables with common fields
 */
export interface FinancialLookupBase {
  id: string;
  organization_id: string;
  school_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * Currency definition with exchange rates
 */
export interface Currency extends FinancialLookupBase {
  code: string;
  name: string;
  symbol: string | null;
  decimal_places: number;
  exchange_rate: number;
  is_base_currency: boolean;
  is_active: boolean;
  sort_order: number;
}

/**
 * Fiscal/Academic year periods
 */
export interface FiscalYear extends FinancialLookupBase {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  description: string | null;
  is_current: boolean;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
}

/**
 * Cost centers for expense tracking by department/function
 */
export interface CostCenter extends FinancialLookupBase {
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Income/revenue categories
 */
export interface IncomeCategory extends FinancialLookupBase {
  code: string;
  name: string;
  name_arabic: string | null;
  name_pashto: string | null;
  description: string | null;
  parent_id: string | null;
  is_student_fee: boolean;
  is_taxable: boolean;
  tax_rate: number | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Expense/expenditure categories
 */
export interface ExpenseCategory extends FinancialLookupBase {
  code: string;
  name: string;
  name_arabic: string | null;
  name_pashto: string | null;
  description: string | null;
  parent_id: string | null;
  is_recurring: boolean;
  requires_approval: boolean;
  approval_limit: number | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Payment/receipt methods
 */
export interface PaymentMethod extends FinancialLookupBase {
  code: string;
  name: string;
  name_arabic: string | null;
  name_pashto: string | null;
  description: string | null;
  is_cash: boolean;
  is_bank_related: boolean;
  is_online: boolean;
  requires_reference: boolean;
  bank_account_id: string | null;
  processing_fee_percentage: number | null;
  processing_fee_fixed: number | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Fixed asset categories with depreciation settings
 */
export interface AssetCategory extends FinancialLookupBase {
  code: string;
  name: string;
  name_arabic: string | null;
  name_pashto: string | null;
  description: string | null;
  parent_id: string | null;
  depreciation_method: string | null;
  default_useful_life_years: number | null;
  default_salvage_value_percentage: number | null;
  is_depreciable: boolean;
  is_active: boolean;
  sort_order: number;
}

/**
 * Fund types for donations (Zakat, Sadaqah, Waqf, etc.)
 */
export interface FundType extends FinancialLookupBase {
  code: string;
  name: string;
  name_arabic: string | null;
  name_pashto: string | null;
  description: string | null;
  is_islamic_fund: boolean;
  islamic_fund_type: string | null;
  is_restricted: boolean;
  restriction_description: string | null;
  requires_approval: boolean;
  is_active: boolean;
  sort_order: number;
}

/**
 * Debt/liability categories
 */
export interface DebtCategory extends FinancialLookupBase {
  code: string;
  name: string;
  name_arabic: string | null;
  name_pashto: string | null;
  description: string | null;
  is_student_debt: boolean;
  is_supplier_debt: boolean;
  default_payment_terms_days: number | null;
  requires_interest: boolean;
  default_interest_rate: number | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Chart of accounts for double-entry bookkeeping
 */
export interface FinancialAccount extends FinancialLookupBase {
  code: string;
  name: string;
  name_arabic: string | null;
  name_pashto: string | null;
  description: string | null;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parent_account_id: string | null;
  normal_balance: 'debit' | 'credit';
  is_system_account: boolean;
  is_bank_account: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  is_cash_account: boolean;
  is_control_account: boolean;
  allow_manual_entries: boolean;
  is_active: boolean;
  sort_order: number;
}

// Form data types (for create/update operations)
export type CurrencyFormData = Omit<Currency, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type FiscalYearFormData = Omit<FiscalYear, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'closed_at' | 'closed_by'>;
export type CostCenterFormData = Omit<CostCenter, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type IncomeCategoryFormData = Omit<IncomeCategory, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type ExpenseCategoryFormData = Omit<ExpenseCategory, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type PaymentMethodFormData = Omit<PaymentMethod, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type AssetCategoryFormData = Omit<AssetCategory, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type FundTypeFormData = Omit<FundType, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type DebtCategoryFormData = Omit<DebtCategory, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type FinancialAccountFormData = Omit<FinancialAccount, 'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at'>;
