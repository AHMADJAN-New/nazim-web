-- =====================================================
-- FINANCIAL TRANSACTION TABLES
-- =====================================================
-- This migration creates all core financial transaction tables
-- for comprehensive financial management including:
-- - Income/Revenue transactions
-- - Expense transactions
-- - Debt transactions (payables/receivables)
-- - Asset transactions (purchases, disposals, depreciation)
-- - Fund transactions (donations, transfers)
-- - Journal entries (double-entry bookkeeping)
-- - Bank/cash transactions
-- - Transaction attachments
-- =====================================================

-- =====================================================
-- 1. INCOME TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_income_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_number TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fiscal_year_id UUID NULL REFERENCES public.financial_fiscal_years(id) ON DELETE SET NULL,
    
    -- Income details
    income_category_id UUID NOT NULL REFERENCES public.financial_income_categories(id) ON DELETE RESTRICT,
    cost_center_id UUID NULL REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
    
    -- Payer information
    payer_name TEXT NOT NULL,
    payer_type TEXT NULL, -- student, parent, organization, other
    payer_id UUID NULL, -- foreign key to student, parent, etc (flexible)
    payer_phone TEXT NULL,
    payer_email TEXT NULL,
    payer_address TEXT NULL,
    
    -- Amount details
    amount DECIMAL(15,2) NOT NULL,
    currency_id UUID NULL REFERENCES public.financial_currencies(id) ON DELETE SET NULL,
    tax_amount DECIMAL(15,2) NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NULL DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL, -- amount + tax - discount
    
    -- Payment details
    payment_method_id UUID NOT NULL REFERENCES public.financial_payment_methods(id) ON DELETE RESTRICT,
    payment_date DATE NULL,
    payment_reference TEXT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
    
    -- Fund allocation
    fund_type_id UUID NULL REFERENCES public.financial_fund_types(id) ON DELETE SET NULL,
    
    -- Transaction metadata
    description TEXT NULL,
    notes TEXT NULL,
    receipt_number TEXT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_frequency TEXT NULL, -- monthly, quarterly, annually
    parent_transaction_id UUID NULL REFERENCES public.financial_income_transactions(id) ON DELETE SET NULL,
    
    -- Reconciliation
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_at TIMESTAMP WITH TIME ZONE NULL,
    reconciled_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Financial account (for double-entry)
    debit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    credit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Constraints
    CONSTRAINT check_net_amount CHECK (net_amount >= 0),
    CONSTRAINT check_amount CHECK (amount >= 0),
    CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'completed', 'partial', 'failed', 'cancelled', 'refunded'))
);

-- Indexes
CREATE INDEX idx_income_transactions_org_school ON public.financial_income_transactions(organization_id, school_id);
CREATE INDEX idx_income_transactions_date ON public.financial_income_transactions(transaction_date);
CREATE INDEX idx_income_transactions_category ON public.financial_income_transactions(income_category_id);
CREATE INDEX idx_income_transactions_payer ON public.financial_income_transactions(payer_id);
CREATE INDEX idx_income_transactions_status ON public.financial_income_transactions(payment_status);
CREATE INDEX idx_income_transactions_fiscal_year ON public.financial_income_transactions(fiscal_year_id);
CREATE UNIQUE INDEX idx_income_transactions_number ON public.financial_income_transactions(organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID), transaction_number);

