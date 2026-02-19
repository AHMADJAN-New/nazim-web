# Finance Settings

The Finance Settings page is the central place to manage currencies, income categories, expense categories, and exchange rates used across the finance module. School administrators and staff with the right permissions use it to set up and maintain these master lists so that income entries, expense entries, and reports use consistent data. What you configure here affects accounts, income, expenses, projects, and reports.

---

## Page Overview

When you open Finance Settings, you will see a page title and description at the top, then a row of tabs. Only tabs for which you have permission are visible. Click a tab to work in that section.

### Tabs (permission-based)

- **Currencies** — Add, edit, and manage currencies (e.g. AFN, USD). Required for multi-currency and for fee structures. Visible if you have **Currencies** (and multi-currency feature) permission.
- **Income Categories** — Add, edit, and manage income categories used when recording income entries. Visible if you have **Income Categories** read permission.
- **Expense Categories** — Add, edit, and manage expense categories used when recording expense entries. Visible if you have **Expense Categories** read permission.
- **Exchange Rates** — Add, edit, and manage exchange rates between currencies. Visible if you have **Exchange Rates** (and multi-currency feature) permission.

The first tab you see is the first one you have permission for (Currencies, then Income Categories, then Expense Categories, then Exchange Rates). The URL hash (e.g. `#currencies`, `#income-categories`) can be used to open a specific tab directly.

### Filters & Search

Filters and search depend on the active tab. Each embedded tab (Currencies, Income Categories, Expense Categories, Exchange Rates) has its own filters and search as on its standalone page. There are no page-level summary cards on Finance Settings; the content is the selected tab.

---

## Currencies Tab

When you open the **Currencies** tab, you see the full Currencies management view embedded in the page.

- **Summary** — List or table of all currencies (e.g. code, name, symbol, base-currency flag, active).
- **Create** — Use the "Add Currency" (or similar) button to add a new currency. Fill in code, name, symbol, and whether it is the base currency.
- **Edit** — Use the row action to edit an existing currency.
- **Delete** — Use the row action to delete a currency (only if it is not in use).
- **Export** — If available, use the export control to download the currencies list as PDF or Excel.

Currencies are used in accounts, income/expense entries, fee structures, and reports. At least one base currency is required when multi-currency is enabled.

---

## Income Categories Tab

When you open the **Income Categories** tab, you see the full Income Categories management view.

- **Summary** — Table of income categories (name, code, description, restricted flag, status).
- **Create** — "Add Category" opens a form: Name (required), Code, Description, Restricted (e.g. Zakat, Waqf), Active.
- **Edit** — Row action opens the same form with current data.
- **Delete** — Row action with confirmation. Deleting a category can affect existing income entries that use it.
- **Export** — If available, export the category list to PDF or Excel.

Income categories are used when recording income entries and in finance reports.

---

## Expense Categories Tab

When you open the **Expense Categories** tab, you see the full Expense Categories management view.

- **Summary** — Table of expense categories (name, code, description, status).
- **Create** — "Add Category" opens a form: Name (required), Code, Description, Active.
- **Edit** — Row action opens the same form with current data.
- **Delete** — Row action with confirmation. Deleting a category can affect existing expense entries that use it.
- **Export** — If available, export the category list to PDF or Excel.

Expense categories are used when recording expense entries and in finance reports.

---

## Exchange Rates Tab

When you open the **Exchange Rates** tab, you see the full Exchange Rates management view.

- **Summary** — List or table of exchange rates (e.g. from currency, to currency, rate, effective date, active).
- **Create** — Add a new rate: select from/to currencies, enter rate and optional effective date.
- **Edit** — Row action to update rate or dates.
- **Delete** — Row action to remove a rate (only if safe for existing data).
- **Export** — If available, export the rates list to PDF or Excel.

Exchange rates are used for converting amounts between currencies in reports and fee calculations when multi-currency is enabled.

---

## What Depends on Finance Settings

- **Accounts** — Account setup may use currencies.
- **Income entries** — Require income categories (and optionally currency).
- **Expense entries** — Require expense categories (and optionally currency).
- **Fee structures** — Can use currencies; conversion uses exchange rates.
- **Finance reports** — Use categories and currencies; reports may use exchange rates for conversion.

---

## Tips & Best Practices

- Define income and expense categories before entering many transactions so reports stay consistent.
- Mark restricted income categories (e.g. Zakat, Waqf) so they can be tracked separately in reports.
- Set one base currency and keep exchange rates up to date if you use multiple currencies.
- Use the URL hash (e.g. `/finance/settings#exchange-rates`) to open a specific tab when sharing links.

---

## Related Pages

- [Currencies](/help-center/s/finance/finance-currencies) — Standalone currencies page (same content as Currencies tab).
- [Finance Income](/help-center/s/finance/finance-income) — Record income using income categories.
- [Finance Expenses](/help-center/s/finance/finance-expenses) — Record expenses using expense categories.
- [Finance Reports](/help-center/s/finance/finance-reports) — Reports that use categories and currencies.
- [Fee Structures](/help-center/s/finance/finance-fees-structures) — Define fees; can use currencies and exchange rates.

---

*Category: `finance` | Language: `en`*
