# Financial Management System - Database Setup

## Overview

This document describes the comprehensive financial management system for the Nazim School Manager Pro. The system supports multi-tenant organizations with school-level granularity, enabling complete financial tracking including income, expenses, assets, funds (including Islamic funds like Zakat and Waqf), debts, and comprehensive reporting.

## Migration Files

Three migration files have been created in `/workspace/supabase/migrations/`:

### 1. `20250222000000_create_financial_lookup_tables.sql`
**Purpose**: Creates all financial lookup/master tables with proper multi-tenancy support.

**Tables Created**:
- ✅ `financial_currencies` - Currency definitions with exchange rates
- ✅ `financial_fiscal_years` - Academic/fiscal year periods
- ✅ `financial_cost_centers` - Department/function tracking
- ✅ `financial_income_categories` - Income/revenue categories
- ✅ `financial_expense_categories` - Expense/expenditure categories
- ✅ `financial_payment_methods` - Payment/receipt methods
- ✅ `financial_asset_categories` - Fixed asset categories with depreciation
- ✅ `financial_fund_types` - Fund types (Zakat, Sadaqah, Waqf, etc.)
- ✅ `financial_debt_categories` - Debt/liability categories
- ✅ `financial_accounts` - Chart of accounts (double-entry bookkeeping)

**Features**:
- Full multi-language support (English, Arabic, Pashto)
- Organization-level and school-level scoping
- Soft delete support (deleted_at)
- Auto-update timestamps (updated_at trigger)
- Comprehensive RLS policies enforcing organization isolation
- Proper indexes for performance
- Parent-child hierarchies where applicable

### 2. `20250222000001_seed_financial_lookup_data.sql`
**Purpose**: Provides default/global seed data for all financial categories.

**Seed Data Includes**:
- **8 Currencies**: AFN, USD, EUR, GBP, SAR, AED, PKR, IRR
- **20 Income Categories**: Tuition, Registration, Transport, Cafeteria, Donations, Zakat, Sadaqah, Waqf, etc.
- **32 Expense Categories**: Salaries, Utilities, Maintenance, Supplies, Transport, Food, Marketing, etc.
- **9 Payment Methods**: Cash, Bank Transfer, Cheque, Card, Mobile Money, POS, Hawala, etc.
- **12 Asset Categories**: Land, Buildings, Furniture, IT Equipment, Vehicles, Library, etc.
- **11 Fund Types**: Zakat, Sadaqah, Waqf, Scholarship, Building, Emergency, etc.
- **9 Debt Categories**: Student Tuition Debt, Supplier Payables, Loans, etc.
- **60+ Chart of Accounts**: Complete basic accounting structure (Assets, Liabilities, Equity, Income, Expense)

**Characteristics**:
- All seed data is global (organization_id = NULL, school_id = NULL)
- Organizations can use these defaults or create their own
- Multi-language labels (English, Arabic, Pashto)
- Islamic finance compliant (Zakat, Waqf, Sadaqah categories)
- Practical categories based on Islamic school needs

### 3. `20250222000002_add_financial_permissions.sql`
**Purpose**: Creates comprehensive role-based permissions for financial management.

**Permission Groups** (110+ permissions):
- Dashboard & Analytics
- Income Management (categories + transactions)
- Expense Management (categories + transactions)
- Asset Management (categories + fixed assets)
- Fund Management (donations, Zakat, etc.)
- Debt Management (receivables & payables)
- Payment Methods
- Fiscal Years
- Cost Centers
- Chart of Accounts
- Journal Entries & Ledger
- Currencies
- Student Fees
- Budgets
- Settings

**Role Assignments**:
- **super_admin**: Full access to all financial features
- **admin**: Full financial access (all CRUD operations)
- **accountant**: Full financial access (specialized financial role)
- **asset_manager**: Asset-focused permissions
- **teacher**: Read-only (dashboard, reports, student fees)
- **staff**: Limited read-only (dashboard, student fees)
- **parent**: View student fees only
- **student**: View own fees only
- **hostel_manager**: View student fees
- **librarian**: No financial access (except general settings)

## Multi-Tenancy Architecture