-- Trigger
CREATE TRIGGER update_income_transactions_updated_at
    BEFORE UPDATE ON public.financial_income_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_income_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to income transactions"
    ON public.financial_income_transactions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org income transactions"
    ON public.financial_income_transactions FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert income transactions"
    ON public.financial_income_transactions FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update income transactions"
    ON public.financial_income_transactions FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete income transactions"
    ON public.financial_income_transactions FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 2. EXPENSE TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_expense_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_number TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fiscal_year_id UUID NULL REFERENCES public.financial_fiscal_years(id) ON DELETE SET NULL,
    
    -- Expense details
    expense_category_id UUID NOT NULL REFERENCES public.financial_expense_categories(id) ON DELETE RESTRICT,
    cost_center_id UUID NULL REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
    
    -- Vendor/Payee information
    payee_name TEXT NOT NULL,
    payee_type TEXT NULL, -- vendor, staff, contractor, other
    payee_id UUID NULL,
    payee_phone TEXT NULL,
    payee_email TEXT NULL,
    payee_address TEXT NULL,
    
    -- Amount details
    amount DECIMAL(15,2) NOT NULL,
    currency_id UUID NULL REFERENCES public.financial_currencies(id) ON DELETE SET NULL,
    tax_amount DECIMAL(15,2) NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NULL DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    
    -- Payment details
    payment_method_id UUID NOT NULL REFERENCES public.financial_payment_methods(id) ON DELETE RESTRICT,
    payment_date DATE NULL,
    payment_reference TEXT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    
    -- Fund source
    fund_type_id UUID NULL REFERENCES public.financial_fund_types(id) ON DELETE SET NULL,
    
    -- Transaction metadata
    description TEXT NULL,
    notes TEXT NULL,
    invoice_number TEXT NULL,
    invoice_date DATE NULL,
    due_date DATE NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_frequency TEXT NULL,
    parent_transaction_id UUID NULL REFERENCES public.financial_expense_transactions(id) ON DELETE SET NULL,
    
    -- Approval workflow
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status TEXT NULL DEFAULT 'pending', -- pending, approved, rejected
    approval_level INTEGER NULL DEFAULT 1,
    approved_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    rejection_reason TEXT NULL,
    
    -- Reconciliation
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_at TIMESTAMP WITH TIME ZONE NULL,
    reconciled_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Financial account (for double-entry)
    debit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    credit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT check_expense_net_amount CHECK (net_amount >= 0),
    CONSTRAINT check_expense_amount CHECK (amount >= 0),
    CONSTRAINT check_expense_payment_status CHECK (payment_status IN ('pending', 'completed', 'partial', 'failed', 'cancelled', 'refunded')),
    CONSTRAINT check_expense_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_expense_transactions_org_school ON public.financial_expense_transactions(organization_id, school_id);
CREATE INDEX idx_expense_transactions_date ON public.financial_expense_transactions(transaction_date);
CREATE INDEX idx_expense_transactions_category ON public.financial_expense_transactions(expense_category_id);
CREATE INDEX idx_expense_transactions_payee ON public.financial_expense_transactions(payee_id);
CREATE INDEX idx_expense_transactions_status ON public.financial_expense_transactions(payment_status);
CREATE INDEX idx_expense_transactions_approval ON public.financial_expense_transactions(approval_status);
CREATE INDEX idx_expense_transactions_fiscal_year ON public.financial_expense_transactions(fiscal_year_id);
CREATE UNIQUE INDEX idx_expense_transactions_number ON public.financial_expense_transactions(organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID), transaction_number);

-- Trigger
CREATE TRIGGER update_expense_transactions_updated_at
    BEFORE UPDATE ON public.financial_expense_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_expense_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to expense transactions"
    ON public.financial_expense_transactions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org expense transactions"
    ON public.financial_expense_transactions FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert expense transactions"
    ON public.financial_expense_transactions FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update expense transactions"
    ON public.financial_expense_transactions FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete expense transactions"
    ON public.financial_expense_transactions FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 3. DEBT TRANSACTIONS (Payables & Receivables)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_debt_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_number TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fiscal_year_id UUID NULL REFERENCES public.financial_fiscal_years(id) ON DELETE SET NULL,
    
    -- Debt details
    debt_category_id UUID NOT NULL REFERENCES public.financial_debt_categories(id) ON DELETE RESTRICT,
    debt_type TEXT NOT NULL, -- payable (we owe), receivable (they owe us)
    
    -- Party information
    party_name TEXT NOT NULL,
    party_type TEXT NULL,
    party_id UUID NULL,
    party_phone TEXT NULL,
    party_email TEXT NULL,
    party_address TEXT NULL,
    
    -- Amount details
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NULL DEFAULT 0,
    interest_amount DECIMAL(15,2) NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL, -- principal + interest
    currency_id UUID NULL REFERENCES public.financial_currencies(id) ON DELETE SET NULL,
    
    -- Terms
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NULL,
    payment_terms_days INTEGER NULL,
    installments_count INTEGER NULL DEFAULT 1,
    installment_amount DECIMAL(15,2) NULL,
    
    -- Payment tracking
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(15,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'outstanding', -- outstanding, partial, paid, overdue, written_off
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- active, settled, cancelled, written_off
    settlement_date DATE NULL,
    
    -- Transaction metadata
    description TEXT NULL,
    notes TEXT NULL,
    reference_document TEXT NULL,
    
    -- Financial account
    debit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    credit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT check_debt_type CHECK (debt_type IN ('payable', 'receivable')),
    CONSTRAINT check_debt_status CHECK (status IN ('active', 'settled', 'cancelled', 'written_off')),
    CONSTRAINT check_debt_payment_status CHECK (payment_status IN ('outstanding', 'partial', 'paid', 'overdue', 'written_off')),
    CONSTRAINT check_principal_amount CHECK (principal_amount >= 0),
    CONSTRAINT check_paid_amount CHECK (paid_amount >= 0),
    CONSTRAINT check_remaining_amount CHECK (remaining_amount >= 0)
);

