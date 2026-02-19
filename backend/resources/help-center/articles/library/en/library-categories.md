# Library Categories

The Library Categories page is where you create and manage the categories used to organize library books (e.g. Religion, Science, Fiction). School administrators and librarians use this page to add, edit, and delete categories and to set display order and active status. Categories are required when adding or editing books on the Library Books page.

---

## Page Overview

When you open the Library Categories page, you will see:

### Summary

- **PageHeader** — Title "Library Categories" (or similar), description "Manage book categories". Primary action: **Add Category** (if you have create permission).
- **Card** — Title "Categories", description with total count. Search filter and table below.

### Filters & Search

- **Search** — Client-side search by category name, code, or description. Placeholder: search categories.

---

## Data Table

| Column | Description |
|--------|-------------|
| Category Name | Category name. |
| Category Code | Code as badge, or "—". |
| Category Description | Description text (truncated), or "—". |
| Order | Display order (number). |
| Status | Badge: Active or Inactive. |
| Actions | Edit (pencil), Delete (trash). Shown only if you have update/delete permission. |

### Row Actions

- **Edit** — Opens the create/edit dialog with current data. Submit updates the category.
- **Delete** — Opens a confirmation dialog. Confirm deletes the category (with warning that books may be affected).

### Bulk Actions

No bulk actions on this page.

---

## Adding a New Category

1. Click **Add Category** (top right).
2. In the dialog, fill the form:

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| Category Name | Text | Yes | Min 1, max 100 characters. |
| Category Code | Text | No | Max 50 characters. |
| Category Description | Textarea | No | Max 500 characters. |
| Display Order | Number | No | Integer ≥ 0. Default 0. |
| Active | Switch | No | Default on. When off, category is inactive. |

3. Click **Create**. Dialog closes and the table refreshes.

---

## Editing a Category

1. Click **Edit** (pencil) on the row.
2. The same form opens with current values. Change as needed and click **Update**. Dialog closes and the table refreshes.

---

## Deleting a Category

1. Click **Delete** (trash) on the row.
2. Confirmation dialog: "Are you sure?" and text that the category will be deleted and (e.g.) books may be affected.
3. Click **Delete** to confirm. The category is removed. Books that used this category may have no category or need to be reassigned on Library Books.

---

## Tips & Best Practices

- Create categories before adding many books so every book can be assigned a category.
- Use **Display Order** to control how categories appear in dropdowns (e.g. in Library Books).
- Use **Active** to hide a category from new assignments without deleting it.

---

## Related Pages

- [Library Books](/help-center/s/library/library-books) — Books use these categories.
- [Library](/help-center/s/library/library) — Quick add book (category as text on that page).
- [Library Reports](/help-center/s/library/library-reports) — Reports can group by category.

---

*Category: `library` | Language: `en`*