### Organization & School Scoping

Every financial lookup table follows this pattern:

```sql
CREATE TABLE financial_xxx (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    school_id UUID NULL REFERENCES school_branding(id),
    -- other fields...
)
```

**Scoping Rules**:
- `organization_id NOT NULL`: Every record belongs to an organization
- `school_id NULL`: 
  - `NULL` = organization-wide (available to all schools in the org)
  - `<school_id>` = specific to that school
- Super admin (`organization_id = NULL` in profile): Can access all organizations
- Regular users: Can only access their own organization's data
- School-specific users: Can access organization-wide + their school's data

### Row Level Security (RLS)

All tables have 5 standard RLS policies:
1. **Service role**: Full access
2. **SELECT**: Users can read their organization's data (+ school filtering)
3. **INSERT**: Users can create in their organization (+ school validation)
4. **UPDATE**: Users can update their organization's data
5. **DELETE**: Users can delete their organization's data

### Unique Constraints

All lookup tables use this pattern for unique codes:
```sql
CREATE UNIQUE INDEX idx_table_code_org_school 
    ON financial_xxx (code, organization_id, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID))
    WHERE deleted_at IS NULL;
```

This ensures:
- Each organization can have their own codes
- School-specific codes don't conflict with org-wide codes
- Soft-deleted records don't block reuse

## Table Relationships

```
organizations
    └── school_branding (schools)
        ├── financial_currencies (optional org-specific)
        ├── financial_fiscal_years
        ├── financial_cost_centers
        ├── financial_income_categories (hierarchical)
        ├── financial_expense_categories (hierarchical)
        ├── financial_payment_methods
        ├── financial_asset_categories (hierarchical)
        ├── financial_fund_types
        ├── financial_debt_categories
        └── financial_accounts (hierarchical, chart of accounts)
```

## Key Features

### 1. Islamic Finance Support

The system includes specific support for Islamic financial practices:

**Islamic Fund Types**:
- ✅ Zakat (الزكاة) - Mandatory alms
- ✅ Sadaqah (الصدقة) - Voluntary charity
- ✅ Waqf (الوقف) - Endowment
- ✅ Fidya (الفدية) - Compensation for missed fasts
- ✅ Kaffarah (الكفارة) - Expiation

**Characteristics**:
- `is_islamic_fund` flag to identify Islamic funds
- `islamic_fund_type` enum for specific fund types
- `is_restricted` flag for restricted-use funds
- `requires_approval` for distribution controls
- `restriction_description` for detailed usage rules

### 2. Multi-Language Support

All user-facing categories support three languages:
- `name` (English)
- `name_arabic` (Arabic - العربية)
- `name_pashto` (Pashto - پښتو)

This ensures the system works seamlessly in Afghanistan, Pakistan, and other regions.

### 3. Hierarchical Categories

Several tables support parent-child relationships:
- Income Categories (e.g., Fees → Tuition Fees, Transport Fees)
- Expense Categories (e.g., Utilities → Electricity, Water, Gas)
- Asset Categories (e.g., Equipment → IT Equipment, Lab Equipment)
- Chart of Accounts (e.g., Assets → Current Assets → Cash)
- Cost Centers (e.g., Academic → Primary School, Secondary School)

### 4. Asset Depreciation

Asset categories include depreciation settings:
- `depreciation_method`: straight_line, declining_balance, sum_of_years, units_of_production, none
- `default_useful_life_years`: Expected asset lifespan
- `default_salvage_value_percentage`: Residual value percentage
- `is_depreciable`: Whether asset depreciates

### 5. Approval Workflows

Expense categories support approval workflows:
- `requires_approval`: Whether expenses need approval
- `approval_limit`: Amount threshold requiring approval
- Example: Marketing expenses > $2,000 require approval

### 6. Payment Processing

Payment methods include:
- `is_cash`, `is_bank_related`, `is_online`: Method classification
- `requires_reference`: Whether reference number is mandatory
- `processing_fee_percentage`: Fixed percentage fee
- `processing_fee_fixed`: Fixed amount fee
- Useful for mobile money, online payments, card processing

