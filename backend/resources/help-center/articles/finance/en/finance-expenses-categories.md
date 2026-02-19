# Expense Categories

The Expense Categories page lets you define and manage the types of expenses your school records (e.g., Salaries, Utilities, Supplies). Staff use these categories when entering expenses so that reports and the finance dashboard can show spending by category. Keeping categories consistent improves reporting and budgeting.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards. A card at the top of the table shows the total number of categories found.

### Filters & Search

There are no filters or search on this page. All expense categories are listed in the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | The category name (e.g., Salaries, Utilities). |
| Code | Optional short code for the category (e.g., SAL). |
| Description | Optional description of what this category is for. Long text is truncated. |
| Status | Badge showing Active or Inactive. |
| Actions | Edit (pencil) and Delete (trash) buttons. |

### Row Actions

When you use the actions on any row, you can:

- **Edit** — Opens the edit dialog with the category’s current name, code, description, and Active switch. Change fields and click **Update** to save.
- **Delete** — Opens a confirmation dialog. Click **Delete** to remove the category. This action cannot be undone.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Expense Category

To create a new expense category, click the **"Add Category"** button at the top of the page. A dialog will open with the following:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Category name (e.g., Salaries). |
| Code | Text | No | Short code (e.g., SAL). |
| Description | Textarea | No | Description of this category. |
| Active | Switch | No | On by default. Turn off to hide the category from use without deleting it. |

Click **Create** to save. The dialog closes, the form resets, and the table refreshes with the new category.

### What Happens After Submission

- The category is created and appears in the table.
- A success message is shown.
- You can use this category when recording expenses.

---

## Editing an Expense Category

To edit an existing expense category:

1. Find the category in the table.
2. Click the Edit (pencil) button for that row.
3. The edit dialog opens with the current data pre-filled.
4. Change Name, Code, Description, or Active as needed.
5. Click **Update**.
6. The dialog closes and the table refreshes with the updated data.

---

## Deleting an Expense Category

To delete an expense category:

1. Click the Delete (trash) button on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this category? This action cannot be undone."
3. Click **Delete** to confirm or **Cancel** to keep the category.
4. If you delete a category that is used in expense entries, those entries may still reference it; consider marking the category Inactive instead if you want to keep history.

---

## Export Options

PDF and Excel export are available via the export buttons in the page header. The export includes the current list of categories (all rows in the table) with columns: Name, Code, Description, Status. Exported data matches what you see in the table. Use the template type "expense_categories" for consistent formatting.

---

## Tips & Best Practices

- Use clear, consistent names (e.g., "Salaries" not "Sal") so reports are easy to read.
- Add a short Code for each category if you use codes in spreadsheets or external reports.
- Prefer setting a category to Inactive rather than deleting it if it is already used in past expenses.
- Create categories before entering expenses so every expense can be assigned to a category.

---

## Related Pages

- [Finance Expenses](/help-center/s/finance/finance-expenses) — Record and view expense entries by category
- [Finance Dashboard](/help-center/s/finance/finance-dashboard) — Overview of income, expenses, and balances
- [Finance Reports](/help-center/s/finance/finance-reports) — Reports that use expense categories

---

*Category: `finance` | Language: `en`*
