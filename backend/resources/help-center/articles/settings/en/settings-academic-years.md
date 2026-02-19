# Academic Years

The Academic Years settings page lets you define and manage the academic years used across your school. School administrators use this page to create academic years (e.g. 1403–1404), set start and end dates, mark the current year, and archive or plan future years. Many features—such as class assignments, timetables, and exams—depend on having at least one active academic year and a current year set.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by academic year name or description. Type in the search box to filter the table.
- **Status** — Filter by status: All Status, Active, Archived, or Planned. Active years are in use; archived years are past; planned years are future.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Academic year name (e.g. "1403-1404"). A "Current" badge appears next to the name if this year is set as current. |
| Start Date | Start date of the academic year (displayed in your preferred calendar). |
| End Date | End date of the academic year. |
| Status | Badge: Active, Archived, or Planned. |
| Is Current | Shows "Current" badge if this is the current year, or a "Set as Current" button if you have permission to change it. |
| Actions | Edit (pencil) and Delete (trash) buttons. Delete is hidden for the current year. |

### Row Actions

When you use the actions on a row:

- **Edit (pencil)** — Opens the create/edit dialog with the year’s data so you can change name, dates, description, status, or "Is current".
- **Set as Current (star)** — Sets this academic year as the current one. Only one year can be current at a time.
- **Delete (trash)** — Opens a confirmation dialog to delete the academic year. The delete button is not shown for the year that is currently set as "Current".

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Academic Year

To add a new academic year, click the **"Add Academic Year"** button at the top of the page. A dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Name of the academic year (e.g. "1403-1404"). Max 100 characters. |
| Start Date | Date picker | Yes | First day of the academic year. |
| End Date | Date picker | Yes | Last day of the academic year. Must be after the start date. |
| Description | Textarea | No | Optional description. Max 500 characters. |
| Status | Select | No | Active, Archived, or Planned. Default: Active. |
| Is Current | Switch | No | Turn on to set this year as the current one. |

### What Happens After Submission

- If "Is current" is on, this year becomes the current academic year and any previous "current" year is unset.
- A success message is shown, the dialog closes, and the table refreshes.
- The new year is used wherever academic year is required (e.g. class assignments, timetables, exams).

---

## Editing an Academic Year

To edit an existing academic year:

1. Find the year in the table.
2. Click the **Edit (pencil)** button on that row.
3. The dialog opens with current data filled in.
4. Change name, start date, end date, description, status, or "Is current" as needed.
5. Click **"Save"**.
6. A success message appears and the table refreshes.

---

## Deleting an Academic Year

To delete an academic year:

1. Click the **Delete (trash)** button on the row. (This button is not shown for the year that is set as "Current".)
2. A confirmation dialog appears.
3. Click **"Delete"** to confirm.
4. The academic year is removed. If other data (e.g. class assignments, timetables) is linked to this year, that may affect those features; ensure you no longer need the year before deleting.

---

## Export Options

Use the **Export** controls (PDF or Excel) next to the Status filter to export the visible list. The export includes: Name, Start Date, End Date, Status, and Is Current. Only rows that match the current search and status filter are included.

---

## Tips & Best Practices

- Set one academic year as **Current** so that class assignments, timetables, and exams use the correct year by default.
- Use **Planned** for future years and **Archived** for past years so staff can still select them where needed without cluttering "active" lists.
- Keep **Start Date** and **End Date** in order (end after start); the form will show an error if end date is not after start date.
- Before deleting a year, check that no classes, timetables, or exams depend on it.

---

## Related Pages

- [Settings: Classes](/help-center/s/settings/settings-classes) — Assign classes to academic years.
- [Settings: Schedule Slots](/help-center/s/settings/settings-schedule-slots) — Define time slots; can be scoped by academic year.
- [Settings: Subjects](/help-center/s/settings/settings-subjects) — Assign subjects to classes per academic year.

---

*Category: `settings` | Language: `en`*
