-- =====================================================
-- FINANCIAL TRANSACTION PERMISSIONS
-- =====================================================
-- This migration adds permissions for all financial transaction operations
-- =====================================================

-- Income Transaction Permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('finance.income.read', 'finance.income', 'read', 'View income transactions', NULL),
    ('finance.income.create', 'finance.income', 'create', 'Create income transactions', NULL),
    ('finance.income.update', 'finance.income', 'update', 'Update income transactions', NULL),
    ('finance.income.delete', 'finance.income', 'delete', 'Delete income transactions', NULL),
    ('finance.income.approve', 'finance.income', 'approve', 'Approve income transactions', NULL),
    ('finance.income.reconcile', 'finance.income', 'reconcile', 'Reconcile income transactions', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Expense Transaction Permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('finance.expense.read', 'finance.expense', 'read', 'View expense transactions', NULL),
    ('finance.expense.create', 'finance.expense', 'create', 'Create expense transactions', NULL),
    ('finance.expense.update', 'finance.expense', 'update', 'Update expense transactions', NULL),
    ('finance.expense.delete', 'finance.expense', 'delete', 'Delete expense transactions', NULL),
    ('finance.expense.approve', 'finance.expense', 'approve', 'Approve expense transactions', NULL),
    ('finance.expense.reconcile', 'finance.expense', 'reconcile', 'Reconcile expense transactions', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Debt Transaction Permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('finance.debt.read', 'finance.debt', 'read', 'View debt transactions', NULL),
    ('finance.debt.create', 'finance.debt', 'create', 'Create debt transactions', NULL),
    ('finance.debt.update', 'finance.debt', 'update', 'Update debt transactions', NULL),
    ('finance.debt.delete', 'finance.debt', 'delete', 'Delete debt transactions', NULL),
    ('finance.debt.settle', 'finance.debt', 'settle', 'Settle debt transactions', NULL),
    ('finance.debt_payment.create', 'finance.debt_payment', 'create', 'Create debt payments', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Asset Transaction Permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('finance.asset.read', 'finance.asset', 'read', 'View asset transactions', NULL),
    ('finance.asset.create', 'finance.asset', 'create', 'Create asset transactions', NULL),
    ('finance.asset.update', 'finance.asset', 'update', 'Update asset transactions', NULL),
    ('finance.asset.delete', 'finance.asset', 'delete', 'Delete asset transactions', NULL),
    ('finance.asset.dispose', 'finance.asset', 'dispose', 'Dispose assets', NULL),
    ('finance.asset.depreciate', 'finance.asset', 'depreciate', 'Calculate depreciation', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Fund Transaction Permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('finance.fund.read', 'finance.fund', 'read', 'View fund transactions', NULL),
    ('finance.fund.create', 'finance.fund', 'create', 'Create fund transactions', NULL),
    ('finance.fund.update', 'finance.fund', 'update', 'Update fund transactions', NULL),
    ('finance.fund.delete', 'finance.fund', 'delete', 'Delete fund transactions', NULL),
    ('finance.fund.transfer', 'finance.fund', 'transfer', 'Transfer between funds', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Journal Entry Permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('finance.journal.read', 'finance.journal', 'read', 'View journal entries', NULL),
    ('finance.journal.create', 'finance.journal', 'create', 'Create journal entries', NULL),
    ('finance.journal.update', 'finance.journal', 'update', 'Update journal entries', NULL),
    ('finance.journal.delete', 'finance.journal', 'delete', 'Delete journal entries', NULL),
    ('finance.journal.post', 'finance.journal', 'post', 'Post journal entries', NULL),
    ('finance.journal.reverse', 'finance.journal', 'reverse', 'Reverse journal entries', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Reporting Permissions
INSERT INTO public.permissions (name, resource, action, description, organization_id) VALUES
    ('finance.reports.income_statement', 'finance.reports', 'read', 'View income statement', NULL),
    ('finance.reports.balance_sheet', 'finance.reports', 'read', 'View balance sheet', NULL),
    ('finance.reports.cash_flow', 'finance.reports', 'read', 'View cash flow statement', NULL),
    ('finance.reports.trial_balance', 'finance.reports', 'read', 'View trial balance', NULL),
    ('finance.reports.aged_receivables', 'finance.reports', 'read', 'View aged receivables', NULL),
    ('finance.reports.aged_payables', 'finance.reports', 'read', 'View aged payables', NULL),
    ('finance.reports.fund_balances', 'finance.reports', 'read', 'View fund balances', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- =====================================================
-- UPDATE assign_default_role_permissions FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Super Admin: All permissions (globally, not per organization)
    -- (Already handled in the existing function, no changes needed)
    
    -- Admin: Full finance access
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'admin', p.id, p_organization_id
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.resource LIKE 'finance.%'
      AND p.name NOT IN ('finance.journal.reverse') -- Admins cannot reverse journal entries
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    
    -- Accountant: Full finance access including journals
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'accountant', p.id, p_organization_id
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.resource LIKE 'finance.%'
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    
    -- Teacher: Read-only access to income, expense, and reports
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'teacher', p.id, p_organization_id
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND (
          p.name IN (
              'finance.income.read',
              'finance.expense.read',
              'finance.reports.income_statement',
              'finance.reports.balance_sheet'
          )
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    
    -- Staff: Limited finance access (income creation, expense viewing)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'staff', p.id, p_organization_id
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
          'finance.income.read',
          'finance.income.create',
          'finance.expense.read'
      )
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    
    -- Asset Manager: Full asset management
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'asset_manager', p.id, p_organization_id
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND (p.resource = 'finance.asset' OR p.resource LIKE 'finance.asset_%')
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    
    -- Parent: Read-only access to income (for their students)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'parent', p.id, p_organization_id
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name = 'finance.income.read'
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
    
    -- Student: Read-only access to their own income records
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'student', p.id, p_organization_id
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name = 'finance.income.read'
    ON CONFLICT (role, permission_id, organization_id) DO NOTHING;
END;
$$;

-- =====================================================
-- ASSIGN PERMISSIONS TO EXISTING ORGANIZATIONS
-- =====================================================
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM public.organizations LOOP
        PERFORM public.assign_default_role_permissions(org.id);
    END LOOP;
END $$;

-- =====================================================
-- END OF TRANSACTION PERMISSIONS MIGRATION
-- =====================================================
