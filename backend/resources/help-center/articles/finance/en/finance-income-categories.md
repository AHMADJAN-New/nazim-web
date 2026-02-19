# Income Categories

The Income Categories page lets you define and manage the types of income your school records—for example, "General Donation," "Zakat," "Tuition," or "Grant." When staff record income on the Income Entries page, they choose one of these categories. You can add, edit, and delete categories; each can have a name, optional code, description, and a "Restricted" flag (e.g., for Zakat or Waqf). Export to PDF/Excel is available.

---

## Page Overview

When you open the Income Categories page, you will see:

### Summary Cards

This page does not have summary cards at the top. The header shows the page title, description, an **Add Category** button, and export buttons. Below is the categories table.

### Filters & Search

There are no filter or search controls on this page. The table lists all income categories for your organization/school.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Category name. |
| Code | Optional short code (e.g., GEN_DON). "-" if empty. |
| Description | Short description; truncated if long. "-" if empty. |
| Restricted | Yes (badge) if the category is marked restricted (e.g., Zakat, Waqf); "-" otherwise. |
| Status | Active or Inactive (badge). |
| Actions | Edit (pencil) and Delete (trash) buttons. |

### Row Actions

- **Edit** (pencil) — Opens the edit category dialog with current data pre-filled.
- **Delete** (trash) — Opens a confirmation dialog. Confirming deletes the category permanently.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Income Category

To create a new income category, click the **"Add Category"** button at the top. A dialog opens with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Category name (e.g., General Donation). Placeholder: "e.g., General Donation." |
| Code | Text | No | Short code (e.g., GEN_DON). Placeholder: "e.g., GEN_DON." |
| Description | Textarea | No | Description of the category. Placeholder: "Description of this category..." Rows ~4. |
| Restricted (e.g., Zakat, Waqf) | Switch | No | When on, the category is marked as restricted. Off by default. |
| Active | Switch | No | When on, the category is active and available in dropdowns. On by default. |

Submit button: **Create**. The button is disabled until Name is non-empty and not only spaces.

### What Happens After Submission

- The category is created. A success message (e.g., "Income category created successfully") appears.
- The dialog closes and the table refreshes. The new category is available when recording income entries.

---

## Editing an Income Category

To edit an existing category:

1. Find the category in the table.
2. Click the **Edit** (pencil) button.
3. The edit dialog opens with current data pre-filled (Name, Code, Description, Restricted, Active).
4. Make your changes.
5. Click **"Update"**.
6. A success message appears and the table refreshes.

---

## Deleting an Income Category

To delete a category:

1. Click the **Delete** (trash) button on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this category? This action cannot be undone."
3. Click **Confirm** (or the destructive Delete button) to permanently remove the category.
4. If any income entries use this category, consider reassigning or understanding the impact before deleting.

---

## Export Options

The page header includes **Report Export** buttons (PDF/Excel). Export uses the current categories list. Columns: Name, Code, Description, Restricted (Yes/No), Status (Active/Inactive). Report key: `income_categories`. Template type: `income_categories`. Export is disabled when loading or when there are no categories.

---

## Tips & Best Practices

- Create categories before recording income so staff can classify every entry.
- Use "Restricted" for funds that must be used for a specific purpose (e.g., Zakat, Waqf).
- Keep names and codes short and consistent for easier reporting and filtering.
- Deactivate a category (Active = Off) instead of deleting it if it is still referenced by old entries.

---

## Related Pages

- [Income Entries](/help-center/s/finance/finance-income) — Record income (select category)
- [Finance Dashboard](/help-center/s/finance/finance-dashboard) — Overview
- [Finance](/help-center/s/finance/finance) — Finance overview

---

*Category: `finance` | Language: `en`*
