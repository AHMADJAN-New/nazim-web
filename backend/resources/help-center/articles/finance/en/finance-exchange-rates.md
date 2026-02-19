# Exchange Rates

The Exchange Rates page lets you manage currency exchange rates used to convert amounts between currencies (e.g., 1 USD = 70 AFN). You define a "from" currency, a "to" currency, the rate, and an effective date. The system uses these rates for multi-currency reporting and conversions. Keep rates updated so reports and balances are accurate.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards. A card above the table shows how many rates are listed (e.g., "X rates found").

### Filters & Search

There are no filters or search on this page. All exchange rates are listed in the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| From | "From" currency code (e.g., USD) shown as a badge. |
| To | "To" currency code (e.g., AFN) shown as a badge. |
| Rate | The exchange rate (e.g., 1 from = rate to). A "Reverse" badge may appear when the rate is marked as reverse in notes. |
| Effective Date | Date from which this rate applies. |
| Notes | Optional notes (e.g., source or "reverse rate"). Long text is truncated. |
| Status | Active or Inactive badge. |
| Actions | Edit (pencil) and Delete (trash) buttons. |

### Row Actions

When you use the actions on any row:

- **Edit** — Opens the edit dialog with From Currency, To Currency, Rate, Effective Date, Notes, and Active switch. Click **Update** to save.
- **Delete** — Opens a confirmation dialog. Click **Delete** to remove the rate. This action cannot be undone.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Exchange Rate

To add a new exchange rate, click the **"Add Exchange Rate"** button at the top. A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| From Currency | Select | Yes | Source currency (from active currencies). The "To" currency is excluded from the list. |
| To Currency | Select | Yes | Target currency (from active currencies). The "From" currency is excluded. |
| Exchange Rate | Number | Yes | Rate meaning: 1 unit of "From" = this many units of "To". Must be greater than 0. |
| Effective Date | Date picker | Yes | Date from which this rate is effective. Defaults to today. |
| Notes | Textarea | No | Optional notes (e.g., "Central bank rate" or "Reverse"). |
| Active | Switch | No | On by default. Turn off to stop using this rate without deleting it. |

Hint under the rate field: "1 from currency = rate to currency."

Click **Create** to save. The dialog closes and the new rate appears in the table.

### What Happens After Submission

- The exchange rate is created and appears in the table.
- The system can use it for converting amounts (e.g., in reports or account balances) when the effective date applies.
- A success message is shown.

---

## Editing an Exchange Rate

To edit an existing exchange rate:

1. Find the rate in the table.
2. Click the Edit (pencil) button for that row.
3. The edit dialog opens with current data pre-filled.
4. Change From Currency, To Currency, Rate, Effective Date, Notes, or Active as needed.
5. Click **Update**.
6. The dialog closes and the table refreshes.

---

## Deleting an Exchange Rate

To delete an exchange rate:

1. Click the Delete (trash) button on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this exchange rate? This action cannot be undone."
3. Click **Delete** to confirm or **Cancel** to keep the rate.
4. Deleting a rate may affect conversions that relied on it; add a new rate if you still need that currency pair.

---

## Export Options

This page does not show PDF/Excel export buttons in the header. To export exchange rate data, use Finance Reports or other report pages if available.

---

## Tips & Best Practices

- Enter rates in a consistent direction (e.g., always "1 USD = X AFN") and use notes to mark reverse rates if needed.
- Set the Effective Date to when the rate applies so historical and current reports use the correct rate.
- Update rates periodically (e.g., monthly or when rates change) and add new rows for new effective dates rather than editing old ones if you need history.
- Use the Notes field to record the source (e.g., central bank) for auditability.

---

## Related Pages

- [Currencies](/help-center/s/finance/finance-currencies) — Manage the currencies used in exchange rates
- [Finance Accounts](/help-center/s/finance/finance-accounts) — Account balances may be converted using these rates
- [Finance Reports](/help-center/s/finance/finance-reports) — Reports may use exchange rates for multi-currency totals

---

*Category: `finance` | Language: `en`*