-- Indexes
CREATE INDEX idx_debt_transactions_org_school ON public.financial_debt_transactions(organization_id, school_id);
CREATE INDEX idx_debt_transactions_date ON public.financial_debt_transactions(transaction_date);
CREATE INDEX idx_debt_transactions_type ON public.financial_debt_transactions(debt_type);
CREATE INDEX idx_debt_transactions_status ON public.financial_debt_transactions(status);
CREATE INDEX idx_debt_transactions_payment_status ON public.financial_debt_transactions(payment_status);
CREATE INDEX idx_debt_transactions_due_date ON public.financial_debt_transactions(due_date);
CREATE INDEX idx_debt_transactions_party ON public.financial_debt_transactions(party_id);
CREATE UNIQUE INDEX idx_debt_transactions_number ON public.financial_debt_transactions(organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID), transaction_number);

-- Trigger
CREATE TRIGGER update_debt_transactions_updated_at
    BEFORE UPDATE ON public.financial_debt_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_debt_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to debt transactions"
    ON public.financial_debt_transactions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org debt transactions"
    ON public.financial_debt_transactions FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert debt transactions"
    ON public.financial_debt_transactions FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update debt transactions"
    ON public.financial_debt_transactions FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete debt transactions"
    ON public.financial_debt_transactions FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 4. DEBT PAYMENTS (Track payments against debts)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Link to debt
    debt_transaction_id UUID NOT NULL REFERENCES public.financial_debt_transactions(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_number TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_amount DECIMAL(15,2) NOT NULL,
    principal_paid DECIMAL(15,2) NOT NULL,
    interest_paid DECIMAL(15,2) NULL DEFAULT 0,
    late_fee DECIMAL(15,2) NULL DEFAULT 0,
    
    -- Payment method
    payment_method_id UUID NOT NULL REFERENCES public.financial_payment_methods(id) ON DELETE RESTRICT,
    payment_reference TEXT NULL,
    
    -- Metadata
    notes TEXT NULL,
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT check_payment_amount CHECK (payment_amount >= 0),
    CONSTRAINT check_principal_paid CHECK (principal_paid >= 0)
);

-- Indexes
CREATE INDEX idx_debt_payments_org_school ON public.financial_debt_payments(organization_id, school_id);
CREATE INDEX idx_debt_payments_debt ON public.financial_debt_payments(debt_transaction_id);
CREATE INDEX idx_debt_payments_date ON public.financial_debt_payments(payment_date);
CREATE UNIQUE INDEX idx_debt_payments_number ON public.financial_debt_payments(organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID), payment_number);

-- Trigger
CREATE TRIGGER update_debt_payments_updated_at
    BEFORE UPDATE ON public.financial_debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (same patterns as parent debt transactions)
