# Outgoing Documents

The Outgoing Documents page is where you create and manage documents and letters sent by your school—certificates, official letters, and replies to external parties. Staff use it to record issue date, subject, recipient type, status, security level, and body content, and to attach files. You can filter by subject, recipient type, and status; view full details; edit; upload attachments; download a PDF (when a template is attached); and delete records.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards at the top. The main content is the **Search & Filter** panel and the **Documents** table.

### Filters & Search

In the **Search & Filter** panel you can narrow the list by:

- **Subject** — Search by subject text.
- **Recipient Type** — Filter by recipient type: All types, Student, Staff, Applicant, or External.
- **Status** — Filter by status: All statuses, Draft, Issued, or Printed.

Use **Clear Filters** to reset all filters. Changing filters resets the table to page 1.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Number | Outgoing document number (e.g. OUT-2025-001). Shown as a badge. |
| Subject | Document subject. Shows "No subject" if empty. |
| Description | Short text from the document description (truncated). |
| Recipient | Recipient type: Student, Staff, Applicant, or External. |
| External Doc | External document number and date (if any). |
| Pages | Number of pages (ضمائم). |
| Security | Security level badge (Public, Internal, Confidential, etc.). |
| Status | Status: Draft, Issued, or Printed. |
| Issued | Issue date. |
| Actions | Row actions menu (⋮). |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **View** — Opens a dialog with full document details: Basic Information (document number, issue date, subject, status, recipient type, security level, pages count, attachments count), Description/Content (rich text), Body Content (body HTML if present), and Attachments. For each attachment you can Preview (images and PDFs) or Download.
- **Download PDF** — Shown only when the document has a template attached. Generates and downloads a PDF of the letter using the template (letterhead, watermark, body text, RTL/LTR). If no template is attached, this option is not shown and a message explains that a PDF cannot be generated without a template.
- **Edit** — Opens the edit form with current data pre-filled. You can change any section and click **Save Changes** to save.
- **Upload Files** — Opens the **Upload Attachments / Files** dialog. You can upload up to 10 files; images are automatically compressed (max 1920px, quality 0.85, max 2 MB, JPEG). Close the dialog when done.
- **Delete** — Opens a confirmation dialog. Click **Confirm** (or **Delete**) to permanently delete the outgoing document. This action cannot be undone.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Outgoing Document

To add a new outgoing document, click the **"Add Document"** button at the top of the page. A form will open with the following sections:

### Basic Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Academic Year | Select | No | Academic year for the document. Defaults to current year. |
| Issue Date | Date Picker | Yes | Date the document was or will be issued. |
| Subject | Text | Yes | Subject/title of the document or letter. |
| Recipient Type | Select | No | Student, Staff, Applicant, or External. Default External. |
| Status | Select | No | Draft, Issued, or Printed. Default Draft. |

### Document Content

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Description / Content | Rich Text Editor | No | Short description or summary of the document. |
| Body HTML | Rich Text Editor | No | Main body content of the letter (e.g. for PDF generation). |
| Pages Count (ضمائم) | Number | No | Number of pages. |
| Attachments Count | Number | No | Number of attachments. Default 0. |

### Document Numbering

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Use manual document number | Checkbox | No | If checked, you can enter a manual outgoing document number. |
| Manual Document Number | Text | No | Shown only if manual number is enabled (e.g. OUT-2025-001). |

### Additional Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| External Document Number | Text | No | External reference number. |
| External Document Date | Date Picker | No | Date on external reference. |
| Security Level | Select | No | None, Public, Internal, Confidential, Secret, or Top Secret. |
| Notes | Text | No | Additional notes. |

### What Happens After Submission

1. The system saves the outgoing document and shows "Outgoing document saved successfully."
2. The **Upload Attachments / Files** dialog opens so you can attach files to the new document (optional).
3. The form closes and the table refreshes. If you did not assign a manual number, the system may assign an automatic outgoing document number.

---

## Editing an Outgoing Document

To edit an existing outgoing document:

1. Find the document in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit form opens with the current data pre-filled (Basic Information, Document Content, Document Numbering, Additional Information).
4. Change any fields (e.g. Issue Date, Subject, Recipient Type, Status, Body HTML).
5. Click **Save Changes**.
6. A success message appears, the dialog closes, and the table refreshes.

---

## Deleting an Outgoing Document

To delete an outgoing document:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog will appear asking if you are sure you want to delete the document.
3. Click **Confirm** (or **Delete**) to permanently remove the document.
4. This action cannot be undone. Associated attachments are no longer linked to the document.

---

## Viewing Document Details

Click the actions menu (⋮) → **View** to open the **Document Details** dialog. It shows:

- **Basic Information** — Document number, issue date, subject, status, recipient type, security level, pages count, attachments count.
- **Description / Content** — Rich-text description if entered.
- **Body Content** — Body HTML (main letter content) if entered.
- **Attachments** — List of attached files with **Preview** (images and PDFs) or **Download**.

Close the dialog when finished.

---

## Uploading Attachments / Files

After creating a document (or from the row menu **Upload Files**), the **Upload Attachments / Files** dialog opens. You can:

- Upload up to 10 files for this document.
- Images are automatically compressed (max 1920px, quality 0.85, max 2 MB, JPEG).
- Use this for supporting documents or scanned copies attached to the outgoing letter.

Close the dialog when done. Attachments appear in the **View** dialog.

---

## Downloading a PDF

For documents that have a **template** attached (e.g. from Issue Letter or template assignment):

1. Click the actions menu (⋮) → **Download PDF**.
2. The system generates a PDF using the template’s letterhead, watermark (if any), and body text, respecting RTL/LTR language direction.
3. The file downloads with a name based on the document number (e.g. OUT-2025-001.pdf).

If the document has no template attached, the **Download PDF** option is not shown in the menu. Attach a template (e.g. via Issue Letter or document edit) to enable PDF generation.

---

## Pagination

If there are more documents than the page size, pagination appears below the table:

- **Rows per page** — Choose 10, 25, 50, or 100.
- **Previous / Next** and page numbers — Move between pages. The table shows "Showing X to Y of Z documents."

---

## Export Options

- **Download PDF** (per row) — Available in the row actions when the document has a template. One PDF per document. Filters do not change the PDF content; they only filter which rows are visible in the table.
- This page does not provide a bulk Excel or PDF list export. Use DMS Reports for report-style exports.

---

## Tips & Best Practices

- Always fill **Subject** and **Issue Date**; they are required.
- Use **Recipient Type** (Student, Staff, Applicant, External) so you can filter and report by audience.
- Use **Status** (Draft → Issued → Printed) to track progress from preparation to printing.
- To get **Download PDF** in the row menu, ensure the document is linked to a template (e.g. via Issue Letter).
- Upload attachments after creating the document so the record is complete for filing.

---

## Related Pages

- [DMS Dashboard](/help-center/s/dms/dms-dashboard) — Summary of incoming/outgoing and pending documents
- [Incoming Documents](/help-center/s/dms/dms-incoming) — Manage incoming documents
- [Issue Letter](/help-center/s/dms/dms-issue-letter) — Create letters from templates (links document to template for PDF)
- [DMS Templates](/help-center/s/dms/dms-templates) — Manage letter templates
- [DMS Reports](/help-center/s/dms/dms-reports) — Generate DMS reports

---

*Category: `dms` | Language: `en`*
