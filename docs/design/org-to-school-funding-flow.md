# Org-to-School Funding Flow (Design Note)

## Current state

- **Org finance:** One ledger. Accounts, income, and expenses with `school_id = null`. Used for payroll, org-level spending, donations, etc.
- **School finance:** Separate ledger per school. Accounts, income, and expenses with `school_id = <that school>`. Each school manages its own books.
- **No link today:** There is no "transfer to school" or "allocation" entity. Org and school finance are independent.

So when the org wants to give money to a school, **we do not yet have a dedicated flow**. This note compares options and recommends one.

---

## Options

### Option A: Manual two-step (current workaround)

1. **Org admin:** Create an **expense entry** in org finance (e.g. account "Org main", category "Transfer to schools", description "Transfer to School X", amount 5000). Money leaves the org account.
2. **School user:** Manually create an **income entry** in school finance (e.g. account "School main", category "From organization", description "Received from org", amount 5000). Money enters the school account.

**Pros:** No new code; uses existing org expense + school income.  
**Cons:** No link between the two entries; reconciliation is manual; school might forget to book the income or use a different amount/date; no single "transfer" record.

---

### Option B: Formal transfer (recommended for a future phase)

Introduce a first-class **org-to-school transfer** (or **allocation**) that creates and links both sides in one action:

1. **New entity (e.g. `org_school_transfers`):**  
   `id`, `organization_id`, `school_id`, `org_account_id`, `school_account_id`, `amount`, `currency_id`, `transfer_date`, `reference_no`, `notes`, `status` (e.g. `pending` | `completed` | `cancelled`), `org_expense_entry_id`, `school_income_entry_id`, `created_by`, `created_at`, etc.

2. **Flow:**
   - Org admin selects: source (org account), target school, target school account (or default), amount, date, reference/notes.
   - Backend in one transaction:
     - Creates org-side **expense entry** (org account, category e.g. "Transfer to school", amount, `school_id = null`), and optionally links it to the transfer (e.g. `transfer_id` on `expense_entries` if you add it).
     - Creates school-side **income entry** (school account, category e.g. "From organization", amount, `school_id = target school`), and optionally links it to the transfer.
     - Creates the **transfer** row with `org_expense_entry_id` and `school_income_entry_id`, status `completed`.

3. **UI:**  
   - Org-admin: "Transfer to school" (e.g. under Finance) with school selector, org account, school account, amount, date.  
   - Optional: school-side view of "Transfers from org" (read-only list of transfers where `school_id = current school`).

**Pros:** One audit trail, matched org expense and school income, clear reporting ("how much did we send to each school?"), no manual second step.  
**Cons:** Requires new table(s), API, and UI.

---

### Option C: Shared account (not recommended as the main model)

One "shared" org account that every school can spend from (e.g. all school expenses hit that same org account). This blurs who actually holds the money and complicates per-school reporting and permissions. Prefer **separate org account and per-school accounts** with explicit **transfers** (Option B) so each school has its own books and the org clearly records "we sent X to school Y."

---

## Recommendation

- **Short term (today):** Use **Option A** if you need something immediately: org records an expense "Transfer to School X" and the school manually creates the corresponding income entry. Document the convention (e.g. category names, reference format) so reconciliation is easier.
- **Next phase:** Implement **Option B** (formal org-to-school transfer) so that:
  - Org admin selects a school and amount; the system creates both the org expense and the school income and links them in one transfer record.
  - You keep **separate org and school accounts** (no shared account required); the transfer moves money from an org account to a school account on the books.

That way you get a clear audit trail, correct balances on both sides, and no reliance on the school remembering to create the income entry.

---

## Implemented: Option B (March 2026)

**Option B is implemented.** Org admin can use **Transfer to school** under **Finance** in the org-admin sidebar.

- **Backend:** Table `org_school_transfers`, model `OrgSchoolTransfer`, `OrgFinanceTransferController` with `index`, `store`, `schoolAccounts`, `schoolIncomeCategories`. `POST /api/org-finance/transfers` creates org expense + school income + transfer row in one transaction.
- **Frontend:** Org-admin sidebar shows **Finance** with: Finance dashboard, Accounts, Income, Expenses, **Transfer to school**. The Transfer to school page has a form (school, org account, school account, amount, date, org expense category, school income category, optional reference/notes) and a table of past transfers.
- **Permissions:** `org_finance.read` to see Finance section and list transfers; `org_finance.create` required to see and use "Transfer to school".

---

## Shared vs separate accounts (clarification)

- **Shared account between all schools:** One org-level account that multiple schools use. Not implemented; would require careful permission and reporting rules. Not recommended as the default.
- **Separate: org account + each school has its own account(s):** Current model. Org has org accounts (`school_id = null`). Each school has school accounts (`school_id = that school`). Transfers (Option B) move money from an org account to a chosen school’s account by creating the paired expense and income entries.

---

## If you implement Option B later

- Add migration: `org_school_transfers` (and optionally `transfer_id` on `expense_entries` / `income_entries` if you want a direct link).
- Add permission e.g. `org_finance.transfer` or reuse `org_finance.create` for the transfer action.
- Add API e.g. `POST /api/org-finance/transfers` with `school_id`, `org_account_id`, `school_account_id`, `amount`, `date`, etc.; in the same transaction create transfer row, org expense, school income; return transfer with both entry IDs.
- Org-admin UI: "Transfer to school" form (school selector, org account, school account, amount, date); list of past transfers.
- Optional: school finance view "Transfers from org" (read-only) for transparency.
