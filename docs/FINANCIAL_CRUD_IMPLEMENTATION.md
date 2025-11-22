# Financial CRUD Implementation Guide

## Overview

This document provides the implementation status and instructions for the financial lookups CRUD system.

## ✅ Completed Components

### 1. **Type Definitions** (`/src/types/finance.ts`)
All 10 financial lookup table interfaces with form data types:
- Currency, FiscalYear, CostCenter, IncomeCategory, ExpenseCategory
- PaymentMethod, AssetCategory, FundType, DebtCategory, FinancialAccount

### 2. **API Helpers** (`/src/lib/finance/lookups/*.ts`)
Complete Supabase CRUD functions for all 10 tables:
- `currencies.ts`, `fiscalYears.ts`, `costCenters.ts`, `incomeCategories.ts`
- `expenseCategories.ts`, `paymentMethods.ts`, `assetCategories.ts`
- `fundTypes.ts`, `debtCategories.ts`, `financialAccounts.ts`
- Centralized export in `index.ts`

### 3. **React Query Hooks** (`/src/hooks/finance/useFinancialLookups.tsx`)
Complete hooks with full CRUD operations for all 10 tables:
- Query hooks: `useCurrencies`, `useFiscalYears`, `useCostCenters`, etc.
- Mutation hooks: `useCreate*`, `useUpdate*`, `useDelete*` for each entity
- Special: `useCloseFiscalYear` for fiscal year management

### 4. **Zod Validation Schemas** (`/src/lib/finance/schemas.ts`)
Complete validation schemas for all 10 entities with proper validation rules.

### 5. **Sample Page** (`/src/pages/settings/finance/CurrenciesPage.tsx`)
Complete CRUD page for Currencies with:
- List table with search/filter
- Add/Edit dialog with form validation
- Delete confirmation dialog
- Permission-based access control
- Multi-language support ready
- Organization/Global scope badges

## 📋 Creating Additional Pages

All remaining pages should follow the `CurrenciesPage.tsx` pattern. Here's the template:

```typescript
// Example: FiscalYearsPage.tsx
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fiscalYearSchema } from '@/lib/finance/schemas';
import { 
  useFiscalYears, 
  useCreateFiscalYear, 
  useUpdateFiscalYear, 
  useDeleteFiscalYear,
  useCloseFiscalYear 
} from '@/hooks/finance/useFinancialLookups';
// ... rest imports same as CurrenciesPage

export function FiscalYearsPage() {
  // Same structure as CurrenciesPage
  // Adjust:
  // 1. Permission names: 'finance.fiscal_years.*'
  // 2. Table columns based on entity fields
  // 3. Form fields based on entity schema
  // 4. Special actions (e.g., Close Fiscal Year button)
}
```

### Page Creation Checklist for Each Entity:

1. **Copy `CurrenciesPage.tsx` template**
2. **Replace entity references**:
   - Import correct hooks
   - Update permission checks
   - Adjust form fields
   - Update table columns
3. **Add entity-specific features**:
   - Hierarchical selects (parent_id) for categories/accounts
   - Special badges (Islamic Fund, Depreciable, etc.)
   - Extra actions (Close Fiscal Year, etc.)
4. **Test**:
   - Create, Read, Update, Delete
   - Search/filter
   - Permission-based access

## 🔧 Sidebar Integration

Add to `/src/components/navigation/SmartSidebar.tsx`:

```typescript
{
  titleKey: "Financial Settings",
  title: "Financial Settings",
  children: [
    {
      title: "Currencies",
      url: "/settings/finance/currencies",
      icon: DollarSign,
      permission: "finance.currencies.read"
    },
    {
      title: "Fiscal Years",
      url: "/settings/finance/fiscal-years",
      icon: Calendar,
      permission: "finance.fiscal_years.read"
    },
    {
      title: "Cost Centers",
      url: "/settings/finance/cost-centers",
      icon: Building2,
      permission: "finance.cost_centers.read"
    },
    {
      title: "Income Categories",
      url: "/settings/finance/income-categories",
      icon: TrendingUp,
      permission: "finance.income_categories.read"
    },
    {
      title: "Expense Categories",
      url: "/settings/finance/expense-categories",
      icon: TrendingDown,
      permission: "finance.expense_categories.read"
    },
    {
      title: "Payment Methods",
      url: "/settings/finance/payment-methods",
      icon: CreditCard,
      permission: "finance.payment_methods.read"
    },
    {
      title: "Asset Categories",
      url: "/settings/finance/asset-categories",
      icon: Package,
      permission: "finance.asset_categories.read"
    },
    {
      title: "Fund Types",
      url: "/settings/finance/fund-types",
      icon: Heart,
      permission: "finance.fund_types.read"
    },
    {
      title: "Debt Categories",
      url: "/settings/finance/debt-categories",
      icon: AlertCircle,
      permission: "finance.debt_categories.read"
    },
    {
      title: "Chart of Accounts",
      url: "/settings/finance/accounts",
      icon: FileText,
      permission: "finance.accounts.read"
    }
  ]
}
```

