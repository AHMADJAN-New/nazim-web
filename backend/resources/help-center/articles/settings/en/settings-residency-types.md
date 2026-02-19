# Residency Types Management

The Residency Types Management page lets you define and manage residency types for your organization. Residency types describe how a student lives (e.g., Day scholar, Boarder, Hostel). They are used when admitting or registering students and in reports and filters. School administrators use this page to add, edit, and remove residency types and to export a list of residency types to PDF or Excel.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search residency types by name, code, or description. Type to filter the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Display name of the residency type (e.g., Day Scholar, Boarder). |
| Code | Short code used in the system (e.g., DAY, BRD). Shown in a code-style badge. |
| Description | Optional description of the residency type. Long text is truncated with ellipsis. |
| Is Active | Badge: Active or Inactive. Inactive types are typically hidden from selection in forms. |
| Actions | Edit (pencil) and Delete (trash) buttons. Shown only if you have update or delete permission. |

### Row Actions

There is no dropdown menu; actions are inline buttons:

- **Edit** — Opens the create/edit dialog with the current name, code, description, and active status.
- **Delete** — Opens a confirmation dialog. Confirming removes the residency type. If the type is in use (e.g., assigned to students), deletion may be blocked or you may need to reassign those students first.

### Bulk Actions

No bulk actions available on this page.

---

## Export Options

At the top of the page, **Export** buttons (PDF and Excel) are available. They export the current filtered list of residency types with columns: Name, Code, Description, and Is Active (translated). The export uses the same filters as the table (e.g., search). Export is disabled when there are no residency types in the filtered list.

---

## Adding a New Residency Type

To add a new residency type, click the **"Add Residency Type"** button at the top. A dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Display name (e.g., Day Scholar, Boarder). Max 100 characters. |
| Code | Text | Yes | Short unique code (e.g., DAY, BRD). Max 50 characters. Used in forms and data. |
| Description | Textarea | No | Optional description. Max 500 characters. |
| Is Active | Switch | No | Whether the type is active and available in forms. Default On. |

### What Happens After Submission

- The system validates name (required, max 100), code (required, max 50), and description (max 500).
- The residency type is saved for your organization. On success, a success message is shown, the dialog closes, and the table refreshes.
- The new type can then be selected when admitting or editing students (in the residency/residence type field).

---

## Editing a Residency Type

To edit an existing residency type:

1. Find the type in the table (use search if needed).
2. Click the **Edit** (pencil) button on that row.
3. The dialog opens with the current name, code, description, and active status.
4. Make your changes.
5. Click **"Save"**.
6. On success, the dialog closes and the table refreshes. Any student or form that uses this type will show the updated name/code/description.

---

## Deleting a Residency Type

To delete a residency type:

1. Click the **Delete** (trash) button on the type row.
2. A confirmation dialog appears (with a generic delete message for residency types).
3. Click **"Delete"** to confirm or **"Cancel"** to keep the type.
4. If the type is in use by student admissions or other data, the backend may prevent deletion or return an error. In that case, reassign or update those records to use another residency type first, then delete.

---

## What This Setting Controls

- **Residency types** are used when admitting or registering students: the student's residency type (e.g., Day scholar, Boarder) is stored and can be used in reports, filters, and lists.
- Inactive types are typically hidden from dropdowns in admission and student forms so users cannot select them for new records; existing records keep their value.
- Residency types are **organization-scoped**: each organization has its own list. Export uses the report system and can include a filters summary (e.g., current search).

---

## Tips & Best Practices

- Use short, clear codes (e.g., DAY, BRD, HOSTEL) so they are easy to recognize in exports and data.
- Add a brief description so staff know what each type means (e.g., "Student goes home daily" for Day Scholar).
- Do not delete a residency type that is still assigned to students; switch those students to another type first or the system may block deletion.
- Use **Is Active** to hide outdated types from new forms without deleting them (e.g., an old "Weekly Boarder" type you no longer offer).

---

## Related Pages

- [Students](/help-center/s/students/students) — Register and manage students; residency type is set during admission
- [Admissions](/help-center/s/students/admissions) — Manage student admissions to classes; residency type can be part of admission data
- [Schools](/help-center/s/settings/settings-schools) — Manage schools; reports may group or filter by school and residency

---

*Category: `settings` | Language: `en`*
