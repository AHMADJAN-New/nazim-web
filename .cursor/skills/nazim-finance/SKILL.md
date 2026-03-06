---
name: nazim-finance
description: Finance module patterns for Nazim. Use when working on accounts, categories, projects, donors, entries, reports, fees, or currencies. Covers useFinance hooks, finance structure, reports, fees, multi-tenancy, types and mapper.
---

# Nazim Finance

Finance covers general ledger (accounts, income/expense categories, projects, donors, entries), reports, and fees. Follow multi-tenancy and API/domain type patterns.

## Finance Structure

- **Accounts** — Cash/fund locations; `type: 'cash' | 'fund'`
- **Income categories** — For income entries; optional `isRestricted`
- **Expense categories** — For expense entries
- **Projects** — Budget tracking; `status: 'planning' | 'active' | 'completed' | 'cancelled'`
- **Donors** — For income entries; `type: 'individual' | 'organization'`
- **Income/Expense entries** — Linked to account, category, optional project/donor (income), amount, date, payment method

## Hooks (useFinance.tsx)

- **Base currency:** `useFinanceBaseCurrency()` — base currency for display (from useCurrencies)
- **Accounts:** `useFinanceAccounts(params?)`, `useCreateFinanceAccount`, `useUpdateFinanceAccount`, `useDeleteFinanceAccount`
- **Income categories:** `useIncomeCategories(params?)`, `useCreateIncomeCategory`, `useUpdateIncomeCategory`, `useDeleteIncomeCategory`
- **Expense categories:** `useExpenseCategories(params?)`, `useCreateExpenseCategory`, `useUpdateExpenseCategory`, `useDeleteExpenseCategory`
- **Projects:** `useFinanceProjects(params?)`, `useCreateFinanceProject`, `useUpdateFinanceProject`, `useDeleteFinanceProject`
- **Donors:** `useDonors(params?)`, `useCreateDonor`, `useUpdateDonor`, `useDeleteDonor`
- **Income entries:** `useIncomeEntries(params?)`, `useCreateIncomeEntry`, `useUpdateIncomeEntry`, `useDeleteIncomeEntry`
- **Expense entries:** `useExpenseEntries(params?)`, `useCreateExpenseEntry`, `useUpdateExpenseEntry`, `useDeleteExpenseEntry`
- **Reports:** `useFinanceDashboard`, `useDailyCashbook`, `useIncomeVsExpenseReport`, `useProjectSummaryReport`, `useDonorSummaryReport`, `useAccountBalancesReport`

Query keys include `profile?.organization_id`, `profile?.default_school_id` where applicable. Mutations invalidate related query keys (e.g. finance-dashboard, income-entries, daily-cashbook).

## Fees (Separate)

Fees are in a separate area: FeeDashboard, FeeStructuresPage, FeeAssignmentsPage, FeePaymentsPage, FeeExceptionsPage, FeeReportsPage. Use fee-specific hooks (e.g. useFees, useFeeStructures) from the API client; same multi-tenancy rules apply.

## Currencies

- `useCurrencies({ isActive: true })` — list active currencies
- `useFinanceBaseCurrency()` — base currency for finance (first base active or first active)

## Types and Mapper

- **Domain:** [frontend/src/types/domain/finance.ts](frontend/src/types/domain/finance.ts) — FinanceAccount, IncomeCategory, ExpenseCategory, FinanceProject, Donor, IncomeEntry, ExpenseEntry, FinanceDashboard, report types
- **API:** [frontend/src/types/api/finance.ts](frontend/src/types/api/finance.ts)
- **Mapper:** [frontend/src/mappers/financeMapper.ts](frontend/src/mappers/financeMapper.ts) — map*ApiToDomain, map*FormToInsert for each entity

## Multi-Tenancy

- Query keys: `['finance-accounts', profile?.organization_id, profile?.default_school_id ?? null, params]`
- Hooks use `profile?.organization_id`; school-scoped where applicable
- Follow [nazim-multi-tenancy](.cursor/skills/nazim-multi-tenancy/SKILL.md) for new finance endpoints or pages

## Checklist

- [ ] Use domain types and mapper for API ↔ UI
- [ ] Query keys include organization_id and default_school_id
- [ ] Invalidate finance-dashboard and related report keys on mutations
- [ ] Use useFinanceBaseCurrency for amount display when no account/project currency

## Additional Resources

- Finance status badges (paid, partial, pending, overdue), report types: [reference.md](reference.md)