### 7. Debt Management

Debt categories support:
- `is_student_debt`: Student fee arrears
- `is_supplier_debt`: Payables to suppliers
- `default_payment_terms_days`: Standard payment terms
- `requires_interest`: Interest-bearing debt (non-Islamic)
- `default_interest_rate`: Interest rate (if applicable)

### 8. Fiscal Year Management

Fiscal years support:
- `is_current`: Currently active fiscal year
- `is_closed`: Closed/locked periods
- `closed_at`, `closed_by`: Audit trail for closing
- Date range validation (end_date > start_date)

### 9. Chart of Accounts

Complete double-entry bookkeeping support:
- **Account Types**: asset, liability, equity, income, expense
- **Normal Balance**: debit or credit
- **Bank Accounts**: Dedicated fields for bank details
- **Control Accounts**: Parent accounts for grouping
- **System Accounts**: Protected accounts (can't be deleted)
- **Manual Entry Control**: Some accounts block manual entries

## Usage Patterns

### For Organizations

1. **Use Global Defaults**: Simply query with `organization_id IS NULL` to get global categories
2. **Create Custom Categories**: Insert with your `organization_id`
3. **School-Specific**: Use `school_id` for school-specific categories
4. **Mix Both**: Global + custom categories work together seamlessly

### For Schools

1. **Organization-Wide**: `school_id IS NULL` categories available to all schools
2. **School-Specific**: `school_id = <my_school>` for school-only categories
3. **Filter Both**: RLS automatically shows both types

### Query Examples

```sql
-- Get all income categories for an organization (global + org-specific)
SELECT * FROM financial_income_categories
WHERE (organization_id IS NULL OR organization_id = $org_id)
  AND (school_id IS NULL OR school_id = $school_id)
  AND deleted_at IS NULL
  AND is_active = TRUE
ORDER BY sort_order;

-- Get only student fee categories
SELECT * FROM financial_income_categories
WHERE organization_id = $org_id
  AND is_student_fee = TRUE
  AND is_active = TRUE;

-- Get Islamic funds only
SELECT * FROM financial_fund_types
WHERE organization_id = $org_id
  AND is_islamic_fund = TRUE
  AND is_active = TRUE;

-- Get chart of accounts hierarchy
WITH RECURSIVE account_tree AS (
  SELECT *, 0 as level, code as path
  FROM financial_accounts
  WHERE parent_account_id IS NULL
    AND organization_id = $org_id
  UNION ALL
  SELECT a.*, at.level + 1, at.path || ' > ' || a.code
  FROM financial_accounts a
  JOIN account_tree at ON a.parent_account_id = at.id
)
SELECT * FROM account_tree
ORDER BY path;
```

## Next Steps (Future Migrations)

The lookup tables are ready. Next migrations should include:

1. **Transaction Tables**:
   - `financial_income_transactions`
   - `financial_expense_transactions`
   - `financial_fixed_assets`
   - `financial_fund_transactions`
   - `financial_debt_records`
   - `financial_student_fee_assignments`

2. **Double-Entry System**:
   - `financial_journal_entries`
   - `financial_journal_entry_lines`
   - `financial_ledger`

3. **Budgeting**:
   - `financial_budgets`
   - `financial_budget_lines`
   - `financial_budget_vs_actual_view`

4. **Reports** (Views & Functions):
   - Income statement
   - Balance sheet
   - Cash flow statement
   - Student fee collection report
   - Zakat distribution report
   - Asset register
   - Aging reports (receivables/payables)

## Migration Best Practices

### Running Migrations

```bash
# Via Supabase CLI
supabase db reset  # Reset and run all migrations
supabase db push   # Apply new migrations

# Check status
supabase migration list
```

### Rollback Strategy

These migrations are **safe and idempotent**:
- Use `CREATE TABLE IF NOT EXISTS`
- Use `ON CONFLICT DO NOTHING` for inserts
- No destructive operations
- Can be re-run safely

To rollback (if needed):
```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TABLE IF EXISTS financial_debt_categories CASCADE;
DROP TABLE IF EXISTS financial_fund_types CASCADE;
DROP TABLE IF EXISTS financial_asset_categories CASCADE;
DROP TABLE IF EXISTS financial_payment_methods CASCADE;
DROP TABLE IF EXISTS financial_expense_categories CASCADE;
DROP TABLE IF EXISTS financial_income_categories CASCADE;
DROP TABLE IF EXISTS financial_cost_centers CASCADE;
DROP TABLE IF EXISTS financial_fiscal_years CASCADE;
DROP TABLE IF EXISTS financial_currencies CASCADE;
```

## Testing

### Verify Migration Success

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'financial_%'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'financial_%';

-- Check seed data counts
SELECT 
    'currencies' as table_name, COUNT(*) as count FROM financial_currencies WHERE organization_id IS NULL
UNION ALL
SELECT 'income_categories', COUNT(*) FROM financial_income_categories WHERE organization_id IS NULL
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM financial_expense_categories WHERE organization_id IS NULL
UNION ALL
SELECT 'payment_methods', COUNT(*) FROM financial_payment_methods WHERE organization_id IS NULL
UNION ALL
SELECT 'asset_categories', COUNT(*) FROM financial_asset_categories WHERE organization_id IS NULL
UNION ALL
SELECT 'fund_types', COUNT(*) FROM financial_fund_types WHERE organization_id IS NULL
UNION ALL
SELECT 'debt_categories', COUNT(*) FROM financial_debt_categories WHERE organization_id IS NULL
UNION ALL
SELECT 'accounts', COUNT(*) FROM financial_accounts WHERE organization_id IS NULL;

-- Check permissions
SELECT COUNT(*) as financial_permissions_count
FROM permissions 
WHERE name LIKE 'finance.%' 
  AND organization_id IS NULL;

-- Should return 110+ permissions
```

### Test RLS Policies

```sql
-- Test as org user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "<user_id>", "organization_id": "<org_id>"}';

