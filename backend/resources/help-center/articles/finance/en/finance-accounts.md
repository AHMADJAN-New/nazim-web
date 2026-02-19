# Finance Accounts

The Finance Accounts page is where you manage your school's cash locations and funds—for example, "Main Cash Box," "Donation Fund," or "Petty Cash." Each account has a name, optional code, type (Cash or Fund), currency, opening balance, and current balance. All income and expense entries are recorded against one of these accounts. Staff with finance account access use this page to add, edit, and delete accounts and to view account details and recent transactions in a side panel.

---

## Page Overview

When you open the Finance Accounts page, you will see:

### Summary Cards

This page does not have summary cards at the top. The main content is the accounts table and, when you click a row, an account details side panel.

### Filters & Search

There are no separate filter or search controls on this page. The table shows all accounts for your organization/school. You can use the table and side panel to inspect data.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Account name (e.g., Main Cash Box). |
| Code | Optional short code (e.g., MAIN_CASH). Shown as a badge or "-" if empty. |
| Type | Cash or Fund, shown as a badge. |
| Opening Balance | Opening balance at creation. |
| Current Balance | Current balance (updated by income and expense entries). Green if non-negative, red if negative. |
| Status | Active or Inactive. |
| Actions | Edit (pencil) and Delete (trash) buttons. |

Clicking a row (anywhere except the Actions column) opens the **Account Details** side panel; it does not open the edit form.

### Row Actions

When you click the actions on a row (or use the side panel):

- **Edit** (pencil icon) — Opens the edit account dialog with current data pre-filled.
- **Delete** (trash icon) — Opens a confirmation dialog. Confirming permanently deletes the account.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Account

To create a new account, click the **"Add Account"** button at the top of the page. A dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Account name (e.g., Main Cash Box). |
| Code | Text | No | Short code (e.g., MAIN_CASH). |
| Type | Select | Yes | Cash or Fund. |
| Currency | Select | Yes | Choose from active currencies. |
| Opening Balance | Number | No | Numeric; default 0. |
| Description | Textarea | No | Optional description. |
| Active | Switch | Yes | On by default. |

### What Happens After Submission

- The account is created. A success message (e.g., "Account created successfully") appears.
- The dialog closes and the table refreshes. The new account appears in the list and in the Finance Dashboard.

---

## Editing an Account

To edit an existing account:

1. Find the account in the table.
2. Click the **Edit** (pencil) button in the Actions column, or open the account in the side panel and click **Edit** there.
3. The edit dialog opens with current data pre-filled.
4. Change any fields (Name, Code, Type, Currency, Opening Balance, Description, Active).
5. Click **"Update"**.
6. A success message appears and the table (and dashboard) refreshes.

---

## Deleting an Account

To delete an account:

1. Click the **Delete** (trash) button on the row, or open the side panel and click **Delete** there.
2. A confirmation dialog appears: "Are you sure you want to delete this account? This action cannot be undone."
3. Click **"Confirm"** (or the destructive Delete button) to permanently remove the account.
4. Deleting an account can affect existing income and expense entries that reference it; ensure you understand the impact before deleting.

---

## Account Details Side Panel

When you click a table row, a **Sheet** (side panel) opens on the right (or left in RTL) with:

- **Account Information** — Name, Code, Type, Currency, Opening Balance, Current Balance, Status, Description.
- **Latest Transaction** — If any, shows type (Income/Expense), amount, date, category, reference no., payment method, description.
- **Transaction Summary** — Total Income, Total Expense, Net Balance, Transaction Count for this account.
- **Recent Transactions** — List of up to 10 recent transactions (income and expense combined, sorted by date).
- **Edit** and **Delete** buttons at the bottom.

The panel is read-only except for these actions. You can close it and click another row to view another account.

---

## Export Options

The page header includes **Report Export** buttons (PDF/Excel). Export uses the current accounts list with columns: Name, Code, Type, Opening Balance, Current Balance, Status. The export respects the current table data (no separate filters). Template type: `finance_accounts`.

---

## Tips & Best Practices

- Create at least one account (e.g., Main Cash) before recording any income or expenses.
- Use clear names and optional codes so accounts are easy to find in dropdowns on Income and Expense pages.
- Use the side panel to quickly check an account’s balance and recent activity without opening edit.
- Do not delete an account that still has important transaction history; consider deactivating (Active = Off) instead if your process allows.

---

## Related Pages

- [Finance Dashboard](/help-center/s/finance/finance-dashboard) — Overview and account summary
- [Income Entries](/help-center/s/finance/finance-income) — Record income (select account)
- [Expense Entries](/help-center/s/finance/finance-expenses) — Record expenses (select account)
- [Finance](/help-center/s/finance/finance) — Finance module overview

---

*Category: `finance` | Language: `en`*
