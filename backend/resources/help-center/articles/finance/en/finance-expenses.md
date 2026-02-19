# Expense Entries

The Expense Entries page is where you record and manage all expenses for your school—salaries, utilities, supplies, and other payments. Each entry is linked to an account, an expense category, and optionally a project. You can record who was paid (Paid To), payment method, reference number, and status (Approved, Pending, Rejected). Totals show approved expenses only. You can filter by date range, category, account, and status, and export to PDF or Excel.

---

## Page Overview

When you open the Expense Entries page, you will see:

### Summary Cards

- **Total Expenses** — Sum of amounts for **approved** expense entries in the filtered list. Shown in red with the count of entries and a note "(approved only)."

### Filters & Search

- **Search** — Text search over description, reference number, expense category name, and "Paid To" field.
- **From** — Date picker; filter entries on or after this date.
- **To** — Date picker; filter entries on or before this date.
- **Category** — Dropdown; filter by expense category (All or a specific category).
- **Account** — Dropdown; filter by finance account (All or a specific account).
- **Status** — Dropdown; filter by status: All, Approved, Pending, or Rejected.
- **Clear** — Button to reset all filters (shown when any filter is active).

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Date | Transaction date. |
| Category | Expense category name (badge). |
| Account | Finance account name (badge) or "-". |
| Paid To | Person or vendor name (badge) or "-". |
| Project | Project name (badge) or "-". |
| Status | Approved (green), Pending (yellow), or Rejected (red) badge. |
| Amount | Amount with minus prefix (e.g., -1,500.00). |
| Actions | Edit (pencil) and Delete (trash) buttons. |

Clicking a row opens the **Expense Entry Details** side panel (Sheet).

### Row Actions

- **Edit** (pencil) — Opens the edit expense dialog with all fields pre-filled.
- **Delete** (trash) — Opens a confirmation dialog. Confirming deletes the entry permanently.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Expense Entry

To create a new expense entry, click the **"Add Expense"** button at the top. A dialog opens with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Account | Select | Yes | Choose from active finance accounts. Current balance may be shown in the option. |
| Category | Select | Yes | Choose from active expense categories. |
| Amount | Number | Yes | Must be greater than 0. |
| Date | Date Picker | Yes | Transaction date. |
| Currency | Select | No | Defaults to account currency or base currency. Options may include "Account Currency" and "(Base)". |
| Project | Select | No | Optional project (or None). |
| Paid To | Text | No | Person or vendor name. Placeholder: "Person or vendor name..." |
| Payment Method | Select | No | Cash, Bank Transfer, Cheque, or Other. Default Cash. |
| Reference No. | Text | No | e.g., voucher or bill number. Placeholder: "Voucher/Bill number..." |
| Status | Select | No | Approved, Pending, or Rejected. Default Approved. |
| Description | Textarea | No | Optional notes (e.g., "Monthly electricity bill"). |

Submit button: **Create**. The button is disabled until Account and Category are selected and Amount is greater than 0.

### What Happens After Submission

- The expense entry is created and linked to the selected account. The account’s current balance decreases.
- A success message (e.g., "Expense entry created successfully") appears.
- The dialog closes and the table refreshes. Dashboard, daily cashbook, and related reports are invalidated/refetched.

---

## Editing an Expense Entry

To edit an existing expense entry:

1. Find the entry in the table.
2. Click the **Edit** (pencil) button in the Actions column.
3. The edit dialog opens with current data pre-filled (including Status; Paid To is in the form).
4. Make your changes.
5. Click **"Update"**.
6. A success message appears and the table and related data refresh.

---

## Deleting an Expense Entry

To delete an expense entry:

1. Click the **Delete** (trash) button on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this entry? This action cannot be undone."
3. Click **Confirm** (or the destructive Delete button) to permanently remove the entry.
4. The account’s current balance will increase by the entry amount; reports and dashboard update accordingly.

---

## Viewing Entry Details (Side Panel)

Clicking a table row opens a **Sheet** (side panel) with full read-only details:

- **Entry Information** — Amount, Date, Status, Reference No., Payment Method, Paid To (if any), Description.
- **Account Information** — Account name, type, current balance, code (if any).
- **Category Information** — Category name, code, description (if any).
- **Project Information** — If linked: project name, status, budget amount, project balance.
- **Currency Information** — Currency code, symbol (if any).
- **Metadata** — Created At, Updated At (if available).

---

## Export Options

The page header includes **Report Export** buttons (PDF/Excel). Export uses the **filtered** entries. Columns include: Date, Category, Account, Paid To, Project, Amount, Payment Method, Status, Reference No. A filter summary (date range, category, account, status, search) can be included. Template type: `expense_entries`. Export is disabled when there are no filtered entries.

---

## Tips & Best Practices

- Always select an account and category and enter a valid amount and date.
- Use "Paid To" and Reference No. so payments are traceable to vendors or bills.
- Use Pending for entries that need approval; set to Approved once verified.
- Use the Status filter to focus on pending or rejected items when reviewing.
- Link project-related expenses to a Project for accurate project reporting.

---

## Related Pages

- [Finance Dashboard](/help-center/s/finance/finance-dashboard) — Overview
- [Finance Accounts](/help-center/s/finance/finance-accounts) — Manage accounts
- [Expense Categories](/help-center/s/finance/finance-expenses-categories) — Manage expense categories
- [Finance](/help-center/s/finance/finance) — Finance overview

---

*Category: `finance` | Language: `en`*