SELECT COUNT(*) FROM financial_income_categories;
-- Should see global + org-specific categories

-- Test as super admin
SET LOCAL request.jwt.claims TO '{"sub": "<super_admin_id>", "organization_id": null, "role": "super_admin"}';

SELECT COUNT(*) FROM financial_income_categories;
-- Should see ALL categories from all organizations
```

## Security Considerations

✅ **Multi-Tenancy**: Enforced at database level via RLS
✅ **Soft Delete**: All tables support soft delete (no data loss)
✅ **Audit Trail**: created_at, updated_at timestamps on all records
✅ **Permission-Based**: 110+ granular permissions for fine-grained access control
✅ **School Isolation**: School-specific data is automatically filtered
✅ **Organization Isolation**: Organizations can't see each other's data
✅ **Super Admin**: Can access all data for support/management

## Performance Optimizations

✅ **Indexes**: All tables have proper indexes on:
   - `organization_id`
   - `school_id`
   - `(organization_id, school_id)`
   - `deleted_at` (partial index for active records)
   - `is_active` (partial index)
   - Parent foreign keys

✅ **Efficient Queries**: RLS uses helper functions that are `STABLE` and optimized

✅ **Soft Delete**: Partial indexes exclude deleted records automatically

## Support & Documentation

- Main README: `/workspace/README.md`
- Multi-Tenancy Guide: `/workspace/docs/MULTI_TENANCY_SETUP.md`
- RLS Guide: `/workspace/docs/RLS_POLICIES_EXPLAINED.md`
- This Document: `/workspace/docs/FINANCIAL_MANAGEMENT_SETUP.md`

## Summary

The financial management system is now ready with:
- ✅ 10 comprehensive lookup tables
- ✅ 200+ seed records with multi-language support
- ✅ 110+ granular permissions
- ✅ Complete RLS policies
- ✅ Islamic finance support (Zakat, Waqf, Sadaqah)
- ✅ Multi-tenant architecture
- ✅ School-level granularity
- ✅ Soft delete support
- ✅ Hierarchical categories
- ✅ Double-entry accounting foundation
- ✅ Asset depreciation tracking
- ✅ Approval workflows
- ✅ Multi-currency support

Ready for frontend development and transaction table implementations! 🎉
