# Currencies

The Currencies page lets you manage the currencies your school uses for accounts, projects, and transactions (e.g., USD, AFN, PKR). You can add a currency with a code, name, symbol, and decimal places, and mark one currency as the base currency for reporting. Multi-currency support is used together with Exchange Rates and finance accounts.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards. A card above the table shows how many currencies are listed (e.g., "X currencies found").

### Filters & Search

There are no filters or search on this page. All currencies are listed in the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Code | Currency code (e.g., USD, AFN). Usually a 3-letter ISO 4217 code. |
| Name | Full name of the currency (e.g., US Dollar). |
| Symbol | Currency symbol (e.g., $) if set; otherwise "-". |
| Decimals | Number of decimal places used for amounts. |
| Base | "Yes" with a star icon if this is the base currency; otherwise "-". Only one currency can be base. |
| Status | Active or Inactive badge. |
| Actions | Edit (pencil) and Delete (trash) buttons. The Delete button is disabled for the base currency. |

### Row Actions

When you use the actions on any row:

- **Edit** — Opens the edit dialog. Code is read-only; you can change Name, Symbol, Decimal Places, Base Currency (switch), and Active (switch). Click **Update** to save.
- **Delete** — Opens a confirmation dialog. Click **Delete** to remove the currency. **You cannot delete the base currency**; the Delete button is disabled for that row.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Currency

To add a new currency, click the **"Add Currency"** button at the top. A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Currency Code | Text | Yes | 3-letter code (e.g., USD). Input is converted to uppercase. Hint: ISO 4217 code. |
| Name | Text | Yes | Full name (e.g., US Dollar). |
| Symbol | Text | No | Symbol (e.g., $). Max 10 characters. |
| Decimal Places | Number | No | 0–6; default is 2. |
| Base Currency | Switch | No | Off by default. Turn on to make this the base currency (only one base allowed). |
| Active | Switch | No | On by default. Turn off to hide the currency from active lists. |

Click **Create** to save. The dialog closes and the new currency appears in the table.

### What Happens After Submission

- The currency is created and appears in the table.
- If you set it as Base Currency, it will be used as the base for conversions and reporting where applicable.
- You can use this currency when creating accounts, projects, or exchange rates.

---

## Editing a Currency

To edit an existing currency:

1. Find the currency in the table.
2. Click the Edit (pencil) button for that row.
3. The edit dialog opens. The Currency Code field is disabled and cannot be changed.
4. Change Name, Symbol, Decimal Places, Base Currency, or Active as needed.
5. Click **Update**.
6. The dialog closes and the table refreshes.

---

## Deleting a Currency

To delete a currency:

1. Click the Delete (trash) button on the row. (The button is disabled for the base currency.)
2. A confirmation dialog appears: "Are you sure you want to delete this currency? This action cannot be undone."
3. Click **Delete** to confirm or **Cancel** to keep the currency.
4. You cannot delete the base currency; set another currency as base first if needed. Deleting a currency may affect accounts, projects, or exchange rates that use it.

---

## Export Options

This page does not show PDF/Excel export buttons in the header. To export currency data, use Finance Reports or other report pages if available.

---

## Tips & Best Practices

- Use standard ISO 4217 codes (e.g., USD, AFN, EUR) so they match common usage and exchange rate sources.
- Set one base currency (e.g., your main operating currency) and use it consistently for reporting.
- Use decimal places that match how you record amounts (e.g., 2 for most currencies, 0 for some).
- Prefer marking a currency Inactive instead of deleting it if it is used in past transactions.

---

## Related Pages

- [Exchange Rates](/help-center/s/finance/finance-exchange-rates) — Define exchange rates between currencies
- [Finance Accounts](/help-center/s/finance/finance-accounts) — Accounts can be in a specific currency
- [Finance Projects](/help-center/s/finance/finance-projects) — Projects can use a currency

---

*Category: `finance` | Language: `en`*
