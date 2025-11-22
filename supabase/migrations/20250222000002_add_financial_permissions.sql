-- ============================================================================
-- Financial Management Permissions
-- ============================================================================
-- Comprehensive permissions for financial management system
-- Includes income, expenses, assets, funds, debts, and reporting
-- ============================================================================

-- ============================================================================
-- Insert Financial Permissions (Global - organization_id NULL)
-- ============================================================================

INSERT INTO public.permissions (name, resource, action, description, organization_id)
VALUES
    -- Financial Overview & Dashboard
    ('finance.dashboard.read', 'finance', 'read', 'View financial dashboard and overview', NULL),
    ('finance.reports.read', 'finance', 'read', 'View financial reports', NULL),
    ('finance.reports.export', 'finance', 'export', 'Export financial reports', NULL),
    ('finance.analytics.read', 'finance', 'read', 'View financial analytics and insights', NULL),
    
    -- Income Categories Management
    ('finance.income_categories.read', 'finance', 'read', 'View income categories', NULL),
    ('finance.income_categories.create', 'finance', 'create', 'Create income categories', NULL),
    ('finance.income_categories.update', 'finance', 'update', 'Update income categories', NULL),
    ('finance.income_categories.delete', 'finance', 'delete', 'Delete income categories', NULL),
    
    -- Income Transactions (for future transactions table)
    ('finance.income.read', 'finance', 'read', 'View income transactions', NULL),
    ('finance.income.create', 'finance', 'create', 'Record income transactions', NULL),
    ('finance.income.update', 'finance', 'update', 'Update income transactions', NULL),
    ('finance.income.delete', 'finance', 'delete', 'Delete income transactions', NULL),
    ('finance.income.approve', 'finance', 'approve', 'Approve income transactions', NULL),
    
    -- Expense Categories Management
    ('finance.expense_categories.read', 'finance', 'read', 'View expense categories', NULL),
    ('finance.expense_categories.create', 'finance', 'create', 'Create expense categories', NULL),
    ('finance.expense_categories.update', 'finance', 'update', 'Update expense categories', NULL),
    ('finance.expense_categories.delete', 'finance', 'delete', 'Delete expense categories', NULL),
    
    -- Expense Transactions (for future transactions table)
    ('finance.expenses.read', 'finance', 'read', 'View expense transactions', NULL),
    ('finance.expenses.create', 'finance', 'create', 'Record expense transactions', NULL),
    ('finance.expenses.update', 'finance', 'update', 'Update expense transactions', NULL),
    ('finance.expenses.delete', 'finance', 'delete', 'Delete expense transactions', NULL),
    ('finance.expenses.approve', 'finance', 'approve', 'Approve expense transactions', NULL),
    
    -- Payment Methods Management
    ('finance.payment_methods.read', 'finance', 'read', 'View payment methods', NULL),
    ('finance.payment_methods.create', 'finance', 'create', 'Create payment methods', NULL),
    ('finance.payment_methods.update', 'finance', 'update', 'Update payment methods', NULL),
    ('finance.payment_methods.delete', 'finance', 'delete', 'Delete payment methods', NULL),
    
    -- Asset Categories Management
    ('finance.asset_categories.read', 'finance', 'read', 'View asset categories', NULL),
    ('finance.asset_categories.create', 'finance', 'create', 'Create asset categories', NULL),
    ('finance.asset_categories.update', 'finance', 'update', 'Update asset categories', NULL),
    ('finance.asset_categories.delete', 'finance', 'delete', 'Delete asset categories', NULL),
    
    -- Fixed Assets Management (for future assets table)
    ('finance.assets.read', 'finance', 'read', 'View fixed assets', NULL),
    ('finance.assets.create', 'finance', 'create', 'Register fixed assets', NULL),
    ('finance.assets.update', 'finance', 'update', 'Update fixed assets', NULL),
    ('finance.assets.delete', 'finance', 'delete', 'Delete fixed assets', NULL),
    ('finance.assets.depreciate', 'finance', 'update', 'Calculate asset depreciation', NULL),
    
    -- Fund Types Management
    ('finance.fund_types.read', 'finance', 'read', 'View fund types', NULL),
    ('finance.fund_types.create', 'finance', 'create', 'Create fund types', NULL),
    ('finance.fund_types.update', 'finance', 'update', 'Update fund types', NULL),
    ('finance.fund_types.delete', 'finance', 'delete', 'Delete fund types', NULL),
    
    -- Fund Management (Donations, Zakat, etc.)
    ('finance.funds.read', 'finance', 'read', 'View fund balances and transactions', NULL),
    ('finance.funds.create', 'finance', 'create', 'Record fund contributions', NULL),
    ('finance.funds.update', 'finance', 'update', 'Update fund records', NULL),
    ('finance.funds.delete', 'finance', 'delete', 'Delete fund records', NULL),
    ('finance.funds.distribute', 'finance', 'update', 'Distribute fund amounts (Zakat, etc.)', NULL),
    
    -- Debt Categories Management
    ('finance.debt_categories.read', 'finance', 'read', 'View debt categories', NULL),
    ('finance.debt_categories.create', 'finance', 'create', 'Create debt categories', NULL),
    ('finance.debt_categories.update', 'finance', 'update', 'Update debt categories', NULL),
    ('finance.debt_categories.delete', 'finance', 'delete', 'Delete debt categories', NULL),
    
    -- Debt Management (Receivables & Payables)
    ('finance.debts.read', 'finance', 'read', 'View debt records', NULL),
    ('finance.debts.create', 'finance', 'create', 'Record debt entries', NULL),
    ('finance.debts.update', 'finance', 'update', 'Update debt records', NULL),
    ('finance.debts.delete', 'finance', 'delete', 'Delete debt records', NULL),
    ('finance.debts.settle', 'finance', 'update', 'Settle/pay debt obligations', NULL),
    
    -- Fiscal Years Management
    ('finance.fiscal_years.read', 'finance', 'read', 'View fiscal years', NULL),
    ('finance.fiscal_years.create', 'finance', 'create', 'Create fiscal years', NULL),
    ('finance.fiscal_years.update', 'finance', 'update', 'Update fiscal years', NULL),
    ('finance.fiscal_years.delete', 'finance', 'delete', 'Delete fiscal years', NULL),
    ('finance.fiscal_years.close', 'finance', 'update', 'Close fiscal year periods', NULL),
    
    -- Cost Centers Management
    ('finance.cost_centers.read', 'finance', 'read', 'View cost centers', NULL),
    ('finance.cost_centers.create', 'finance', 'create', 'Create cost centers', NULL),
    ('finance.cost_centers.update', 'finance', 'update', 'Update cost centers', NULL),
    ('finance.cost_centers.delete', 'finance', 'delete', 'Delete cost centers', NULL),
    
    -- Chart of Accounts Management
    ('finance.accounts.read', 'finance', 'read', 'View chart of accounts', NULL),
    ('finance.accounts.create', 'finance', 'create', 'Create financial accounts', NULL),
    ('finance.accounts.update', 'finance', 'update', 'Update financial accounts', NULL),
    ('finance.accounts.delete', 'finance', 'delete', 'Delete financial accounts', NULL),
    
    -- Journal Entries & Ledger (for future double-entry system)
    ('finance.journal.read', 'finance', 'read', 'View journal entries', NULL),
    ('finance.journal.create', 'finance', 'create', 'Create journal entries', NULL),
    ('finance.journal.update', 'finance', 'update', 'Update journal entries', NULL),
    ('finance.journal.delete', 'finance', 'delete', 'Delete journal entries', NULL),
    ('finance.journal.post', 'finance', 'update', 'Post journal entries to ledger', NULL),
    
    -- Currency Management
    ('finance.currencies.read', 'finance', 'read', 'View currencies', NULL),
    ('finance.currencies.create', 'finance', 'create', 'Create currencies', NULL),
    ('finance.currencies.update', 'finance', 'update', 'Update currencies and exchange rates', NULL),
    ('finance.currencies.delete', 'finance', 'delete', 'Delete currencies', NULL),
    
    -- Student Fee Management
    ('finance.student_fees.read', 'finance', 'read', 'View student fees', NULL),
    ('finance.student_fees.create', 'finance', 'create', 'Create student fee records', NULL),
    ('finance.student_fees.update', 'finance', 'update', 'Update student fees', NULL),
    ('finance.student_fees.delete', 'finance', 'delete', 'Delete student fee records', NULL),
    ('finance.student_fees.waive', 'finance', 'update', 'Waive student fees', NULL),
    
    -- Financial Settings & Configuration
    ('finance.settings.read', 'finance', 'read', 'View financial settings', NULL),
    ('finance.settings.update', 'finance', 'update', 'Update financial settings', NULL),
    
    -- Budget Management (for future budgeting)
    ('finance.budgets.read', 'finance', 'read', 'View budgets', NULL),
    ('finance.budgets.create', 'finance', 'create', 'Create budgets', NULL),
    ('finance.budgets.update', 'finance', 'update', 'Update budgets', NULL),
    ('finance.budgets.delete', 'finance', 'delete', 'Delete budgets', NULL),
    ('finance.budgets.approve', 'finance', 'approve', 'Approve budgets', NULL)