ALTER TABLE public.financial_debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to debt payments"
    ON public.financial_debt_payments FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org debt payments"
    ON public.financial_debt_payments FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert debt payments"
    ON public.financial_debt_payments FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update debt payments"
    ON public.financial_debt_payments FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete debt payments"
    ON public.financial_debt_payments FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 5. ASSET TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_asset_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_number TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fiscal_year_id UUID NULL REFERENCES public.financial_fiscal_years(id) ON DELETE SET NULL,
    
    -- Asset details
    asset_category_id UUID NOT NULL REFERENCES public.financial_asset_categories(id) ON DELETE RESTRICT,
    asset_name TEXT NOT NULL,
    asset_code TEXT NULL,
    
    -- Transaction type
    transaction_type TEXT NOT NULL, -- purchase, disposal, depreciation, revaluation, write_off
    
    -- Purchase details (for type=purchase)
    purchase_date DATE NULL,
    purchase_amount DECIMAL(15,2) NULL,
    vendor_name TEXT NULL,
    vendor_id UUID NULL,
    
    -- Depreciation details
    depreciation_method TEXT NULL, -- straight_line, declining_balance, etc
    useful_life_years INTEGER NULL,
    salvage_value DECIMAL(15,2) NULL,
    current_book_value DECIMAL(15,2) NULL,
    accumulated_depreciation DECIMAL(15,2) NULL DEFAULT 0,
    
    -- Disposal details (for type=disposal)
    disposal_date DATE NULL,
    disposal_amount DECIMAL(15,2) NULL,
    disposal_method TEXT NULL, -- sale, donation, scrap, write_off
    
    -- Location
    location TEXT NULL,
    building_id UUID NULL REFERENCES public.buildings(id) ON DELETE SET NULL,
    room_id UUID NULL REFERENCES public.rooms(id) ON DELETE SET NULL,
    
    -- Status
    asset_status TEXT NOT NULL DEFAULT 'active', -- active, in_use, under_maintenance, disposed, written_off
    condition_rating TEXT NULL, -- excellent, good, fair, poor
    
    -- Metadata
    description TEXT NULL,
    notes TEXT NULL,
    serial_number TEXT NULL,
    warranty_expiry DATE NULL,
    
    -- Financial account
    asset_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    depreciation_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    
    -- Audit
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT check_asset_transaction_type CHECK (transaction_type IN ('purchase', 'disposal', 'depreciation', 'revaluation', 'transfer', 'write_off', 'maintenance')),
    CONSTRAINT check_asset_status CHECK (asset_status IN ('active', 'in_use', 'under_maintenance', 'disposed', 'written_off', 'donated'))
);

-- Indexes
CREATE INDEX idx_asset_transactions_org_school ON public.financial_asset_transactions(organization_id, school_id);
CREATE INDEX idx_asset_transactions_date ON public.financial_asset_transactions(transaction_date);
CREATE INDEX idx_asset_transactions_category ON public.financial_asset_transactions(asset_category_id);
CREATE INDEX idx_asset_transactions_type ON public.financial_asset_transactions(transaction_type);
CREATE INDEX idx_asset_transactions_status ON public.financial_asset_transactions(asset_status);
CREATE UNIQUE INDEX idx_asset_transactions_number ON public.financial_asset_transactions(organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID), transaction_number);

