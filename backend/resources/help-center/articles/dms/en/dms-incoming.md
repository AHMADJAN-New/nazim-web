# Incoming Documents

The Incoming Documents page is where you register and manage all documents received by your school—letters, circulars, and other official papers from senders. Staff use it to record received date, subject, sender details, security level, routing department, and status, and to attach scanned files. You can search, filter, view full details, edit, upload attachments, and delete records.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards at the top. The main content is the **Search & Filter** panel and the **Documents** table.

### Filters & Search

In the **Search & Filter** panel you can narrow the list by:

- **Subject** — Search by subject text (e.g. "Exam letter").
- **Sender Organization** — Search by sender organization name.
- **Status** — Filter by status: All statuses, Pending, Under review, or Completed.
- **Security Level** — Filter by security level: All levels, Public, Internal, Confidential, Secret, or Top Secret.
- **Department** — Filter by routing department: All departments, Unassigned, or a specific department.

Use **Clear Filters** to reset all filters. Changing filters resets the table to page 1.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Number | Incoming document number (e.g. IN-2025-001). Shown as a badge. |
| Subject | Document subject. Shows "No subject" if empty. |
| Description | Short text from the document description/content (truncated). |
| Sender | Sender name and sender organization (if filled). |
| External Doc | External document number and date (if any). |
| Pages | Number of pages (ضمائم). |
| Security | Security level badge (Public, Internal, Confidential, etc.). |
| Department | Routing department name, or "-" if unassigned. |
| Status | Status: Pending, Under review, or Completed. |
| Received | Received date. |
| Actions | Row actions menu (⋮). |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **View** — Opens a dialog with full document details: Basic Information (document number, received date, subject, status, security level, pages count, attachments count), Sender Information (name, organization, address), External Document Information (number, date), Description/Content (rich text), Notes, and Attachments. For each attachment you can Preview (images and PDFs) or Download.
- **Edit** — Opens the edit form with current data pre-filled. You can change any section and click **Update Document** to save.
- **Upload Files** — Opens the **Upload Scanned Images / Files** dialog. You can upload up to 10 files; images are automatically compressed (max width/height 1920px, quality 0.85, max 2 MB, JPEG). After uploading, close the dialog.
- **Delete** — Opens a confirmation dialog. Click **Confirm** to permanently delete the incoming document. This action cannot be undone.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Incoming Document

To add a new incoming document, click the **"Add Document"** button at the top of the page. A form will open with the following sections:

### Basic Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Academic Year | Select | No | Academic year for the document. Defaults to current year. |
| Received Date | Date Picker | Yes | Date the document was received. |
| Subject | Text | Yes | Short subject/title of the document. |

### Sender Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Sender Name | Text | No | Name of the sender or contact person. |
| Sender Organization | Text | No | Organization or institution that sent the document. |
| Sender Address | Text | No | Full address of the sender. |

### Document Content

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Description / Content | Rich Text Editor | No | Full description or body content of the document. |
| Pages Count | Number | No | Number of pages (ضمائم). |
| Attachments Count | Number | No | Number of physical/attached pages. Default 0. |

### Document Number

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Assign document number manually | Checkbox | No | If checked, you can enter a manual document number. |
| Manual Document Number | Text | No | Shown only if manual number is enabled (e.g. IN-2025-001). |

### Additional Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| External Document Number | Text | No | Reference number from the sender's system. |
| External Document Date | Date Picker | No | Date on the external document. |
| Security Level | Select | No | None, Public, Internal, Confidential, Secret, or Top Secret. |
| Status | Select | No | Pending, Under review, or Completed. Default Pending. |
| Routing Department | Select | No | Department to route the document to, or None. |
| Notes | Text | No | Additional notes. |

### What Happens After Submission

1. The system saves the incoming document and shows "Incoming document saved successfully."
2. The **Upload Scanned Images / Files** dialog opens so you can attach files to the new document (optional).
3. The form closes and the table refreshes. If you did not assign a manual number, the system assigns an automatic incoming document number.

---

## Editing an Incoming Document

To edit an existing incoming document:

1. Find the document in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit form opens with the current data pre-filled in all sections (Basic Information, Sender Information, Document Details, Additional Information).
4. Change any fields you need (e.g. Received Date, Subject, Status, Routing Department).
5. Click **Update Document**.
6. A success message appears, the dialog closes, and the table refreshes.

---

## Deleting an Incoming Document

To delete an incoming document:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog will appear.
3. Click **Confirm** to permanently remove the document.
4. Deleting removes the record and any associated file references. This action cannot be undone.

---

## Viewing Document Details

Click the actions menu (⋮) → **View** to open the **Document Details** dialog. It shows:

- **Basic Information** — Document number, received date, subject, status, security level, pages count, attachments count.
- **Sender Information** — Sender name, organization, address.
- **External Document Information** — External document number and date.
- **Description / Content** — Full rich-text content if entered.
- **Notes** — Plain text notes.
- **Attachments** — List of attached files. For each file you can **Preview** (images and PDFs) or **Download**. If preview is not available for the file type, a **Download** button is still shown.

Close the dialog when finished.

---

## Uploading Scanned Images / Files

After creating a document (or from the row menu **Upload Files**), the **Upload Scanned Images / Files** dialog opens. You can:

- Upload multiple files (up to 10) for this document.
- Images are automatically compressed (max 1920px, quality 0.85, max 2 MB, JPEG).
- Use this for scanned copies of the incoming letter or attachments.

Close the dialog when done. Attachments appear in the **View** dialog under Attachments.

---

## Pagination

If there are more documents than the page size, pagination appears below the table:

- **Rows per page** — Choose 10, 25, 50, or 100.
- **Previous / Next** and page numbers — Move between pages. The table shows "Showing X to Y of Z documents."

---

## Export Options

This page does not provide PDF or Excel export. Use DMS Reports for report-style exports.

---

## Tips & Best Practices

- Always fill **Subject** and **Received Date** when adding a document; they are required.
- Set **Routing Department** so documents are assigned to the right department for follow-up.
- Use **Upload Files** after creating a document to attach scanned copies; this keeps a clear record.
- Use **Status** (Pending → Under review → Completed) to track progress.
- Filter by **Department** or **Status** to find documents that need action.

---

## Related Pages

- [DMS Dashboard](/help-center/s/dms/dms-dashboard) — Summary of incoming/outgoing and pending documents
- [Outgoing Documents](/help-center/s/dms/dms-outgoing) — Manage outgoing documents and letters
- [DMS Reports](/help-center/s/dms/dms-reports) — Generate DMS reports
- [DMS Departments](/help-center/s/dms/dms-departments) — Manage routing departments

---

*Category: `dms` | Language: `en`*
