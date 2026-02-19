# Letterheads

The Letterheads page is where you upload and manage letterhead files (images, PDFs, or HTML) used as backgrounds or watermarks in letter templates. Administrators and staff use this page to add school letterheads, logos, or watermarks so they appear consistently when issuing letters. Letterheads can be filtered by name, letter type, file type, and status, and each can be viewed, previewed, downloaded, edited, or deleted.

---

## Page Overview

When you open the Letterheads page, you will see:

### Summary Cards

This page does not have summary cards. The page has a header with title, description, and an **Upload Letterhead** button, followed by a filter panel and the letterheads table.

### Filters & Search

- **Search** — Search by letterhead name. Type to filter the list.
- **Letter Type** — Filter by letter type: All Types, Application, MOE Letter, Parent Letter, Announcement, Official, Student Letter, Staff Letter, General.
- **File Type** — Filter by file type: All Types, PDF, Image, HTML.
- **Status** — Filter by status: All, Active, Inactive.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|---|---|
| Name | Letterhead name. |
| File Type | Badge showing file type (e.g. PDF, IMAGE, HTML). |
| Letter Type | Letter type badge if set; otherwise a dash. |
| Position | Position (e.g. header, background). Shown in lowercase, capitalized in display. |
| Layout | Default-for-layout value if set; otherwise a dash. |
| Status | Active or Inactive badge. |
| Actions | Dropdown menu with row-level actions. |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **View** — Opens a dialog with letterhead details: name, file type, letter type, position, default layout, status. For image file types, a preview image is shown if available.
- **Preview** — Opens a dialog showing the letterhead as it will appear in documents. For HTML letterheads, the preview is loaded from the server (iframe). For image/PDF, the preview uses the letterhead image or file URL. If preview is not available, a message and Download button are shown.
- **Download** — Downloads the letterhead file (e.g. PDF or image). Success or error toast is shown.
- **Edit** — Opens the edit form with the same fields as Create Letterhead, pre-filled with the letterhead data.
- **Delete** — Opens a confirmation dialog. Deleting removes the letterhead permanently. If the letterhead is in use by any templates or documents, it cannot be deleted.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Letterhead

To create a new letterhead, click the **Upload Letterhead** button at the top of the page. A dialog opens with the letterhead form.

### Form Fields

| Field | Type | Required | Description |
|---|---|---|---|
| Name | Text | Yes | A descriptive name (e.g. Main Portrait Letterhead). |
| File | File upload | Yes (on create) | Upload a file. Accepted: PDF, JPG, JPEG, PNG, WEBP. Max 10MB. Click or drag to upload. On edit, file is optional (keep existing). |
| Letterhead Type | Radio | Yes | **Background** — Full-page background that appears on all pages. **Watermark** — Centered overlay with low opacity behind text. |
| File Type | Select | No | Image, PDF, or HTML. Auto-set from uploaded file MIME type on create; can be changed. |
| Letter Type (Optional) | Select | No | Letter type from your configured letter types, or None. |
| Active | Switch | No | When on, letterhead is active and available in templates. Default on. |

### What Happens After Submission

- The letterhead is created and the dialog closes.
- A success message (e.g. "Letterhead created successfully") appears.
- The letterheads list refreshes and the new letterhead appears in the table.

---

## Editing a Letterhead

To edit an existing letterhead:

1. Find the letterhead in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit dialog opens with the same form as Create, pre-filled with the letterhead data. You can change name, re-upload file (optional), letterhead type, file type, letter type, and active status.
4. Click **Update** (or **Create** in create mode).
5. A success message appears, the dialog closes, and the table refreshes.

---

## Deleting a Letterhead

To delete a letterhead:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears: "This action cannot be undone. This will permanently delete the letterhead. If the letterhead is in use by any templates or documents, it cannot be deleted."
3. Click **Cancel** to keep the letterhead or **Delete** to confirm.
4. On success, a success message appears and the letterhead is removed from the list.

---

## View and Preview

- **View** — Read-only details and, for image type, a preview image when available.
- **Preview** — Full preview of the letterhead (HTML in iframe, or image). If preview is not available, you can use Download to get the file.

---

## Export Options

This page does not offer PDF or Excel export of the letterheads list. Use filters and the table to find letterheads. Individual letterheads can be downloaded via the **Download** row action.

---

## Tips & Best Practices

- **Use Background for full-page letterheads** — Choose Background when the file is a full page design (e.g. school letterhead with logo and borders). Use Watermark for a subtle overlay (e.g. "CONFIDENTIAL" or logo in the center).
- **Keep file size reasonable** — Images are often compressed on upload; for best quality and speed, use clear images or PDFs under the size limit.
- **Name clearly** — Use names like "Main A4 Letterhead" or "MOE Watermark" so staff can find the right letterhead when editing templates.
- **Set letter type when relevant** — Assigning a letter type helps filter letterheads in templates and keeps letter-specific designs organized.

---

## Related Pages

- [Letter Templates](/help-center/s/dms/dms-templates) — Attach letterheads and watermarks to templates
- [Issue Letter](/help-center/s/dms/dms-issue-letter) — Issue letters that use these letterheads
- [Letter Types](/help-center/s/dms/dms-letter-types) — Configure letter types used by letterheads
- [DMS Settings](/help-center/s/dms/dms-settings) — DMS configuration

---

*Category: `dms` | Language: `en`*