-- Trigger
CREATE TRIGGER update_asset_transactions_updated_at
    BEFORE UPDATE ON public.financial_asset_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_asset_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to asset transactions"
    ON public.financial_asset_transactions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org asset transactions"
    ON public.financial_asset_transactions FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert asset transactions"
    ON public.financial_asset_transactions FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update asset transactions"
    ON public.financial_asset_transactions FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete asset transactions"
    ON public.financial_asset_transactions FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 6. FUND TRANSACTIONS (Donations, Transfers)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_number TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fiscal_year_id UUID NULL REFERENCES public.financial_fiscal_years(id) ON DELETE SET NULL,
    
    -- Fund details
    fund_type_id UUID NOT NULL REFERENCES public.financial_fund_types(id) ON DELETE RESTRICT,
    transaction_type TEXT NOT NULL, -- donation, transfer_in, transfer_out, allocation, disbursement
    
    -- Donor/Source information (for donations and transfers_in)
    donor_name TEXT NULL,
    donor_type TEXT NULL, -- individual, organization, government, anonymous
    donor_id UUID NULL,
    donor_phone TEXT NULL,
    donor_email TEXT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Amount details
    amount DECIMAL(15,2) NOT NULL,
    currency_id UUID NULL REFERENCES public.financial_currencies(id) ON DELETE SET NULL,
    
    -- For Islamic funds (Zakat, Sadaqah, Waqf)
    is_zakat BOOLEAN NOT NULL DEFAULT FALSE,
    is_sadaqah BOOLEAN NOT NULL DEFAULT FALSE,
    is_waqf BOOLEAN NOT NULL DEFAULT FALSE,
    zakat_eligible_amount DECIMAL(15,2) NULL,
    
    -- Transfer details (if transfer between funds)
    source_fund_id UUID NULL REFERENCES public.financial_fund_types(id) ON DELETE SET NULL,
    destination_fund_id UUID NULL REFERENCES public.financial_fund_types(id) ON DELETE SET NULL,
    
    -- Receipt/Payment
    payment_method_id UUID NULL REFERENCES public.financial_payment_methods(id) ON DELETE SET NULL,
    payment_reference TEXT NULL,
    receipt_number TEXT NULL,
    
    -- Purpose and restrictions
    purpose TEXT NULL,
    restrictions TEXT NULL,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    description TEXT NULL,
    notes TEXT NULL,
    
    -- Financial account
    debit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    credit_account_id UUID NULL REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    
    -- Reconciliation
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Audit
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT check_fund_transaction_type CHECK (transaction_type IN ('donation', 'transfer_in', 'transfer_out', 'allocation', 'disbursement', 'adjustment')),
    CONSTRAINT check_fund_amount CHECK (amount >= 0)
);

-- Indexes
CREATE INDEX idx_fund_transactions_org_school ON public.financial_fund_transactions(organization_id, school_id);
CREATE INDEX idx_fund_transactions_date ON public.financial_fund_transactions(transaction_date);
CREATE INDEX idx_fund_transactions_type ON public.financial_fund_transactions(transaction_type);
CREATE INDEX idx_fund_transactions_fund ON public.financial_fund_transactions(fund_type_id);
CREATE INDEX idx_fund_transactions_donor ON public.financial_fund_transactions(donor_id);
CREATE INDEX idx_fund_transactions_islamic ON public.financial_fund_transactions(is_zakat, is_sadaqah, is_waqf);
CREATE UNIQUE INDEX idx_fund_transactions_number ON public.financial_fund_transactions(organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID), transaction_number);

-- Trigger
CREATE TRIGGER update_fund_transactions_updated_at
    BEFORE UPDATE ON public.financial_fund_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_fund_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to fund transactions"
    ON public.financial_fund_transactions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org fund transactions"
    ON public.financial_fund_transactions FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert fund transactions"
    ON public.financial_fund_transactions FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update fund transactions"
    ON public.financial_fund_transactions FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete fund transactions"
    ON public.financial_fund_transactions FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 7. JOURNAL ENTRIES (Double-Entry Bookkeeping)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Entry details
    entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fiscal_year_id UUID NULL REFERENCES public.financial_fiscal_years(id) ON DELETE SET NULL,
    
    -- Entry type
    entry_type TEXT NOT NULL, -- standard, adjusting, closing, reversing, compound
    
    -- References to source transactions
    source_type TEXT NULL, -- income, expense, debt, asset, fund, manual
    source_id UUID NULL, -- ID of the source transaction
    
    -- Metadata
    description TEXT NOT NULL,
    notes TEXT NULL,
    reference TEXT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft', -- draft, posted, reversed
    posted_at TIMESTAMP WITH TIME ZONE NULL,
    posted_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Reversing entry
    is_reversing BOOLEAN NOT NULL DEFAULT FALSE,
    reversed_entry_id UUID NULL REFERENCES public.financial_journal_entries(id) ON DELETE SET NULL,
    reversal_date DATE NULL,
    
    -- Audit
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT check_journal_entry_type CHECK (entry_type IN ('standard', 'adjusting', 'closing', 'reversing', 'compound', 'manual')),
    CONSTRAINT check_journal_entry_status CHECK (status IN ('draft', 'posted', 'reversed', 'voided'))
);

