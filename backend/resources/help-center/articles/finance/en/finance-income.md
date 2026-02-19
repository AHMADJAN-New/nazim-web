# Income Entries

The Income Entries page is where you record and manage all income for your school—donations, fees, grants, and other receipts. Each entry is linked to an account, an income category, and optionally a project and donor. You can filter by date range, category, and account, view totals by currency, and export to PDF or Excel. Staff with finance access use this page to keep a clear record of every incoming amount.

---

## Page Overview

When you open the Income Entries page, you will see:

### Summary Cards

- **Currency summary cards** — One card per currency present in the filtered entries, showing total income in that currency (e.g., AFN, USD). If you use a base currency and multiple currencies, a converted amount in base currency may be shown (e.g., "≈ … in base").
- **Total Income (base currency)** — A card showing total income converted to the organization’s base currency, with entry count and number of currencies. Shown only when a base currency is configured.

### Filters & Search

- **Search** — Text search over description, reference number, income category name, and donor name.
- **From** — Date picker; filter entries on or after this date.
- **To** — Date picker; filter entries on or before this date.
- **Category** — Dropdown; filter by income category (All or a specific category).
- **Account** — Dropdown; filter by finance account (All or a specific account).
- **Clear** — Button to reset all filters (shown when any filter is active).

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Date | Transaction date. |
| Category | Income category name (badge). |
| Account | Finance account name (badge) or "-". |
| Donor | Donor name (badge) or "-". |
| Project | Project name (badge) or "-". |
| Currency | Currency code (badge). |
| Amount | Amount with + prefix (e.g., +1,500.00), in entry currency. |
| Actions | Edit (pencil) and Delete (trash) buttons. |

Clicking a row opens the **Income Entry Details** side panel (Sheet). Clicking Edit or Delete in Actions uses those buttons only (row click does not trigger delete).

### Row Actions

- **Edit** (pencil) — Opens the edit income dialog with all fields pre-filled.
- **Delete** (trash) — Opens a confirmation dialog. Confirming deletes the entry permanently.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Income Entry

To create a new income entry, click the **"Add Income"** button at the top. A dialog opens with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Account | Select | Yes | Choose from active finance accounts. |
| Category | Select | Yes | Choose from active income categories. |
| Amount | Number | Yes | Must be greater than 0. |
| Date | Date Picker | Yes | Transaction date. |
| Currency | Select | No | Defaults to account currency or base currency. Options may include "Account Currency" and "(Base)". |
| Project | Select | No | Optional project (or None). |
| Donor | Select | No | Optional donor (or None). |
| Reference No. | Text | No | e.g., receipt number. |
| Payment Method | Select | No | Cash, Cheque, Bank Transfer, or Other. Default Cash. |
| Description | Textarea | No | Optional notes (e.g., "Cash donation after Jumu'ah"). |

### What Happens After Submission

- The income entry is created and linked to the selected account. The account’s current balance increases.
- A success message (e.g., "Income entry created successfully") appears.
- The dialog closes and the table refreshes. Dashboard, daily cashbook, and related reports are invalidated/refetched.

---

## Editing an Income Entry

To edit an existing income entry:

1. Find the entry in the table.
2. Click the **Edit** (pencil) button in the Actions column.
3. The edit dialog opens with current data pre-filled.
4. Change any fields.
5. Click **"Update"**.
6. A success message appears and the table and related data refresh.

---

## Deleting an Income Entry

To delete an income entry:

1. Click the **Delete** (trash) button on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this entry? This action cannot be undone."
3. Click **Confirm** (or the destructive Delete button) to permanently remove the entry.
4. The account’s current balance will decrease by the entry amount; reports and dashboard update accordingly.

---

## Viewing Entry Details (Side Panel)

Clicking a table row opens a **Sheet** (side panel) with full read-only details:

- **Entry Information** — Amount, Date, Reference No., Payment Method, Description.
- **Account Information** — Account name, type, current balance, code (if any).
- **Category Information** — Category name, code, description (if any).
- **Project Information** — If linked: project name, status, budget amount, project balance.
- **Donor Information** — If linked: donor name, type, phone, email, total donated.
- **Currency Information** — Currency code, symbol (if any).
- **Metadata** — Created At, Updated At (if available).

---

## Export Options

The page header includes **Report Export** buttons (PDF/Excel). Export uses the **filtered** entries. Columns include: Date, Category, Account, Donor, Project, Currency, Amount, Payment Method, Reference No. A filter summary (date range, category, account, search) can be included. Template type: `income_entries`. Disabled when there are no filtered entries.

---

## Tips & Best Practices

- Always select an account and category before entering amount and date.
- Use the same currency as the account (or base) unless you intentionally record in another currency.
- Link donations to a Donor and, if applicable, to a Project for better reporting.
- Use Reference No. and Description so entries are easy to find and audit later.
- Use date range and category filters to review income by period or source.

---

## Related Pages

- [Finance Dashboard](/help-center/s/finance/finance-dashboard) — Overview
- [Finance Accounts](/help-center/s/finance/finance-accounts) — Manage accounts
- [Income Categories](/help-center/s/finance/finance-income-categories) — Manage categories
- [Finance](/help-center/s/finance/finance) — Finance overview

---

*Category: `finance` | Language: `en`*
