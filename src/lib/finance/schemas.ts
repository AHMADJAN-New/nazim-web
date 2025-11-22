import * as z from 'zod';

// =============================================================================
// Currency Schema
// =============================================================================
export const currencySchema = z.object({
  code: z.string().min(1, 'Code is required').max(10, 'Code must be 10 characters or less'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  symbol: z.string().max(10, 'Symbol must be 10 characters or less').nullable().optional(),
  decimal_places: z.number().int().min(0).max(4).default(2),
  exchange_rate: z.number().positive('Exchange rate must be positive').default(1.0),
  is_base_currency: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Fiscal Year Schema
// =============================================================================
export const fiscalYearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().max(500).nullable().optional(),
  is_current: z.boolean().default(false),
  is_closed: z.boolean().default(false),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});

// =============================================================================
// Cost Center Schema
// =============================================================================
export const costCenterSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(150),
  description: z.string().max(500).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Income Category Schema
// =============================================================================
export const incomeCategorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(150),
  name_arabic: z.string().max(150).nullable().optional(),
  name_pashto: z.string().max(150).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_student_fee: z.boolean().default(false),
  is_taxable: z.boolean().default(false),
  tax_rate: z.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Expense Category Schema
// =============================================================================
export const expenseCategorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(150),
  name_arabic: z.string().max(150).nullable().optional(),
  name_pashto: z.string().max(150).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_recurring: z.boolean().default(false),
  requires_approval: z.boolean().default(false),
  approval_limit: z.number().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Payment Method Schema
// =============================================================================
export const paymentMethodSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  name_arabic: z.string().max(100).nullable().optional(),
  name_pashto: z.string().max(100).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  is_cash: z.boolean().default(false),
  is_bank_related: z.boolean().default(false),
  is_online: z.boolean().default(false),
  requires_reference: z.boolean().default(false),
  bank_account_id: z.string().uuid().nullable().optional(),
  processing_fee_percentage: z.number().min(0).max(100).nullable().optional(),
  processing_fee_fixed: z.number().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Asset Category Schema
// =============================================================================
export const assetCategorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(150),
  name_arabic: z.string().max(150).nullable().optional(),
  name_pashto: z.string().max(150).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  depreciation_method: z.enum(['straight_line', 'declining_balance', 'sum_of_years', 'units_of_production', 'none']).nullable().optional(),
  default_useful_life_years: z.number().int().min(1).max(100).nullable().optional(),
  default_salvage_value_percentage: z.number().min(0).max(100).nullable().optional(),
  is_depreciable: z.boolean().default(true),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Fund Type Schema
// =============================================================================
export const fundTypeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(150),
  name_arabic: z.string().max(150).nullable().optional(),
  name_pashto: z.string().max(150).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  is_islamic_fund: z.boolean().default(false),
  islamic_fund_type: z.enum(['zakat', 'sadaqah', 'waqf', 'fidya', 'kaffarah', 'other']).nullable().optional(),
  is_restricted: z.boolean().default(false),
  restriction_description: z.string().max(500).nullable().optional(),
  requires_approval: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Debt Category Schema
// =============================================================================
export const debtCategorySchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(150),
  name_arabic: z.string().max(150).nullable().optional(),
  name_pashto: z.string().max(150).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  is_student_debt: z.boolean().default(false),
  is_supplier_debt: z.boolean().default(false),
  default_payment_terms_days: z.number().int().min(0).max(365).nullable().optional(),
  requires_interest: z.boolean().default(false),
  default_interest_rate: z.number().min(0).max(100).nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});

// =============================================================================
// Financial Account Schema
// =============================================================================
export const financialAccountSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(150),
  name_arabic: z.string().max(150).nullable().optional(),
  name_pashto: z.string().max(150).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  account_type: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  parent_account_id: z.string().uuid().nullable().optional(),
  normal_balance: z.enum(['debit', 'credit']),
  is_system_account: z.boolean().default(false),
  is_bank_account: z.boolean().default(false),
  bank_name: z.string().max(150).nullable().optional(),
  bank_account_number: z.string().max(100).nullable().optional(),
  bank_branch: z.string().max(150).nullable().optional(),
  is_cash_account: z.boolean().default(false),
  is_control_account: z.boolean().default(false),
  allow_manual_entries: z.boolean().default(true),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(100),
});