-- Indexes
CREATE INDEX idx_journal_entries_org_school ON public.financial_journal_entries(organization_id, school_id);
CREATE INDEX idx_journal_entries_date ON public.financial_journal_entries(entry_date);
CREATE INDEX idx_journal_entries_type ON public.financial_journal_entries(entry_type);
CREATE INDEX idx_journal_entries_status ON public.financial_journal_entries(status);
CREATE INDEX idx_journal_entries_source ON public.financial_journal_entries(source_type, source_id);
CREATE UNIQUE INDEX idx_journal_entries_number ON public.financial_journal_entries(organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID), entry_number);

-- Trigger
CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON public.financial_journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to journal entries"
    ON public.financial_journal_entries FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org journal entries"
    ON public.financial_journal_entries FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert journal entries"
    ON public.financial_journal_entries FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update journal entries"
    ON public.financial_journal_entries FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete journal entries"
    ON public.financial_journal_entries FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 8. JOURNAL ENTRY LINES (Line items for each entry)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Link to journal entry
    journal_entry_id UUID NOT NULL REFERENCES public.financial_journal_entries(id) ON DELETE CASCADE,
    
    -- Line details
    line_number INTEGER NOT NULL DEFAULT 1,
    
    -- Account
    account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    
    -- Amount (debit or credit)
    debit_amount DECIMAL(15,2) NULL DEFAULT 0,
    credit_amount DECIMAL(15,2) NULL DEFAULT 0,
    
    -- Cost center (optional)
    cost_center_id UUID NULL REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
    
    -- Metadata
    description TEXT NULL,
    reference TEXT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT check_debit_credit_not_both CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    CONSTRAINT check_debit_amount CHECK (debit_amount >= 0),
    CONSTRAINT check_credit_amount CHECK (credit_amount >= 0)
);

-- Indexes
CREATE INDEX idx_journal_entry_lines_entry ON public.financial_journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON public.financial_journal_entry_lines(account_id);
CREATE INDEX idx_journal_entry_lines_cost_center ON public.financial_journal_entry_lines(cost_center_id);
CREATE UNIQUE INDEX idx_journal_entry_lines_line_number ON public.financial_journal_entry_lines(journal_entry_id, line_number);

-- Trigger
CREATE TRIGGER update_journal_entry_lines_updated_at
    BEFORE UPDATE ON public.financial_journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to journal entry lines"
    ON public.financial_journal_entry_lines FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org journal entry lines"
    ON public.financial_journal_entry_lines FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert journal entry lines"
    ON public.financial_journal_entry_lines FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update journal entry lines"
    ON public.financial_journal_entry_lines FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete journal entry lines"
    ON public.financial_journal_entry_lines FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- 9. TRANSACTION ATTACHMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    school_id UUID NULL REFERENCES public.school_branding(id) ON DELETE CASCADE,
    
    -- Link to transaction (polymorphic)
    transaction_type TEXT NOT NULL, -- income, expense, debt, asset, fund
    transaction_id UUID NOT NULL,
    
    -- File details
    file_name TEXT NOT NULL,
    file_type TEXT NULL, -- receipt, invoice, contract, image, pdf, etc
    file_size INTEGER NULL,
    file_path TEXT NOT NULL, -- Storage path
    mime_type TEXT NULL,
    
    -- Metadata
    description TEXT NULL,
    uploaded_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT check_transaction_type CHECK (transaction_type IN ('income', 'expense', 'debt', 'debt_payment', 'asset', 'fund', 'journal'))
);

-- Indexes
CREATE INDEX idx_transaction_attachments_org_school ON public.financial_transaction_attachments(organization_id, school_id);
CREATE INDEX idx_transaction_attachments_transaction ON public.financial_transaction_attachments(transaction_type, transaction_id);
CREATE INDEX idx_transaction_attachments_uploaded_by ON public.financial_transaction_attachments(uploaded_by);

