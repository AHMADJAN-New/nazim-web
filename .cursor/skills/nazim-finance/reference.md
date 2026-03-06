# Finance Reference

## Report Types

- **Finance dashboard** — Summary, account balances, income/expense by category, recent entries, assets
- **Daily cashbook** — Day-by-day income/expense
- **Income vs expense** — Comparison report
- **Project summary** — Per-project totals
- **Donor summary** — Per-donor totals
- **Account balances** — Balance per account

Query keys: `finance-dashboard`, `daily-cashbook`, `income-vs-expense-report`, `project-summary-report`, `donor-summary-report`, `account-balances-report`

## Fee/Payment Status Badges

For fee and payment status display:

| Status  | Variant     | Color (optional) |
|---------|-------------|-------------------|
| paid    | default     | green             |
| partial | secondary   | yellow            |
| pending | outline     | orange            |
| overdue | destructive | red               |

Use pattern from [nazim-status-badges](.cursor/skills/nazim-status-badges/SKILL.md) (variant + optional className for semantic color).

## Payment Methods

Domain type `PaymentMethod`: `'cash' | 'bank_transfer' | 'cheque' | 'other'`

## Expense Entry Status

`ExpenseStatus`: `'pending' | 'approved' | 'rejected'`

## Invalidation Groups

When mutating finance data, typically invalidate: relevant entity key (e.g. `finance-accounts`), `finance-dashboard`, `income-entries`, `expense-entries`, `daily-cashbook`, and any report keys that depend on the entity.
