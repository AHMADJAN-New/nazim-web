// =====================================================
// FINANCIAL TRANSACTION TYPES
// =====================================================

// Base transaction interface
export interface FinancialTransactionBase {
  id: string;
  organization_id: string | null;
  school_id: string | null;
  transaction_number: string;
  transaction_date: string;
  fiscal_year_id: string | null;
  description: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// =====================================================
// INCOME TRANSACTIONS
// =====================================================
export interface IncomeTransaction extends FinancialTransactionBase {
  income_category_id: string;
  cost_center_id: string | null;
  
  // Payer info
  payer_name: string;
  payer_type: string | null;
  payer_id: string | null;
  payer_phone: string | null;
  payer_email: string | null;
  payer_address: string | null;
  
  // Amount
  amount: number;
  currency_id: string | null;
  tax_amount: number | null;
  discount_amount: number | null;
  net_amount: number;
  
  // Payment
  payment_method_id: string;
  payment_date: string | null;
  payment_reference: string | null;
  payment_status: 'pending' | 'completed' | 'partial' | 'failed' | 'cancelled' | 'refunded';
  
  // Fund
  fund_type_id: string | null;
  
  // Metadata
  receipt_number: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  parent_transaction_id: string | null;
  
  // Reconciliation
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  
  // Accounts
  debit_account_id: string | null;
  credit_account_id: string | null;
  
  // Approval
  approved_by: string | null;
  approved_at: string | null;
}

export type IncomeTransactionFormData = Omit<
  IncomeTransaction,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'approved_by' | 'approved_at' | 'reconciled_by' | 'reconciled_at'
>;

// =====================================================
// EXPENSE TRANSACTIONS
// =====================================================
export interface ExpenseTransaction extends FinancialTransactionBase {
  expense_category_id: string;
  cost_center_id: string | null;
  
  // Payee info
  payee_name: string;
  payee_type: string | null;
  payee_id: string | null;
  payee_phone: string | null;
  payee_email: string | null;
  payee_address: string | null;
  
  // Amount
  amount: number;
  currency_id: string | null;
  tax_amount: number | null;
  discount_amount: number | null;
  net_amount: number;
  
  // Payment
  payment_method_id: string;
  payment_date: string | null;
  payment_reference: string | null;
  payment_status: 'pending' | 'completed' | 'partial' | 'failed' | 'cancelled' | 'refunded';
  
  // Fund
  fund_type_id: string | null;
  
  // Metadata
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  parent_transaction_id: string | null;
  
  // Approval
  requires_approval: boolean;
  approval_status: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  approval_level: number | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  
  // Reconciliation
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  
  // Accounts
  debit_account_id: string | null;
  credit_account_id: string | null;
}

export type ExpenseTransactionFormData = Omit<
  ExpenseTransaction,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'approved_by' | 'approved_at' | 'reconciled_by' | 'reconciled_at'
>;

// =====================================================
// DEBT TRANSACTIONS
// =====================================================
export interface DebtTransaction extends FinancialTransactionBase {
  debt_category_id: string;
  debt_type: 'payable' | 'receivable';
  
  // Party info
  party_name: string;
  party_type: string | null;
  party_id: string | null;
  party_phone: string | null;
  party_email: string | null;
  party_address: string | null;
  
  // Amount
  principal_amount: number;
  interest_rate: number | null;
  interest_amount: number | null;
  total_amount: number;
  currency_id: string | null;
  
  // Terms
  start_date: string;
  due_date: string | null;
  payment_terms_days: number | null;
  installments_count: number | null;
  installment_amount: number | null;
  
  // Payment tracking
  paid_amount: number;
  remaining_amount: number;
  payment_status: 'outstanding' | 'partial' | 'paid' | 'overdue' | 'written_off';
  
  // Status
  status: 'active' | 'settled' | 'cancelled' | 'written_off';
  settlement_date: string | null;
  
  // Metadata
  reference_document: string | null;
  
  // Accounts
  debit_account_id: string | null;
  credit_account_id: string | null;
  
  // Approval
  approved_by: string | null;
  approved_at: string | null;
}

export type DebtTransactionFormData = Omit<
  DebtTransaction,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'approved_by' | 'approved_at' | 'paid_amount' | 'remaining_amount'
>;

// =====================================================
// DEBT PAYMENTS
// =====================================================
export interface DebtPayment {
  id: string;
  organization_id: string;
  school_id: string | null;
  debt_transaction_id: string;
  payment_number: string;
  payment_date: string;
  payment_amount: number;
  principal_paid: number;
  interest_paid: number | null;
  late_fee: number | null;
  payment_method_id: string;
  payment_reference: string | null;
  notes: string | null;
  is_reconciled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DebtPaymentFormData = Omit<
  DebtPayment,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'created_by'
>;

// =====================================================
// ASSET TRANSACTIONS
// =====================================================
export interface AssetTransaction extends FinancialTransactionBase {
  asset_category_id: string;
  asset_name: string;
  asset_code: string | null;
  
  // Transaction type
  transaction_type: 'purchase' | 'disposal' | 'depreciation' | 'revaluation' | 'transfer' | 'write_off' | 'maintenance';
  
  // Purchase details
  purchase_date: string | null;
  purchase_amount: number | null;
  vendor_name: string | null;
  vendor_id: string | null;
  
  // Depreciation
  depreciation_method: string | null;
  useful_life_years: number | null;
  salvage_value: number | null;
  current_book_value: number | null;
  accumulated_depreciation: number | null;
  