ON CONFLICT (name, organization_id) DO NOTHING;

-- ============================================================================
-- Assign Permissions to Super Admin (Global - organization_id NULL)
-- ============================================================================

-- Give super_admin global (organization_id NULL) access to all financial permissions
INSERT INTO public.role_permissions (role, permission_id, organization_id)
SELECT 'super_admin', id, NULL
FROM public.permissions
WHERE name LIKE 'finance.%'
  AND organization_id IS NULL
ON CONFLICT (role, permission_id, organization_id) DO NOTHING;

-- ============================================================================
-- Update assign_default_role_permissions Function
-- ============================================================================
-- Update the function to include financial permissions for new organizations

CREATE OR REPLACE FUNCTION public.assign_default_role_permissions(target_org UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Super admin role permissions scoped to organization (read-only mirror)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'super_admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Admin: full control except destructive org-level settings and super-sensitive actions
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'admin', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        -- Settings & General
        'settings.read',
        
        -- Users & Profiles
        'users.read','users.create','users.update','users.delete',
        'profiles.read','profiles.update',
        
        -- Buildings & Facilities
        'buildings.read','buildings.create','buildings.update','buildings.delete',
        'rooms.read','rooms.create','rooms.update','rooms.delete',
        
        -- Branding & Reports
        'branding.read','branding.create','branding.update','branding.delete',
        'reports.read','reports.export',
        
        -- Security & Auth
        'auth_monitoring.read','security_monitoring.read',
        'permissions.read','permissions.update',
        'backup.read',
        
        -- Academic
        'academic.residency_types.read','academic.residency_types.create',
        'academic.residency_types.update','academic.residency_types.delete',
        
        -- Financial (Full Access)
        'finance.dashboard.read','finance.reports.read','finance.reports.export','finance.analytics.read',
        'finance.income_categories.read','finance.income_categories.create','finance.income_categories.update','finance.income_categories.delete',
        'finance.income.read','finance.income.create','finance.income.update','finance.income.delete','finance.income.approve',
        'finance.expense_categories.read','finance.expense_categories.create','finance.expense_categories.update','finance.expense_categories.delete',
        'finance.expenses.read','finance.expenses.create','finance.expenses.update','finance.expenses.delete','finance.expenses.approve',
        'finance.payment_methods.read','finance.payment_methods.create','finance.payment_methods.update','finance.payment_methods.delete',
        'finance.asset_categories.read','finance.asset_categories.create','finance.asset_categories.update','finance.asset_categories.delete',
        'finance.assets.read','finance.assets.create','finance.assets.update','finance.assets.delete','finance.assets.depreciate',
        'finance.fund_types.read','finance.fund_types.create','finance.fund_types.update','finance.fund_types.delete',
        'finance.funds.read','finance.funds.create','finance.funds.update','finance.funds.delete','finance.funds.distribute',
        'finance.debt_categories.read','finance.debt_categories.create','finance.debt_categories.update','finance.debt_categories.delete',
        'finance.debts.read','finance.debts.create','finance.debts.update','finance.debts.delete','finance.debts.settle',
        'finance.fiscal_years.read','finance.fiscal_years.create','finance.fiscal_years.update','finance.fiscal_years.delete','finance.fiscal_years.close',
        'finance.cost_centers.read','finance.cost_centers.create','finance.cost_centers.update','finance.cost_centers.delete',
        'finance.accounts.read','finance.accounts.create','finance.accounts.update','finance.accounts.delete',
        'finance.journal.read','finance.journal.create','finance.journal.update','finance.journal.delete','finance.journal.post',
        'finance.currencies.read','finance.currencies.create','finance.currencies.update','finance.currencies.delete',
        'finance.student_fees.read','finance.student_fees.create','finance.student_fees.update','finance.student_fees.delete','finance.student_fees.waive',
        'finance.settings.read','finance.settings.update',
        'finance.budgets.read','finance.budgets.create','finance.budgets.update','finance.budgets.delete','finance.budgets.approve'
      )
    ON CONFLICT DO NOTHING;

    -- Accountant: Full financial access (similar to admin for finance module)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'accountant', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'reports.read','reports.export',
        'finance.dashboard.read','finance.reports.read','finance.reports.export','finance.analytics.read',
        'finance.income_categories.read','finance.income_categories.create','finance.income_categories.update',
        'finance.income.read','finance.income.create','finance.income.update','finance.income.approve',
        'finance.expense_categories.read','finance.expense_categories.create','finance.expense_categories.update',
        'finance.expenses.read','finance.expenses.create','finance.expenses.update','finance.expenses.approve',
        'finance.payment_methods.read','finance.payment_methods.create','finance.payment_methods.update',
        'finance.asset_categories.read','finance.assets.read','finance.assets.create','finance.assets.update','finance.assets.depreciate',
        'finance.fund_types.read','finance.funds.read','finance.funds.create','finance.funds.update','finance.funds.distribute',
        'finance.debt_categories.read','finance.debts.read','finance.debts.create','finance.debts.update','finance.debts.settle',
        'finance.fiscal_years.read','finance.fiscal_years.create','finance.fiscal_years.update','finance.fiscal_years.close',
        'finance.cost_centers.read','finance.cost_centers.create','finance.cost_centers.update',
        'finance.accounts.read','finance.accounts.create','finance.accounts.update',
        'finance.journal.read','finance.journal.create','finance.journal.update','finance.journal.post',
        'finance.currencies.read',
        'finance.student_fees.read','finance.student_fees.create','finance.student_fees.update','finance.student_fees.waive',
        'finance.settings.read',
        'finance.budgets.read','finance.budgets.create','finance.budgets.update'
      )
    ON CONFLICT DO NOTHING;

    -- Teacher: Limited financial read access (view reports, student fees)
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'teacher', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'finance.dashboard.read','finance.reports.read',
        'finance.student_fees.read'
      )
    ON CONFLICT DO NOTHING;

    -- Staff: Limited financial read access
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'staff', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'finance.dashboard.read','finance.student_fees.read'
      )
    ON CONFLICT DO NOTHING;

    -- Librarian: Read-only access
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'librarian', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read'
      )
    ON CONFLICT DO NOTHING;

    -- Asset Manager: Asset-focused permissions
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'asset_manager', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'finance.dashboard.read',
        'finance.asset_categories.read','finance.asset_categories.create','finance.asset_categories.update',
        'finance.assets.read','finance.assets.create','finance.assets.update','finance.assets.depreciate'
      )
    ON CONFLICT DO NOTHING;

    -- Hostel Manager: Limited financial access
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'hostel_manager', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'finance.student_fees.read'
      )
    ON CONFLICT DO NOTHING;

    -- Parent: View student fees only
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'parent', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'finance.student_fees.read'
      )
    ON CONFLICT DO NOTHING;

    -- Student: View own fees only
    INSERT INTO public.role_permissions (role, permission_id, organization_id)
    SELECT 'student', p.id, target_org
    FROM public.permissions p
    WHERE p.organization_id IS NULL
      AND p.name IN (
        'settings.read',
        'buildings.read','rooms.read','profiles.read','reports.read',
        'academic.residency_types.read',
        'finance.student_fees.read'
      )
    ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================================
