# Asset Categories

The Asset Categories page lets you create and manage categories used to group assets (e.g. Electronics, Furniture, Vehicles). Categories appear in the asset create/edit form and in reports (e.g. Assets by Category on the dashboard and in Asset Reports). You can add, edit, deactivate, and delete categories, and export the list.

---

## Page Overview

When you open the Asset Categories page you will see a title and description, an **Add Category** button (if you have create permission), and a card containing a search box and a table of categories with export buttons in the header.

### Search

- **Search** — Search by category name, code, or description. The table filters as you type. Placeholder text typically says "Search categories...".

---

## Data Table

The table has these columns:

| Column | Description |
|--------|-------------|
| Name | Category name. |
| Code | Short code (e.g. ELEC, FURN) or — if empty. Shown as a badge when present. |
| Description | Full description or — if empty. Truncated if long. |
| Display Order | Numeric order used for sorting categories (e.g. in dropdowns). |
| Status | Active or Inactive badge. |
| Actions | Edit (pencil), Delete (trash). Buttons shown only if you have update/delete permission. |

### Row Actions

- **Edit** — Opens the create/edit dialog with the category’s current data so you can change name, code, description, display order, and active status.
- **Delete** — Opens a confirmation dialog. Confirming permanently deletes the category. If assets use this category, consider reassigning them to another category first or check whether the system prevents deletion when in use.

---

## Creating a New Category

1. Click **Add Category**.
2. In the dialog:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Category name (max 100 characters). |
| Code | Text | No | Short code (max 50 characters), e.g. ELEC, FURN, VEH. |
| Description | Textarea | No | Description (max 500 characters). |
| Display Order | Number | No | Integer ≥ 0. Lower numbers appear first in lists. Default 0. |
| Active | Switch | No | On = active (shown in dropdowns and reports). Default on. |

3. Click **Create**.

The table refreshes and the new category appears. You can use it immediately when creating or editing assets.

---

## Editing a Category

1. Find the category in the table.
2. Click **Edit** (pencil).
3. Change any of: Name, Code, Description, Display Order, Active.
4. Click **Update**.

Turning **Active** off hides the category from new asset forms and often from filters; existing assets that use the category may still show it until you change them.

---

## Deleting a Category

1. Click **Delete** (trash) on the row.
2. Read the confirmation message. It may state that this action cannot be undone or that categories are used to group assets.
3. Click the confirm button (e.g. **Delete**). The category is permanently removed. If the system blocks deletion when assets reference the category, you will see an error; reassign those assets to another category first.

---

## Export Options

Use the **PDF** and **Excel** buttons in the card header to export the category list. The export uses the current search filter and typically includes: name, code, description, display order, and status (Active/Inactive).

---

## Tips & Best Practices

- **Use codes** — Short codes (e.g. IT, FURN) make dropdowns and reports easier to scan.
- **Set display order** — Use display order so the most-used categories appear at the top in asset forms.
- **Deactivate instead of delete** — If a category is no longer needed but is in use, set it to Inactive so it no longer appears for new assets; you can keep historical data intact.
- **Create categories before bulk import** — If you import assets with category names, create matching categories first so they link correctly.

---

## Related Pages

- [Assets](/help-center/s/assets/assets) — When creating/editing an asset, you choose a category from this list.
- [Assets Dashboard](/help-center/s/assets/assets-dashboard) — "Assets by Category" uses these categories.
- [Asset Reports](/help-center/s/assets/assets-reports) — Category breakdown and filters use these categories.

---

*Category: `assets` | Language: `en`*