## 🚀 Router Configuration

Add routes in your router configuration (e.g., `App.tsx` or routing file):

```typescript
import { CurrenciesPage } from '@/pages/settings/finance/CurrenciesPage';
// Import other pages...

// In routes:
<Route path="/settings/finance/currencies" element={<CurrenciesPage />} />
<Route path="/settings/finance/fiscal-years" element={<FiscalYearsPage />} />
// ... add all 10 routes
```

## 📝 Entity-Specific Notes

### Fiscal Years
- Add "Close Fiscal Year" button (special permission)
- Show closed status prominently
- Date range validation in form

### Cost Centers
- Hierarchical parent selector (dropdown with existing cost centers)
- Manager selector (dropdown with staff profiles)

### Income/Expense Categories
- Multi-language fields (Arabic, Pashto)
- Parent category selector
- Tax/approval limit fields for special cases

### Payment Methods
- Bank-related fields (conditional rendering)
- Processing fee fields

### Asset Categories
- Depreciation method dropdown
- Useful life and salvage value fields
- Conditional depreciation fields

### Fund Types
- Islamic fund type dropdown (conditional)
- Restriction description textarea
- Islamic fund badge in table

### Debt Categories
- Student/Supplier debt badges
- Payment terms fields
- Interest rate fields (conditional)

### Financial Accounts
- Account type dropdown (asset/liability/equity/income/expense)
- Normal balance dropdown (debit/credit)
- Bank account fields (conditional)
- Parent account hierarchical selector
- System account protection (can't delete)

## 🎨 UI Components Used

All pages use shadcn/ui components:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `AlertDialog` - for delete confirmations
- `Button`, `Input`, `Label`, `Switch`, `Textarea`, `Select`
- `Badge` - for status, scope, types
- Lucide React icons

## 🔒 Permission System

Each page checks these permissions:
- `finance.{entity}.read` - View list
- `finance.{entity}.create` - Add button visibility
- `finance.{entity}.update` - Edit button visibility  
- `finance.{entity}.delete` - Delete button visibility

Global/system records can't be deleted by regular users.

## 🌍 Multi-Language Support

All pages are ready for i18n:
- Use `useLanguage()` hook
- Wrap strings with `t('key')`
- Arabic/Pashto fields in forms where applicable

## 📊 Search & Filter

All pages have:
- Search input (filters by name, code, description)
- Real-time client-side filtering
- Search icon with input placeholder

## ✨ Features to Implement Later

Once basic CRUD is working:
- Bulk import/export (CSV/Excel)
- Advanced filters (multi-select, date ranges)
- Sorting by columns
- Pagination for large datasets
- Audit log viewer
- Duplicate detection
- Bulk operations (activate/deactivate multiple)

## 🐛 Testing Checklist

For each page:
- [ ] Create new record (with validation)
- [ ] Edit existing record
- [ ] Delete record (with confirmation)
- [ ] Search/filter works
- [ ] Permissions respected
- [ ] Error handling (duplicate codes, etc.)
- [ ] Loading states display correctly
- [ ] Empty states show proper messages
- [ ] Form validation catches errors
- [ ] Success toasts appear
- [ ] Data refreshes after mutations

## 📚 Additional Resources

- Migration files: `/workspace/supabase/migrations/20250222*.sql`
- Financial setup guide: `/workspace/docs/FINANCIAL_MANAGEMENT_SETUP.md`
- Multi-tenancy guide: `/workspace/docs/MULTI_TENANCY_SETUP.md`
- Permissions migration: `/workspace/supabase/migrations/20250222000002_add_financial_permissions.sql`

---

**Status**: Foundation complete. Ready for page replication and router integration.
