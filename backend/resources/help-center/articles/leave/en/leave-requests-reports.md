# Leave Requests Reports

The Leave Requests Reports page lets you analyze and export leave request data. You can filter by status, student, class, school, and date range; view summary cards and tabbed tables (All, Pending, Approved, Rejected, Daily Breakdown); and generate PDF or Excel reports that respect the current filters and your calendar and language settings.

---

## Page Overview

When you open the Leave Requests Reports page, you will see:

### Summary Cards

- **Total Requests** — Total number of leave requests matching the current filters.
- **Approved** — Count of requests with status **Approved** (green).
- **Pending** — Count of requests with status **Pending** (amber).
- **Rejected** — Count of requests with status **Rejected** (rose/red).

### Filters & Search

All filters are inside the **Report Filters** panel (collapsible on mobile, expanded on desktop by default):

- **Status** — Filter by status: **All Status**, **Approved**, **Pending**, **Rejected**, or **Cancelled**.
- **Student** — Dropdown to filter by a specific student. Option **Any Student** shows all.
- **Class** — Dropdown to filter by class. Option **Any Class** shows all.
- **School** — Dropdown to filter by school. Option **Any School** shows all.
- **From** — Start date of the date range (date picker).
- **To** — End date of the date range (date picker).
- **Rows per page** — Number input (min 10, max 100) to control table pagination.

Quick filter buttons:

- **Today** — Sets **From** and **To** to today’s date.
- **This Month** — Sets **From** to the first day of the current month and **To** to the last day.
- **Reset Filters** — Clears **From** and **To** (and leaves other filters as is).

Export controls in the filter area:

- **Report type** — Select **PDF** or **Excel**.
- **Export** — Generates a report using the current filters and the selected report type (see Export Options below).

---

## Tabs and Data Tables

The page has five tabs. Each tab shows data filtered by the same global filters (status, student, class, school, date range); the tab further narrows or groups the view.

### Tab: All Requests

- **Title** — "All Leave Requests" with description "Complete listing."
- **Table columns:** Student (name + code and class below), Dates (start → end + school below), Status (badge), Reason (clamped).
- **Export** — PDF/Excel selector and **Export** button; generates a report for **all** requests matching the current filters.
- Pagination appears below the table when there are multiple pages.

### Tab: Pending

- **Title** — "Pending Requests" with description "Awaiting approval."
- **Table columns:** Student, Dates, Reason (no status column, as all are Pending).
- **Export** — Export only pending requests matching the filters.
- Empty state: "No pending requests."

### Tab: Approved

- **Title** — "Approved Requests" with description of approved leaves.
- **Table columns:** Student, Dates, Reason.
- **Export** — Export only approved requests matching the filters.
- Empty state: "No approved requests."

### Tab: Rejected

- **Title** — "Rejected Requests" with description of rejected leaves.
- **Table columns:** Student, Dates, Reason.
- **Export** — Export only rejected requests matching the filters.
- Empty state: "No rejected requests."

### Tab: Daily Breakdown

- **Title** — "Daily Breakdown" with description explaining leave counts per day.
- **Content** — List of dates (formatted using your date preference), each with:
  - Date and total number of leaves that day.
  - Badges for **Approved**, **Pending**, and **Rejected** counts for that date.
- **Export** — Generates a **daily** report (by date) in the selected PDF or Excel format. Can be run even when there are no requests (e.g. to get an empty daily report).
- Empty state: "No daily records."

Each tab (except Daily Breakdown) shows an **entries** badge with the count of rows. Loading state shows a spinner and "Loading" in the table body.

---

## Export Options

- **Report type** — Choose **PDF** or **Excel** in the filter panel or next to each tab’s Export button.
- **What gets exported** — The report includes only the data that matches the current filters (status, student, class, school, date from/to). The variant (All, Pending, Approved, Rejected, or Daily) is determined by the tab you export from.
- **School required** — Your default school must be set; otherwise you will see an error that school is required for report generation.
- **Calendar and language** — Reports use your calendar preference (e.g. Gregorian, Jalali, Qamari) and language (e.g. English, Pashto, Farsi, Arabic).
- **Progress** — When the report is generated asynchronously, a progress dialog appears with a progress bar and status. When ready, the download opens in a new tab or the dialog indicates success or failure.
- **Errors** — If there are no requests to export (for non-daily variants), you may see a message that there are no requests to export. Daily report can still be generated.

---

## Tips & Best Practices

- **Narrow with filters first** — Use Status, Student, Class, School, and date range to get the exact set of requests you need before exporting.
- **Use quick date ranges** — Use **Today** or **This Month** for quick reports, then **Reset Filters** to clear dates if you want a wider range.
- **Choose the right tab before Export** — Export from the tab that matches what you need (e.g. only Pending, or only Approved, or Daily Breakdown).
- **Set rows per page** — Increase **Rows per page** if you want to see more rows in the table before pagination (export still respects filters, not just the current page).

---

## Related Pages

- [Leave Requests](/help-center/s/leave/leave-requests) — Create and manage leave requests, approve or reject pending requests, print leave slips, and view student leave history.

---

*Category: `leave` | Language: `en`*
