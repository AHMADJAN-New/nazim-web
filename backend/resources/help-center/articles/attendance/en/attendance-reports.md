# Attendance Reports

The Attendance Reports page lets you view and export individual attendance records. You can filter by student, class, school, status (Present, Absent, Late, Excused, Sick, Leave), and date range. The main table shows one row per record with student name, admission number, card number, class, school, status, session date and time, and entry method (manual or barcode). You can export the filtered data as PDF or Excel for reporting and record-keeping.

---

## Page Overview

When you open the Attendance Reports page, you will see:

### Summary Cards

This page does not have summary cards. The top area has the page title, description, and **PDF** / **Excel** export buttons. Below are the **Filters** panel and the **Attendance Reports** table.

### Filters & Search

All filters are in the **Filters** panel (collapsible on mobile):

- **Student** — Dropdown to filter by a specific student. Option "All Students" shows all.
- **Class** — Dropdown to filter by class. Option "All Classes" shows all.
- **School** — Dropdown to filter by school. Option "All Schools" shows all.
- **Status** — Dropdown: All Status, Present, Absent, Late, Excused, Sick, or Leave.
- **From Date** — Start of the date range (date picker).
- **To Date** — End of the date range (date picker).

**Footer:** When any filter is active, a **Reset** button appears to clear all filters (student, class, school, status, from/to dates). Page resets to 1.

---

## Data Table

The main table shows attendance records (one row per marked record). Columns:

| Column | Description |
|--------|-------------|
| Student | Student full name with admission number below. |
| Card # | Student card number or "—". |
| Class | Class name for the session. |
| School | School name or "—". |
| Status | Badge: Present (green), Absent (red), Late (amber), Excused (blue), Sick (purple), Leave (orange). |
| Date | Session date (e.g. "Jan 15, 2025") with time marked (e.g. "14:30") below. |
| Method | Badge: "manual" or "barcode" (entry method for that record). |

### Pagination

- Below the table, pagination shows current page, per-page size (e.g. 25), and total count. You can change page size and move between pages. Pagination is only shown when there is at least one record.

### Empty State

- When no records match the filters, the message "No attendance records found" (or equivalent) is shown in the table body.

### Row Actions

There are no row actions (no Edit/Delete). This page is for viewing and exporting only.

### Bulk Actions

No bulk actions are available.

---

## Export Options

- **PDF** — Button in the page header. Generates a PDF report for the **current filters** (student, class, school, status, date from/to). Uses your calendar preference and language. Requires a default school to be set; otherwise an error is shown.
- **Excel** — Button in the page header. Same as PDF but exports as Excel. Same filter and school requirements.
- **Progress** — If the report is generated asynchronously, a progress dialog appears with a progress bar and status. When ready, the file opens in a new tab or the dialog shows success/failure.
- **No records** — If there are no records to export, an error message is shown (e.g. "No records to export"). Apply different filters to get data before exporting.

---

## Tips & Best Practices

- **Narrow by date first** — Use From Date and To Date to limit the range, then filter by class or student if needed.
- **Use Status filter** — Filter by Absent, Late, or Leave to quickly see non-present records.
- **Reset when needed** — Use **Reset** in the Filters panel to clear all filters and start over.
- **Set default school** — Ensure your profile has a default school so PDF/Excel export can run.

---

## Related Pages

- [Attendance](/help-center/s/attendance/attendance) — Create and close attendance sessions.
- [Mark Attendance](/help-center/s/attendance/attendance-marking) — Record attendance for a session (manual or barcode).
- [Attendance Totals Reports](/help-center/s/attendance/attendance-reports-totals) — View totals, attendance rate, and class/room breakdowns; export Totals, Class-wise, or Room-wise.

---

*Category: `attendance` | Language: `en`*
