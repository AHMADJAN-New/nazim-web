# Staff Types

The Staff Types page lets you define the types of staff in your school (e.g. Teacher, Clerk, Librarian, Guard). Each staff member is linked to one staff type. Staff types are used when adding or editing staff and in filters and reports. They help organize roles and permissions.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by staff type name, code, or description. Type in the search box to filter the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Staff type name (e.g. Teacher, Clerk). |
| Code | Short code for the type (e.g. TCH, CLK). Shown in a code-style box. |
| Description | Optional description. Truncated if long; shows "-" if empty. |
| Display Order | Numeric order used for sorting the type in lists (e.g. 0, 1, 2). |
| Is Active | Badge: Active or Inactive. Inactive types usually do not appear in dropdowns when adding staff. |
| Actions | Edit (pencil) and Delete (trash) buttons. |

### Row Actions

When you use the actions on any row:

- **Edit** — Opens the create/edit dialog with the current name, code, description, display order, and active status. Change fields and click **Save**.
- **Delete** — Opens a confirmation dialog. Click **Delete** to remove the staff type. If staff are linked to this type, deletion may be blocked or you may need to reassign them first.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Staff Type

To add a new staff type, click the **"Add Staff Type"** button at the top. A dialog opens with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Full name of the staff type (e.g. Teacher, Clerk). Max 100 characters. |
| Code | Text | Yes | Short code (e.g. TCH, CLK). Max 50 characters. Must be unique. |
| Description | Textarea | No | Optional description. Max 500 characters. |
| Display Order | Number | No | Integer ≥ 0. Default 0. Controls sort order in lists. |
| Is Active | Switch | No | Default On. Turn Off to hide this type from selection when adding staff. |

Click **Save** to create the staff type. The dialog closes and the table refreshes.

---

## Editing a Staff Type

To edit an existing staff type:

1. Find the staff type in the table.
2. Click the **Edit** (pencil) button.
3. Change Name, Code, Description, Display Order, or Is Active as needed.
4. Click **Save**.
5. The dialog closes and the table refreshes.

---

## Deleting a Staff Type

To delete a staff type:

1. Click the **Delete** (trash) button on the row.
2. A confirmation dialog appears with a warning that this may affect staff linked to this type.
3. Click **Delete** to confirm.
4. If the type is in use by staff, the system may prevent deletion until staff are reassigned to another type.

---

## Export Options

When the table has results, **Export** (PDF/Excel) buttons appear in the card header. The export uses the current search filter. Columns: Name, Code, Description, Display Order, Is Active. Filter summary (e.g. "Search: ...") is included when search is used.

---

## What This Setting Controls and What Depends on It

- **Controls:** The list of staff types available when adding or editing staff. Display order and active/inactive state affect how types appear in dropdowns.
- **Depends on:** Nothing (staff types are standalone settings).
- **Used by:** Staff management (each staff record has a staff type), filters and reports that group or filter by staff type, and teacher subject assignments (teacher list may show staff type).

---

## Tips & Best Practices

- Use short, clear codes (e.g. TCH, CLK, LIB) so they are easy to recognize in lists and reports.
- Set display order so the most common types (e.g. Teacher) appear first when selecting a type for a staff member.
- Mark rarely used types as Inactive instead of deleting them if staff or history still reference them.
- Keep names consistent (e.g. "Teacher" not "Teachers") for cleaner filters and reports.

---

## Related Pages

- [Staff](/help-center/s/staff/staff) — Add and edit staff; each staff member is assigned a staff type
- [Teacher Subject Assignments](/help-center/s/settings/settings-teacher-subject-assignments) — Assign teachers (staff with a teacher type) to subjects and classes

---

*Category: `settings` | Language: `en`*