  // Disposal
  disposal_date: string | null;
  disposal_amount: number | null;
  disposal_method: string | null;
  
  // Location
  location: string | null;
  building_id: string | null;
  room_id: string | null;
  
  // Status
  asset_status: 'active' | 'in_use' | 'under_maintenance' | 'disposed' | 'written_off' | 'donated';
  condition_rating: string | null;
  
  // Metadata
  serial_number: string | null;
  warranty_expiry: string | null;
  
  // Accounts
  asset_account_id: string | null;
  depreciation_account_id: string | null;
}

export type AssetTransactionFormData = Omit<
  AssetTransaction,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'
>;

// =====================================================
// FUND TRANSACTIONS
// =====================================================
export interface FundTransaction extends FinancialTransactionBase {
  fund_type_id: string;
  transaction_type: 'donation' | 'transfer_in' | 'transfer_out' | 'allocation' | 'disbursement' | 'adjustment';
  
  // Donor info
  donor_name: string | null;
  donor_type: string | null;
  donor_id: string | null;
  donor_phone: string | null;
  donor_email: string | null;
  is_anonymous: boolean;
  
  // Amount
  amount: number;
  currency_id: string | null;
  
  // Islamic fund flags
  is_zakat: boolean;
  is_sadaqah: boolean;
  is_waqf: boolean;
  zakat_eligible_amount: number | null;
  
  // Transfer
  source_fund_id: string | null;
  destination_fund_id: string | null;
  
  // Payment
  payment_method_id: string | null;
  payment_reference: string | null;
  receipt_number: string | null;
  
  // Purpose
  purpose: string | null;
  restrictions: string | null;
  is_restricted: boolean;
  
  // Accounts
  debit_account_id: string | null;
  credit_account_id: string | null;
  
  // Reconciliation
  is_reconciled: boolean;
}

export type FundTransactionFormData = Omit<
  FundTransaction,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by'
>;

// =====================================================
// JOURNAL ENTRIES
// =====================================================
export interface JournalEntry extends FinancialTransactionBase {
  entry_number: string;
  entry_date: string;
  entry_type: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'compound' | 'manual';
  
  // Source
  source_type: string | null;
  source_id: string | null;
  
  // Status
  status: 'draft' | 'posted' | 'reversed' | 'voided';
  posted_at: string | null;
  posted_by: string | null;
  
  // Reversing
  is_reversing: boolean;
  reversed_entry_id: string | null;
  reversal_date: string | null;
  
  // Reference
  reference: string | null;
}

export type JournalEntryFormData = Omit<
  JournalEntry,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'posted_at' | 'posted_by' | 'transaction_number' | 'transaction_date'
>;

// =====================================================
// JOURNAL ENTRY LINES
// =====================================================
export interface JournalEntryLine {
  id: string;
  organization_id: string;
  journal_entry_id: string;
  line_number: number;
  account_id: string;
  debit_amount: number | null;
  credit_amount: number | null;
  cost_center_id: string | null;
  description: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export type JournalEntryLineFormData = Omit<
  JournalEntryLine,
  'id' | 'organization_id' | 'created_at' | 'updated_at'
>;

// =====================================================
// TRANSACTION ATTACHMENTS
// =====================================================
export interface TransactionAttachment {
  id: string;
  organization_id: string;
  school_id: string | null;
  transaction_type: 'income' | 'expense' | 'debt' | 'debt_payment' | 'asset' | 'fund' | 'journal';
  transaction_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_path: string;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionAttachmentFormData = Omit<
  TransactionAttachment,
  'id' | 'organization_id' | 'school_id' | 'created_at' | 'updated_at' | 'uploaded_by'
>;

// =====================================================
// QUERY FILTERS & PARAMS
// =====================================================
export interface TransactionFilters {
  start_date?: string;
  end_date?: string;
  fiscal_year_id?: string;
  category_id?: string;
  cost_center_id?: string;
  payment_status?: string;
  payment_method_id?: string;
  fund_type_id?: string;
  payer_id?: string;
  payee_id?: string;
  party_id?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// =====================================================
// REPORTING TYPES
// =====================================================
export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  cash_balance: number;
  bank_balance: number;
  outstanding_receivables: number;
  outstanding_payables: number;
}

export interface IncomeExpenseSummary {
  income_categories: Array<{
    category_id: string;
    category_name: string;
    amount: number;
    transaction_count: number;
  }>;
  expense_categories: Array<{
    category_id: string;
    category_name: string;
    amount: number;
    transaction_count: number;
  }>;
  period_start: string;
  period_end: string;
}

export interface DebtSummary {
  total_payables: number;
  total_receivables: number;
  overdue_payables: number;
  overdue_receivables: number;
  aged_payables: Array<{
    age_bucket: string;
    amount: number;
    count: number;
  }>;
  aged_receivables: Array<{
    age_bucket: string;
    amount: number;
    count: number;
  }>;
}

export interface FundBalance {
  fund_type_id: string;
  fund_name: string;
  opening_balance: number;
  donations: number;
  allocations: number;
  disbursements: number;
  closing_balance: number;
  is_zakat: boolean;
  is_sadaqah: boolean;
  is_waqf: boolean;
}

// =====================================================
// DASHBOARD TYPES
// =====================================================
export interface FinancialDashboardData {
  summary: FinancialSummary;
  recent_income: IncomeTransaction[];
  recent_expenses: ExpenseTransaction[];
  pending_approvals: ExpenseTransaction[];
  upcoming_payments: DebtTransaction[];
  monthly_trend: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}
