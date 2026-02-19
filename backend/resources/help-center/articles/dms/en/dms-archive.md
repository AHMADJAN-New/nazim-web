# Archive & Search

The Archive & Search page is where you search and browse all incoming and outgoing documents in the Document Management System (DMS). School administrators and staff use it to find documents by number, subject, sender, date range, status, security level, or academic year. Results are shown in two tabs—Incoming Documents and Outgoing Documents—with pagination and optional PDF or Excel export per tab. You can open a document to view its full details in a read-only dialog; this page does not create, edit, or delete documents.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

- **Total Documents** — The combined count of all documents in the archive (incoming + outgoing). Subtitle: "All documents in archive".
- **Incoming Documents** — The total number of incoming documents. Subtitle: "Received documents".
- **Outgoing Documents** — The total number of outgoing documents. Subtitle: "Issued documents".

### Filters & Search

All filters live in a **Search & Filter** panel. You set your criteria, then click **"Apply Filters"** to run the search. **"Clear All"** resets search and all filters.

- **Search** — Full-text search. Placeholder: "Search by document number, subject, sender, description, external doc number...". The search runs when you click Apply Filters (or press Enter in the search field).
- **Status** — Dropdown: All Statuses, Pending, Under review, Completed, Draft, Issued, Printed.
- **Security Level** — Dropdown: All Levels, None, Public, Internal, Confidential, Secret, Top Secret.
- **Academic Year** — Dropdown: All years, or a specific academic year from your organization (current year can be marked).
- **From Date** — Date picker; only documents on or after this date are included.
- **To Date** — Date picker; only documents on or before this date are included.

---

## Data Table

Results are shown in **tabs**. Switch between **Incoming Documents** and **Outgoing Documents**. Each tab has its own table and pagination. Export (PDF/Excel) is available per tab and uses the current tab’s filtered results.

### Incoming Documents Tab

| Column | Description |
|--------|-------------|
| Document Number | Incoming document number (badge). |
| Subject | Subject line; if missing, "No subject". A short description may appear below in smaller text. |
| Sender | Sender name and/or organization; "N/A" if both missing. |
| Date | Received date (formatted). |
| Status | Badge (e.g. pending, under_review, completed). |
| Security | Security level badge. |
| View | Button to open the document details dialog. |

### Outgoing Documents Tab

| Column | Description |
|--------|-------------|
| Document Number | Outgoing document number (badge). |
| Subject | Subject line; "No subject" if missing. Short description may appear below. |
| Recipient | Recipient type (e.g. student, parent). |
| Date | Issue date (formatted). |
| Status | Badge (e.g. draft, issued, printed). |
| Security | Security level badge. |
| View | Button to open the document details dialog. |

### Row Actions

- **View** — Opens a read-only dialog with full document details (see "Viewing Document Details" below). There is no Edit or Delete on this page.

### Bulk Actions

No bulk actions available on this page.

---

## Viewing Document Details

Click **View** on any row to open the document details dialog.

- **Document Number** — Full incoming or outgoing document number.
- **Subject** — Subject or "N/A".
- **Date** — Received date (incoming) or issue date (outgoing), formatted.
- **Status** — Document status badge.
- **Security Level** — Security badge.
- **Sender Name / Sender Organization / Sender Address** — (Incoming only.) Shown when available.
- **Recipient Type** — (Outgoing only.) Shown when available.
- **External Document Number / External Document Date** — Shown when present.
- **Pages** — Page count when present.
- **Attachments** — Attachment count when present.
- **Description** — Full description (may include HTML), when present.
- **Notes** — Notes text, when present.

The dialog is read-only; you cannot edit or delete from here. Close the dialog to return to the table.

---

## Pagination

- Each tab has its own pagination. Below the table you see text like "Showing {from} to {to} of {total} documents" and "Page {current} of {total}" when there is more than one page.
- Use **Previous**, page numbers, and **Next** to move between pages. Page size is the application default.

---

## Export Options

- **Incoming tab** — PDF and Excel export buttons appear when the Incoming tab is active. Export includes the current filtered incoming results. Columns: Document Number, Subject, Sender Name, Sender Organization, Received Date, Status, Security Level, External Doc Number, Pages. Report key: `dms_archive_incoming`. Title: "DMS Archive - Incoming Documents". A filter summary is included.
- **Outgoing tab** — PDF and Excel export when the Outgoing tab is active. Columns: Document Number, Subject, Recipient Type, Issue Date, Status, Security Level, External Doc Number, Pages. Report key: `dms_archive_outgoing`. Title: "DMS Archive - Outgoing Documents". Filter summary included.
- Exports respect the current filters and search (applied via "Apply Filters").

---

## Tips & Best Practices

- **Apply filters after changing criteria** — Change search or any filter, then click **Apply Filters** (or Enter in search) so results update. Clearing with **Clear All** resets everything and you can re-apply.
- **Use date range for reports** — Narrow results with From Date and To Date when you need documents for a specific period or academic term.
- **Use the right tab** — Incoming shows received documents; Outgoing shows issued letters. Switch tabs to export or view the correct set.

---

## Related Pages

- [DMS Incoming](/help-center/s/dms/dms-incoming) — Register and route incoming documents; they then appear in the archive.
- [DMS Outgoing](/help-center/s/dms/dms-outgoing) — View and manage issued letters; they appear in the archive.
- [DMS Reports](/help-center/s/dms/dms-reports) — Distribution and security reports.
- [DMS Dashboard](/help-center/s/dms/dms-dashboard) — DMS overview and quick links.

---

*Category: `dms` | Language: `en`*
