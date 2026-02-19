# DMS Reports

The DMS Reports page shows distribution and aging statistics for your document management system. School administrators and office staff use this page to see how incoming documents are distributed by department, how many documents exist at each security level, and how long documents stay in each pending status. The data helps balance workload, track security classification, and identify bottlenecks.

---

## Page Overview

When you open the DMS Reports page, you will see three report cards in a responsive layout. There are no separate summary cards at the top; the page is organized as three tables with export options.

### Summary Cards

This page does not have summary cards. The main content is three report tables (Incoming by Department, Security Distribution, and Pending Aging).

### Filters & Search

This page has no filters or search. The reports show current aggregate data from the DMS (incoming documents, security levels, and pending status aging). Data is loaded automatically and cached for two minutes.

---

## Report 1: Incoming by Department

The first card shows **Incoming by Department**.

### Table Columns

| Column | Description |
|--------|-------------|
| Department | The routing department name or ID that incoming documents are assigned to. Rows showing "Unassigned" are documents that have no department assigned yet. |
| Total | The number of incoming documents assigned to that department (or unassigned). |

### Export Options

- **PDF** — Export this table as a PDF report with title "Incoming by department", organization/school name, and a filter summary (e.g. "DMS Distribution Report"). Use the PDF export button next to the card title.
- **Excel** — Export the same data to Excel with a title row, column headers (Department, Total), and the current rows. Use the Excel export button next to the card title.

Exports use the data currently shown on the page. Buttons are disabled when there is no data to export.

---

## Report 2: Security Distribution

The second card shows **Security distribution**.

### Table Columns

| Column | Description |
|--------|-------------|
| Level | The security level key (e.g. Public, Internal, Confidential, Secret, Top Secret). "None" is shown when no security level is set. |
| Count | The number of documents (incoming/outgoing as applicable) at that security level. |

### Export Options

- **PDF** — Export this table as a PDF with title "Security distribution" and the same branding/summary as other DMS reports.
- **Excel** — Export to Excel with columns Level and Count. The export control on this card may appear as an icon-only button on smaller screens.

---

## Report 3: Pending Aging

The third card shows **Pending aging**.

### Table Columns

| Column | Description |
|--------|-------------|
| Status | The document status (e.g. Pending, Under review). "N/A" is used when status is not available. |
| Avg days | The average number of days documents stay in that status before moving on. Shown to one decimal place. |

### Export Options

- **PDF** — Export with title "Pending aging" and columns Status and Avg days.
- **Excel** — Export the same data with a title row and column headers.

---

## Export Options (General)

- Each report card has its own **Export** controls (PDF and Excel) in the card header.
- Exports reflect the data currently displayed (no date or filter selection on this page).
- PDF reports include report title, organization/school name, and a filter summary (e.g. "DMS Distribution Report").
- Excel exports include a title row, column headings, and the table data.
- If there is no data for a report, the export buttons for that card are disabled and an error message (e.g. "No data to export") may appear if export is attempted.

---

## Tips & Best Practices

- **Review Incoming by Department** — Use this to see which departments have the most incoming documents and to spot "Unassigned" documents that may need routing.
- **Use Security Distribution** — Helps ensure sensitive documents are correctly classified and that counts match your security policy.
- **Monitor Pending Aging** — High average days in "Pending" or "Under review" may indicate bottlenecks; consider reassigning work or clarifying workflows.
- **Export for records** — Use PDF or Excel export when you need to attach these statistics to meetings or audits.

---

## Related Pages

- [DMS Dashboard](/help-center/s/dms/dms-dashboard) — Overview of incoming/outgoing counts and pending routed documents.
- [DMS Incoming](/help-center/s/dms/dms-incoming) — Register and manage incoming documents.
- [DMS Outgoing](/help-center/s/dms/dms-outgoing) — Manage outgoing documents and letters.
- [DMS Departments](/help-center/s/dms/dms-departments) — Configure departments used in routing and in the "Incoming by Department" report.
- [DMS Settings](/help-center/s/dms/dms-settings) — Numbering and security-related settings.

---

*Category: `dms` | Language: `en`*
