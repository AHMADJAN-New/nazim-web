# Issue Letter

The Issue Letter page is where you create and issue official letters from your school using pre-defined letter templates. Staff and administrators use this page to generate letters for students, staff, applicants, or external recipients, with a live preview, optional attachments, and the ability to save drafts before issuing. All issued letters are stored in the DMS and can be viewed or downloaded from the same page.

---

## Page Overview

When you open the Issue Letter page, you will see:

### Summary Cards

This page does not have summary cards. The main content is split into two tabs: **Issue Letter** (form and preview) and **All Issued Letters** (table of issued letters).

### Filters & Search

On the **Issue Letter** tab there are no filters; you select a template and fill the form. On the **All Issued Letters** tab, the following filters are available:

- **Search** — Search by subject or document number. Type to filter the list of issued letters.
- **Recipient Type** — Filter by recipient type: All Types, Student, Staff, Applicant, or External.
- **Academic Year** — Filter by academic year (or All).
- **From Date** — Filter letters issued on or after this date.
- **To Date** — Filter letters issued on or before this date.

---

## Issue Letter Tab: Form and Preview

The **Issue Letter** tab has two main areas side by side (on desktop): **Issue from Template** (left) and **Live Preview** (right).

### Issue from Template (Form)

| Field / Section | Type | Required | Description |
|---|---|---|---|
| Template | Select | Yes | Choose an active letter template. Options show template name and letter type. |
| Subject | Text | Yes | Letter subject line. |
| Recipient Type | Select | Yes | Student, Staff, Applicant, or External. Often auto-set from the template category. |
| Student Selection (if Student) | Group | Yes when Student | Academic Year (required), Class (required), then Student (required) — combobox search. |
| Staff Selection (if Staff) | Combobox | Yes when Staff | Search and select a staff member. |
| Applicant Selection (if Applicant) | Combobox | Yes when Applicant | Search and select an applicant (pending/admitted admissions). |
| External Recipient (if External) | Group | No | Name, Organization, and Address text fields. |
| Issue Date | Date Picker | Yes | Date the letter is issued. Defaults to today. Security badge shown next to it. |
| Template Variables | Inputs per variable | Depends on template | Each template variable appears as a field (text, date, or number). Required if the template marks it required. |
| Upload Attachments (button) | Button | No | Creates a draft and opens the Upload Attachments dialog so you can add files before issuing. |
| Issue Letter (button) | Button | No | Issues the letter immediately (or updates the current draft to issued). |

### Live Preview

- Shows a live preview of the letter as you select template, recipient, and fill variables.
- Preview appears when a template is selected and, for student/staff/applicant, when the recipient is selected.
- Buttons above the preview: **Refresh**, **Download PDF**, **Download Image**, **Print**.
- Document number shows as "AUTO" and security level is shown.

### What Happens After Submission

- **Upload Attachments:** Creates a draft, opens the Upload Attachments dialog. You can add images/files (images are compressed). You can then click **Issue Letter** to issue that draft.
- **Issue Letter:** The letter is saved as issued. A success message appears, the form resets, and the new letter appears in the **All Issued Letters** tab.

---

## All Issued Letters Tab: Data Table

The table shows all issued letters (status = issued) with the following columns:

| Column | Description |
|---|---|
| Document Number | Outgoing document number badge. |
| Subject | Letter subject (truncated if long). |
| Recipient | Recipient name and type badge (student, staff, applicant, external). |
| Issue Date | Formatted issue date. |
| Security | Security level badge. |
| Actions | **View** button to open the letter details panel. |

### Row Actions

- **View** — Opens a side panel (Letter Details) with Details, Preview, and Attachments tabs. No separate row dropdown; clicking the row or View opens the panel.

### Bulk Actions

No bulk actions available on this page.

---

## Letter Details Panel (Side Panel)

When you click **View** on a letter or click a row, a side panel opens with three tabs:

### Details Tab

- Document Number, Issue Date, Subject, Status, Recipient (name and type), Security Level.
- For external recipients, Address is shown if present.
- Template name if linked.
- Optional Description (HTML).
- Buttons: **Download PDF**, **Download Image**, **Print**.

### Preview Tab

- Rendered letter preview (image). Buttons to download image or print.

### Attachments Tab

- Grid of attachment cards. Each card shows thumbnail (for images), file name, size, version.
- **Preview** and **Download** per file. Clicking an image opens a full-screen preview dialog.

---

## Creating a Draft and Uploading Attachments

1. On the **Issue Letter** tab, select a template and fill required fields (subject, issue date, recipient).
2. Click **Upload Attachments**.
3. A draft is created and the Upload Attachments dialog opens.
4. Use the file uploader to add files (PDF, images; images are compressed).
5. Close the dialog when done. You can still click **Issue Letter** to issue this draft.
6. When ready, click **Issue Letter** to change the draft to issued and clear the form.

---

## Editing a Letter

Issued letters are not edited after issuance. To correct content, you would need to use a new letter or follow your organization’s policy (e.g. amendments via new document).

---

## Deleting a Letter

There is no delete action on the Issue Letter page for issued letters. Deletion (if supported) would be done from another DMS area (e.g. Outgoing or Archive) per your setup.

---

## Export Options

- **Download PDF** — From the Live Preview (Issue Letter tab) or from the Letter Details panel. Generates a PDF of the current letter.
- **Download Image** — From the same places; downloads the letter as an image (e.g. JPG).
- **Print** — Opens the system print dialog for the letter. No separate PDF/Excel list export on this page; the table is for viewing only.

---

## Tips & Best Practices

- **Select template first** — The recipient type and security level often follow the template; fill subject and date, then choose recipient so the preview generates correctly.
- **Use drafts for attachments** — If the letter must have attachments, use **Upload Attachments** to create a draft, add files, then **Issue Letter** so the issued record includes them.
- **Check the live preview** — Before issuing, confirm the preview shows the correct recipient name and variable values, especially for RTL languages.
- **Use filters on All Issued Letters** — Narrow by recipient type, academic year, or date range to find past letters quickly.

---

## Related Pages

- [Letter Templates](/help-center/s/dms/dms-templates) — Create and manage the templates used when issuing letters
- [Letterheads](/help-center/s/dms/dms-letterheads) — Manage letterhead and watermark files used in templates
- [DMS Outgoing](/help-center/s/dms/dms-outgoing) — View and manage all outgoing documents including drafts
- [DMS Reports](/help-center/s/dms/dms-reports) — DMS reports and statistics

---

*Category: `dms` | Language: `en`*
