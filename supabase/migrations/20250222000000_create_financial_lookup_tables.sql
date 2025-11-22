-- ============================================================================
-- Financial Management System - Lookup Tables
-- ============================================================================
-- Comprehensive financial management for multi-tenant Islamic schools
-- Tracks income, expenses, assets, funds, donations, debts, and generates reports
-- All tables support organization-level and school-level scoping
-- ============================================================================

-- ============================================================================
-- Financial Currencies
-- ============================================================================
-- Support for multi-currency transactions (AFN, USD, EUR, etc.)
-- Global table (organization_id can be NULL for system-wide currencies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NULL,
    decimal_places SMALLINT NOT NULL DEFAULT 2,
    exchange_rate NUMERIC(15, 6) NOT NULL DEFAULT 1.0,
    is_base_currency BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code must be unique per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_currencies_code_org 
    ON public.financial_currencies (code, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_currencies_org_id 
    ON public.financial_currencies(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_currencies_is_active 
    ON public.financial_currencies(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_currencies_deleted_at 
    ON public.financial_currencies(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_currencies_updated_at
    BEFORE UPDATE ON public.financial_currencies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_currencies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_currencies IS 'Currency definitions for financial transactions with exchange rates. NULL organization_id = global/system currencies.';

-- ============================================================================
-- Financial Fiscal Years
-- ============================================================================
-- Academic/fiscal year periods for financial reporting and accounting
-- Each organization can define their own fiscal periods
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMPTZ NULL,
    closed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fiscal_year_date_range CHECK (end_date > start_date)
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_fiscal_years_code_org_school 
    ON public.financial_fiscal_years (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_fiscal_years_org_id 
    ON public.financial_fiscal_years(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_fiscal_years_school_id 
    ON public.financial_fiscal_years(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_fiscal_years_org_school 
    ON public.financial_fiscal_years(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_fiscal_years_is_current 
    ON public.financial_fiscal_years(is_current) 
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_fiscal_years_date_range 
    ON public.financial_fiscal_years(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_financial_fiscal_years_deleted_at 
    ON public.financial_fiscal_years(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_fiscal_years_updated_at
    BEFORE UPDATE ON public.financial_fiscal_years
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_fiscal_years ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_fiscal_years IS 'Fiscal/academic year periods for financial accounting and reporting. School-specific or organization-wide.';

-- ============================================================================
-- Financial Cost Centers
-- ============================================================================
-- Cost centers for tracking expenses by department, function, or project
-- Examples: Administration, Teaching, Maintenance, Transport, IT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    parent_id UUID NULL REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
    manager_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_cost_centers_code_org_school 
    ON public.financial_cost_centers (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_org_id 
    ON public.financial_cost_centers(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_school_id 
    ON public.financial_cost_centers(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_org_school 
    ON public.financial_cost_centers(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_parent_id 
    ON public.financial_cost_centers(parent_id);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_manager_id 
    ON public.financial_cost_centers(manager_id);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_is_active 
    ON public.financial_cost_centers(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_deleted_at 
    ON public.financial_cost_centers(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_cost_centers_updated_at
    BEFORE UPDATE ON public.financial_cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_cost_centers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_cost_centers IS 'Cost centers for expense tracking by department/function (Administration, Teaching, etc.).';

-- ============================================================================
-- Financial Income Categories
-- ============================================================================
-- Categories for all types of income/revenue
-- Examples: Tuition Fees, Registration, Transport, Cafeteria, Donations, Other
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_arabic VARCHAR(150) NULL,
    name_pashto VARCHAR(150) NULL,
    description TEXT NULL,
    parent_id UUID NULL REFERENCES public.financial_income_categories(id) ON DELETE SET NULL,
    is_student_fee BOOLEAN NOT NULL DEFAULT FALSE,
    is_taxable BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate NUMERIC(5, 2) NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_income_categories_code_org_school 
    ON public.financial_income_categories (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_income_categories_org_id 
    ON public.financial_income_categories(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_income_categories_school_id 
    ON public.financial_income_categories(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_income_categories_org_school 
    ON public.financial_income_categories(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_income_categories_parent_id 
    ON public.financial_income_categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_financial_income_categories_is_active 
    ON public.financial_income_categories(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_income_categories_deleted_at 
    ON public.financial_income_categories(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_income_categories_updated_at
    BEFORE UPDATE ON public.financial_income_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_income_categories ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_income_categories IS 'Income/revenue categories (Tuition, Registration, Transport, etc.) with multi-language support.';

-- ============================================================================
-- Financial Expense Categories
-- ============================================================================
-- Categories for all types of expenses/expenditures
-- Examples: Salaries, Utilities, Maintenance, Rent, Supplies, Transport
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_arabic VARCHAR(150) NULL,
    name_pashto VARCHAR(150) NULL,
    description TEXT NULL,
    parent_id UUID NULL REFERENCES public.financial_expense_categories(id) ON DELETE SET NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    approval_limit NUMERIC(15, 2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_expense_categories_code_org_school 
    ON public.financial_expense_categories (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_expense_categories_org_id 
    ON public.financial_expense_categories(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_expense_categories_school_id 
    ON public.financial_expense_categories(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_expense_categories_org_school 
    ON public.financial_expense_categories(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_expense_categories_parent_id 
    ON public.financial_expense_categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_financial_expense_categories_is_active 
    ON public.financial_expense_categories(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_expense_categories_deleted_at 
    ON public.financial_expense_categories(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_expense_categories_updated_at
    BEFORE UPDATE ON public.financial_expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_expense_categories ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_expense_categories IS 'Expense/expenditure categories (Salaries, Utilities, Maintenance, etc.) with approval workflows.';

-- ============================================================================
-- Financial Payment Methods
-- ============================================================================
-- Payment/receipt methods for all financial transactions
-- Examples: Cash, Bank Transfer, Mobile Money, Cheque, Credit Card, POS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_arabic VARCHAR(100) NULL,
    name_pashto VARCHAR(100) NULL,
    description TEXT NULL,
    is_cash BOOLEAN NOT NULL DEFAULT FALSE,
    is_bank_related BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
    bank_account_id UUID NULL,
    processing_fee_percentage NUMERIC(5, 2) NULL DEFAULT 0.00,
    processing_fee_fixed NUMERIC(15, 2) NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_payment_methods_code_org_school 
    ON public.financial_payment_methods (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_payment_methods_org_id 
    ON public.financial_payment_methods(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_payment_methods_school_id 
    ON public.financial_payment_methods(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_payment_methods_org_school 
    ON public.financial_payment_methods(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_payment_methods_is_cash 
    ON public.financial_payment_methods(is_cash) 
    WHERE is_cash = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_payment_methods_is_active 
    ON public.financial_payment_methods(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_payment_methods_deleted_at 
    ON public.financial_payment_methods(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_payment_methods_updated_at
    BEFORE UPDATE ON public.financial_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_payment_methods ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_payment_methods IS 'Payment/receipt methods (Cash, Bank Transfer, Mobile Money, etc.) with processing fees.';

-- ============================================================================
-- Financial Asset Categories
-- ============================================================================
-- Categories for fixed assets/property
-- Examples: Buildings, Furniture, Vehicles, IT Equipment, Books, Land
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_arabic VARCHAR(150) NULL,
    name_pashto VARCHAR(150) NULL,
    description TEXT NULL,
    parent_id UUID NULL REFERENCES public.financial_asset_categories(id) ON DELETE SET NULL,
    depreciation_method VARCHAR(50) NULL,
    default_useful_life_years INTEGER NULL,
    default_salvage_value_percentage NUMERIC(5, 2) NULL DEFAULT 0.00,
    is_depreciable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT valid_depreciation_method CHECK (
        depreciation_method IS NULL 
        OR depreciation_method IN ('straight_line', 'declining_balance', 'sum_of_years', 'units_of_production', 'none')
    )
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_asset_categories_code_org_school 
    ON public.financial_asset_categories (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_asset_categories_org_id 
    ON public.financial_asset_categories(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_asset_categories_school_id 
    ON public.financial_asset_categories(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_asset_categories_org_school 
    ON public.financial_asset_categories(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_asset_categories_parent_id 
    ON public.financial_asset_categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_financial_asset_categories_is_active 
    ON public.financial_asset_categories(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_asset_categories_deleted_at 
    ON public.financial_asset_categories(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_asset_categories_updated_at
    BEFORE UPDATE ON public.financial_asset_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_asset_categories ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_asset_categories IS 'Fixed asset categories (Buildings, Vehicles, Equipment) with depreciation settings.';

-- ============================================================================
-- Financial Fund Types
-- ============================================================================
-- Fund types for donations and special-purpose funds
-- Examples: Zakat, Sadaqah, Waqf, General Fund, Building Fund, Scholarship Fund
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_fund_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_arabic VARCHAR(150) NULL,
    name_pashto VARCHAR(150) NULL,
    description TEXT NULL,
    is_islamic_fund BOOLEAN NOT NULL DEFAULT FALSE,
    islamic_fund_type VARCHAR(50) NULL,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    restriction_description TEXT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT valid_islamic_fund_type CHECK (
        islamic_fund_type IS NULL 
        OR islamic_fund_type IN ('zakat', 'sadaqah', 'waqf', 'fidya', 'kaffarah', 'other')
    )
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_fund_types_code_org_school 
    ON public.financial_fund_types (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_fund_types_org_id 
    ON public.financial_fund_types(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_fund_types_school_id 
    ON public.financial_fund_types(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_fund_types_org_school 
    ON public.financial_fund_types(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_fund_types_is_islamic 
    ON public.financial_fund_types(is_islamic_fund) 
    WHERE is_islamic_fund = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_fund_types_is_active 
    ON public.financial_fund_types(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_fund_types_deleted_at 
    ON public.financial_fund_types(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_fund_types_updated_at
    BEFORE UPDATE ON public.financial_fund_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_fund_types ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_fund_types IS 'Fund types for donations (Zakat, Sadaqah, Waqf) and restricted funds with Islamic fund classifications.';

-- ============================================================================
-- Financial Debt Categories
-- ============================================================================
-- Categories for debts/liabilities tracking
-- Examples: Student Tuition Debt, Supplier Payables, Loans, Utilities Payable
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_debt_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_arabic VARCHAR(150) NULL,
    name_pashto VARCHAR(150) NULL,
    description TEXT NULL,
    is_student_debt BOOLEAN NOT NULL DEFAULT FALSE,
    is_supplier_debt BOOLEAN NOT NULL DEFAULT FALSE,
    default_payment_terms_days INTEGER NULL DEFAULT 30,
    requires_interest BOOLEAN NOT NULL DEFAULT FALSE,
    default_interest_rate NUMERIC(5, 2) NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_debt_categories_code_org_school 
    ON public.financial_debt_categories (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_debt_categories_org_id 
    ON public.financial_debt_categories(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_debt_categories_school_id 
    ON public.financial_debt_categories(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_debt_categories_org_school 
    ON public.financial_debt_categories(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_debt_categories_is_active 
    ON public.financial_debt_categories(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_debt_categories_deleted_at 
    ON public.financial_debt_categories(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_debt_categories_updated_at
    BEFORE UPDATE ON public.financial_debt_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_debt_categories ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_debt_categories IS 'Debt/liability categories (Student Debt, Payables, Loans) with payment terms.';

-- ============================================================================
-- Financial Accounts (Chart of Accounts)
-- ============================================================================
-- Simplified chart of accounts for double-entry bookkeeping
-- Account types: asset, liability, equity, income, expense
-- Hierarchical structure with parent accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_arabic VARCHAR(150) NULL,
    name_pashto VARCHAR(150) NULL,
    description TEXT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    normal_balance VARCHAR(10) NOT NULL,
    is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
    is_bank_account BOOLEAN NOT NULL DEFAULT FALSE,
    bank_name VARCHAR(150) NULL,
    bank_account_number VARCHAR(100) NULL,
    bank_branch VARCHAR(150) NULL,
    is_cash_account BOOLEAN NOT NULL DEFAULT FALSE,
    is_control_account BOOLEAN NOT NULL DEFAULT FALSE,
    allow_manual_entries BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT valid_account_type CHECK (
        account_type IN ('asset', 'liability', 'equity', 'income', 'expense')
    ),
    CONSTRAINT valid_normal_balance CHECK (
        normal_balance IN ('debit', 'credit')
    )
);

-- Unique constraint: code per organization and school
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_accounts_code_org_school 
    ON public.financial_accounts (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_accounts_org_id 
    ON public.financial_accounts(organization_id);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_school_id 
    ON public.financial_accounts(school_id);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_org_school 
    ON public.financial_accounts(organization_id, school_id);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_parent_id 
    ON public.financial_accounts(parent_account_id);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_account_type 
    ON public.financial_accounts(account_type);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_is_active 
    ON public.financial_accounts(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_financial_accounts_deleted_at 
    ON public.financial_accounts(deleted_at)
    WHERE deleted_at IS NULL;

CREATE TRIGGER update_financial_accounts_updated_at
    BEFORE UPDATE ON public.financial_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_accounts IS 'Chart of accounts for double-entry bookkeeping (Asset, Liability, Equity, Income, Expense).';

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- ============================================================================
-- RLS Policies: financial_currencies
-- ============================================================================

CREATE POLICY "Service role full access to financial_currencies" 
    ON public.financial_currencies FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read financial_currencies" 
    ON public.financial_currencies FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id IS NULL
            OR organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

CREATE POLICY "Users can insert financial_currencies" 
    ON public.financial_currencies FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR (
                public.get_current_user_organization_id() IS NULL
                AND public.get_current_user_role() = 'super_admin'
            )
        )
    );

CREATE POLICY "Users can update financial_currencies" 
    ON public.financial_currencies FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

CREATE POLICY "Users can delete financial_currencies" 
    ON public.financial_currencies FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
    );

-- ============================================================================
-- RLS Policies: financial_fiscal_years
-- ============================================================================

CREATE POLICY "Service role full access to fiscal_years" 
    ON public.financial_fiscal_years FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read fiscal_years" 
    ON public.financial_fiscal_years FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert fiscal_years" 
    ON public.financial_fiscal_years FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update fiscal_years" 
    ON public.financial_fiscal_years FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete fiscal_years" 
    ON public.financial_fiscal_years FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_cost_centers
-- ============================================================================

CREATE POLICY "Service role full access to cost_centers" 
    ON public.financial_cost_centers FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read cost_centers" 
    ON public.financial_cost_centers FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert cost_centers" 
    ON public.financial_cost_centers FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update cost_centers" 
    ON public.financial_cost_centers FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete cost_centers" 
    ON public.financial_cost_centers FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_income_categories
-- ============================================================================

CREATE POLICY "Service role full access to income_categories" 
    ON public.financial_income_categories FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read income_categories" 
    ON public.financial_income_categories FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert income_categories" 
    ON public.financial_income_categories FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update income_categories" 
    ON public.financial_income_categories FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete income_categories" 
    ON public.financial_income_categories FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_expense_categories
-- ============================================================================

CREATE POLICY "Service role full access to expense_categories" 
    ON public.financial_expense_categories FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read expense_categories" 
    ON public.financial_expense_categories FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert expense_categories" 
    ON public.financial_expense_categories FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update expense_categories" 
    ON public.financial_expense_categories FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete expense_categories" 
    ON public.financial_expense_categories FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_payment_methods
-- ============================================================================

CREATE POLICY "Service role full access to payment_methods" 
    ON public.financial_payment_methods FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read payment_methods" 
    ON public.financial_payment_methods FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert payment_methods" 
    ON public.financial_payment_methods FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update payment_methods" 
    ON public.financial_payment_methods FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete payment_methods" 
    ON public.financial_payment_methods FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_asset_categories
-- ============================================================================

CREATE POLICY "Service role full access to asset_categories" 
    ON public.financial_asset_categories FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read asset_categories" 
    ON public.financial_asset_categories FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert asset_categories" 
    ON public.financial_asset_categories FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update asset_categories" 
    ON public.financial_asset_categories FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete asset_categories" 
    ON public.financial_asset_categories FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_fund_types
-- ============================================================================

CREATE POLICY "Service role full access to fund_types" 
    ON public.financial_fund_types FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read fund_types" 
    ON public.financial_fund_types FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert fund_types" 
    ON public.financial_fund_types FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update fund_types" 
    ON public.financial_fund_types FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete fund_types" 
    ON public.financial_fund_types FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_debt_categories
-- ============================================================================

CREATE POLICY "Service role full access to debt_categories" 
    ON public.financial_debt_categories FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read debt_categories" 
    ON public.financial_debt_categories FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert debt_categories" 
    ON public.financial_debt_categories FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update debt_categories" 
    ON public.financial_debt_categories FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete debt_categories" 
    ON public.financial_debt_categories FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

-- ============================================================================
-- RLS Policies: financial_accounts
-- ============================================================================

CREATE POLICY "Service role full access to financial_accounts" 
    ON public.financial_accounts FOR ALL TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Users can read financial_accounts" 
    ON public.financial_accounts FOR SELECT TO authenticated 
    USING (
        deleted_at IS NULL
        AND (
            organization_id = public.get_current_user_organization_id()
            OR public.get_current_user_organization_id() IS NULL
        )
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can insert financial_accounts" 
    ON public.financial_accounts FOR INSERT TO authenticated 
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can update financial_accounts" 
    ON public.financial_accounts FOR UPDATE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );

CREATE POLICY "Users can delete financial_accounts" 
    ON public.financial_accounts FOR DELETE TO authenticated 
    USING (
        deleted_at IS NULL
        AND organization_id = public.get_current_user_organization_id()
        AND (
            school_id IS NULL
            OR public.get_current_user_school_ids() IS NULL
            OR (
                public.get_current_user_school_ids() IS NOT NULL
                AND school_id = ANY(public.get_current_user_school_ids())
            )
        )
    );