-- Trigger
CREATE TRIGGER update_transaction_attachments_updated_at
    BEFORE UPDATE ON public.financial_transaction_attachments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.financial_transaction_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to transaction attachments"
    ON public.financial_transaction_attachments FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Users can read their org transaction attachments"
    ON public.financial_transaction_attachments FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can insert transaction attachments"
    ON public.financial_transaction_attachments FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can update transaction attachments"
    ON public.financial_transaction_attachments FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    )
    WITH CHECK (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

CREATE POLICY "Users can delete transaction attachments"
    ON public.financial_transaction_attachments FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_user_organization_id()
        AND (school_id IS NULL OR school_id = ANY(public.get_current_user_school_ids()))
        OR public.get_current_user_organization_id() IS NULL
    );

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to auto-generate transaction numbers
CREATE OR REPLACE FUNCTION public.generate_transaction_number(
    p_org_id UUID,
    p_school_id UUID,
    p_prefix TEXT,
    p_fiscal_year_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_year TEXT;
    v_sequence INTEGER;
    v_transaction_number TEXT;
BEGIN
    -- Get fiscal year code or use current year
    IF p_fiscal_year_id IS NOT NULL THEN
        SELECT code INTO v_year FROM public.financial_fiscal_years WHERE id = p_fiscal_year_id;
    ELSE
        v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    END IF;
    
    -- Get next sequence number (simplified - in production, use a sequence table)
    v_sequence := 1;
    
    -- Format: PREFIX-YEAR-0001
    v_transaction_number := p_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_transaction_number;
END;
$$;

-- Function to validate journal entry balance (debits = credits)
CREATE OR REPLACE FUNCTION public.validate_journal_entry_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_total_debits DECIMAL(15,2);
    v_total_credits DECIMAL(15,2);
BEGIN
    -- Calculate totals for this journal entry
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debits, v_total_credits
    FROM public.financial_journal_entry_lines
    WHERE journal_entry_id = NEW.id;
    
    -- Check if balanced
    IF v_total_debits != v_total_credits THEN
        RAISE EXCEPTION 'Journal entry not balanced: Debits (%) != Credits (%)', v_total_debits, v_total_credits;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to validate balance when posting journal entry
CREATE TRIGGER validate_journal_entry_balance_trigger
    BEFORE UPDATE OF status ON public.financial_journal_entries
    FOR EACH ROW
    WHEN (NEW.status = 'posted' AND OLD.status != 'posted')
    EXECUTE FUNCTION public.validate_journal_entry_balance();

-- Function to update debt remaining amount when payment is made
CREATE OR REPLACE FUNCTION public.update_debt_remaining_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_total_paid DECIMAL(15,2);
    v_total_amount DECIMAL(15,2);
    v_remaining DECIMAL(15,2);
    v_payment_status TEXT;
BEGIN
    -- Calculate total paid for this debt
    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_total_paid
    FROM public.financial_debt_payments
    WHERE debt_transaction_id = NEW.debt_transaction_id;
    
    -- Get total amount
    SELECT total_amount INTO v_total_amount
    FROM public.financial_debt_transactions
    WHERE id = NEW.debt_transaction_id;
    
    -- Calculate remaining
    v_remaining := v_total_amount - v_total_paid;
    
    -- Determine payment status
    IF v_remaining <= 0 THEN
        v_payment_status := 'paid';
        v_remaining := 0;
    ELSIF v_total_paid > 0 THEN
        v_payment_status := 'partial';
    ELSE
        v_payment_status := 'outstanding';
    END IF;
    
    -- Update debt transaction
    UPDATE public.financial_debt_transactions
    SET 
        paid_amount = v_total_paid,
        remaining_amount = v_remaining,
        payment_status = v_payment_status,
        status = CASE WHEN v_remaining <= 0 THEN 'settled' ELSE status END,
        settlement_date = CASE WHEN v_remaining <= 0 THEN CURRENT_DATE ELSE settlement_date END
    WHERE id = NEW.debt_transaction_id;
    
    RETURN NEW;
END;
$$;

-- Trigger to update debt when payment is made
CREATE TRIGGER update_debt_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON public.financial_debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_debt_remaining_amount();

-- =====================================================
-- END OF TRANSACTION TABLES MIGRATION
-- =====================================================
