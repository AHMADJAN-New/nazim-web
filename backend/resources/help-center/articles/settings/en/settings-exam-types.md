# Exam Types

The Exam Types settings page lets you define the types of exams used in your school (e.g. Monthly, Mid-Term, Final). School administrators use this page to add exam types, set display order, and mark types as active or inactive. Exam types are used when creating and managing exams, timetables, and result entry so that staff can filter and report by type.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by exam type name, code, or description. Type in the search box to filter the table. Results are sorted by display order, then by name.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Exam type name (e.g. Monthly, Final, Mid-Term). |
| Code | Short code for the type (e.g. MONTHLY, FINAL, MID). Shown as a badge or "—" if empty. |
| Description | Optional description. Truncated if long. "—" if empty. |
| Display Order | Numeric order used to sort exam types in lists and dropdowns. |
| Active | Badge: Active or Inactive. Inactive types can be hidden from selection where exam type is chosen. |
| Actions | Edit (pencil) and Delete (trash) buttons. |

### Row Actions

When you use the actions on a row:

- **Edit (pencil)** — Opens the edit dialog with the exam type’s data so you can change name, code, description, display order, or active status.
- **Delete (trash)** — Opens a confirmation dialog. Confirming removes the exam type. If exams or other data reference this type, those may be affected; check before deleting.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Exam Type

To add a new exam type, click the **"Add"** (or "Create") button at the top of the page. A dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Full name of the exam type (e.g. Monthly, Final, Mid-Term). Max 100 characters. |
| Code | Text | No | Short code (e.g. MONTHLY, FINAL, MID). Max 50 characters. |
| Description | Textarea | No | Optional description. Max 500 characters. |
| Display Order | Number | No | Integer ≥ 0. Lower numbers appear first. Default: 0. |
| Active | Switch | No | On = Active, Off = Inactive. Default: On. |

### What Happens After Submission

- A success message is shown, the dialog closes, and the table refreshes.
- The new exam type appears in lists and dropdowns where exam type is selected (e.g. when creating exams).
- Export (PDF/Excel) includes the new type if it matches the current search.

---

## Editing an Exam Type

To edit an existing exam type:

1. Find the exam type in the table.
2. Click the **Edit (pencil)** button on that row.
3. The edit dialog opens with current data filled in.
4. Change name, code, description, display order, or active status as needed.
5. Click **"Save"**.
6. A success message appears and the table refreshes.

---

## Deleting an Exam Type

To delete an exam type:

1. Click the **Delete (trash)** button on the row.
2. A confirmation dialog appears (e.g. "Are you sure you want to delete [name]? This action cannot be undone.").
3. Click **"Delete"** to confirm.
4. The exam type is removed. If exams or reports reference this type, ensure you no longer need it or update those records before deleting.

---

## Export Options

When the table has data, **Export** controls (PDF or Excel) appear in the header. The export includes: Name, Code, Description, Display Order, and Active. Only rows that match the current search are included.

---

## Tips & Best Practices

- Use **Code** for short, consistent labels (e.g. MONTHLY, FINAL) so they appear the same in reports and exports.
- Set **Display Order** so the most common types (e.g. Monthly, Final) appear first in dropdowns.
- Mark types you no longer use as **Inactive** instead of deleting them if past exams still reference them.
- Keep names and codes consistent across the school to avoid duplicate or confusing types.

---

## Related Pages

- [Settings: Academic Years](/help-center/s/settings/settings-academic-years) — Define academic years used with exams.
- [Settings: Classes](/help-center/s/settings/settings-classes) — Classes and sections used for exam enrollment and results.
- [Settings: Subjects](/help-center/s/settings/settings-subjects) — Subjects linked to exams and marks.

---

*Category: `settings` | Language: `en`*