-- Assign Financial Permissions to Existing Organizations
-- ============================================================================

DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL
    LOOP
        -- Admin role: Full financial access
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'admin', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name LIKE 'finance.%'
        ON CONFLICT DO NOTHING;

        -- Accountant role: Full financial access
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'accountant', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN (
            'finance.dashboard.read','finance.reports.read','finance.reports.export','finance.analytics.read',
            'finance.income_categories.read','finance.income_categories.create','finance.income_categories.update',
            'finance.income.read','finance.income.create','finance.income.update','finance.income.approve',
            'finance.expense_categories.read','finance.expense_categories.create','finance.expense_categories.update',
            'finance.expenses.read','finance.expenses.create','finance.expenses.update','finance.expenses.approve',
            'finance.payment_methods.read','finance.payment_methods.create','finance.payment_methods.update',
            'finance.asset_categories.read','finance.assets.read','finance.assets.create','finance.assets.update','finance.assets.depreciate',
            'finance.fund_types.read','finance.funds.read','finance.funds.create','finance.funds.update','finance.funds.distribute',
            'finance.debt_categories.read','finance.debts.read','finance.debts.create','finance.debts.update','finance.debts.settle',
            'finance.fiscal_years.read','finance.fiscal_years.create','finance.fiscal_years.update','finance.fiscal_years.close',
            'finance.cost_centers.read','finance.cost_centers.create','finance.cost_centers.update',
            'finance.accounts.read','finance.accounts.create','finance.accounts.update',
            'finance.journal.read','finance.journal.create','finance.journal.update','finance.journal.post',
            'finance.currencies.read',
            'finance.student_fees.read','finance.student_fees.create','finance.student_fees.update','finance.student_fees.waive',
            'finance.settings.read',
            'finance.budgets.read','finance.budgets.create','finance.budgets.update'
          )
        ON CONFLICT DO NOTHING;

        -- Teacher: Limited financial read
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'teacher', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN (
            'finance.dashboard.read','finance.reports.read','finance.student_fees.read'
          )
        ON CONFLICT DO NOTHING;

        -- Staff: Limited financial read
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'staff', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN ('finance.dashboard.read','finance.student_fees.read')
        ON CONFLICT DO NOTHING;

        -- Asset Manager: Asset permissions
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT 'asset_manager', p.id, org_record.id
        FROM public.permissions p
        WHERE p.organization_id IS NULL
          AND p.name IN (
            'finance.dashboard.read',
            'finance.asset_categories.read','finance.asset_categories.create','finance.asset_categories.update',
            'finance.assets.read','finance.assets.create','finance.assets.update','finance.assets.depreciate'
          )
        ON CONFLICT DO NOTHING;

        -- Parent & Student: View fees only
        INSERT INTO public.role_permissions (role, permission_id, organization_id)
        SELECT role_name, p.id, org_record.id
        FROM public.permissions p
        CROSS JOIN (VALUES ('parent'), ('student'), ('hostel_manager')) AS roles(role_name)
        WHERE p.organization_id IS NULL
          AND p.name = 'finance.student_fees.read'
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;
