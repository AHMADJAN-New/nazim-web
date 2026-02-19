# Letter Types

The Letter Types page lets you define and manage the types of letters your school uses in the Document Management System (DMS). Administrators and staff use letter types to organize templates and letterheads (for example: application letters, official letters, parent letters). Each letter type has a unique key, a display name, and an optional description, and can be set active or inactive. Letter types are used when creating templates and letterheads so that the right options appear when issuing letters.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by letter type key, name, or description. Type in the search box to filter the table in real time.
- **Status** — Filter by status: **All Status**, **Active**, or **Inactive**. Only letter types matching the selected status are shown.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Key | The unique technical key for the letter type (e.g. `application`, `moe_letter`). Displayed in monospace. |
| Name | The display name of the letter type (e.g. Application Letters). |
| Description | Optional description of the letter type, or "-" if none. |
| Status | Badge showing **Active** or **Inactive**. |
| Actions | Dropdown menu (⋮) with row-level actions. |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **View** — Opens a read-only dialog showing the letter type details (key, name, description, status).
- **Edit** — Opens the edit form with the current data pre-filled so you can change name, description, or active status. The key can also be edited.
- **Delete** — Opens a confirmation dialog. Confirm to permanently delete the letter type. The system may prevent deletion if the letter type is in use by templates or letterheads.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Letter Type

To create a new letter type, click the **"Create Letter Type"** button at the top of the page. A dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Key | Text | Yes | Unique technical identifier. Only lowercase letters, numbers, and underscores (e.g. `application`, `moe_letter`). Max 50 characters. |
| Name | Text | Yes | Display name shown in the app (e.g. Application Letters). Max 255 characters. |
| Description | Textarea | No | Optional description. Max 1000 characters. |
| Active | Switch | No | When on, the letter type is active and available for use. Default is on. |

**Buttons:** **Cancel** (closes the dialog) and **Create** (submits the form; shows "Creating..." while saving).

### What Happens After Submission

- The system validates the key format (lowercase letters, numbers, underscores only) and that key and name are provided.
- On success, a success message is shown, the dialog closes, and the table refreshes with the new letter type.
- If the key is already in use or validation fails, an error message is shown.

---

## Editing a Letter Type

To edit an existing letter type:

1. Find the letter type in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit dialog opens with the current key, name, description, and active status pre-filled.
4. Change any of the fields (key, name, description, or active switch).
5. Click **"Update"**.
6. On success, a success message appears, the dialog closes, and the table refreshes.

---

## Deleting a Letter Type

To delete a letter type:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears: "Are you sure you want to delete this letter type? This action cannot be undone. The letter type cannot be deleted if it's in use by templates or letterheads."
3. Click **"Delete"** to confirm or **"Cancel"** to keep it.
4. If the letter type is in use, the system may prevent deletion and show an error.

---

## Viewing Letter Type Details

- Click the actions menu (⋮) → **View** to open the **Letter Type Details** dialog.
- The dialog shows Key, Name, Description (if any), and Status in read-only form. Use it to check details without editing.

---

## Export Options

This page does not offer PDF or Excel export. Use DMS Reports or Archive for document-level exports.

---

## Tips & Best Practices

- **Use clear keys** — Keep keys short and consistent (e.g. `application`, `official`, `parent_letter`) so they are easy to recognize in templates and letterheads.
- **Set inactive instead of deleting** — If a letter type is no longer needed but might be referenced by old templates, set it to **Inactive** rather than deleting it.
- **Match name and key** — Use a display name that clearly matches the key (e.g. key `moe_letter`, name "MOE Letter") so staff can find the right type quickly.

---

## Related Pages

- [DMS Templates](/help-center/s/dms/dms-templates) — Create and manage letter templates; letter types filter which templates appear.
- [DMS Letterheads](/help-center/s/dms/dms-letterheads) — Manage letterheads; letter types can be linked to letterheads.
- [DMS Issue Letter](/help-center/s/dms/dms-issue-letter) — Issue letters using templates and letterheads that depend on letter types.
- [DMS Settings](/help-center/s/dms/dms-settings) — Configure DMS numbering and security.

---

*Category: `dms` | Language: `en`*
