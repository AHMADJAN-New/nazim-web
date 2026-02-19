# Letter Templates

The Letter Templates page is where you create and manage letter templates used by the DMS when issuing letters. Administrators and staff use this page to define template content, variables, letterheads, watermarks, page layout, and fonts so that letters can be generated consistently for students, staff, applicants, or external recipients. Templates can be previewed, duplicated, and set active or inactive.

---

## Page Overview

When you open the Letter Templates page, you will see:

### Summary Cards

This page does not have summary cards. The page has a header with title, description, and a **Create Template** button, followed by a filter panel and the templates table.

### Filters & Search

- **Search** — Search by template name. Type to filter the list.
- **Category** — Filter by category: All, Student, Staff, Applicant, General, Announcement.
- **Letter Type** — Filter by letter type: All Types, Application, MOE Letter, Parent Letter, Announcement, Official, Student Letter, Staff Letter, General.
- **Status** — Filter by status: All, Active, Inactive.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|---|---|
| Name | Template name. |
| Category | Category badge (student, staff, applicant, general, announcement). |
| Letter Type | Letter type badge if set; otherwise a dash. |
| Letterhead | Name of the linked letterhead, or a dash if none. |
| Layout | Page layout (e.g. A4_portrait, A4_landscape). |
| Status | Active or Inactive badge. |
| Actions | Dropdown menu with row-level actions. |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **View** — Opens a dialog showing template details: name, category, letter type, page layout, letterhead, status, and list of variables (e.g. {{variable_name}}).
- **Preview** — Opens a dialog with a live preview of the template (letterhead and variable values).
- **Edit** — Opens the edit form with the same fields as Create Template, pre-filled with the template data.
- **Duplicate** — Creates a copy of the template with name "(Copy)" appended. Success toast is shown; list refreshes.
- **Delete** — Opens a confirmation dialog. Deleting removes the template permanently. If the template is in use by any documents, it cannot be deleted.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Template

To create a new template, click the **Create Template** button at the top of the page. A large dialog opens with the template form and a live preview section.

### Basic Information

| Field | Type | Required | Description |
|---|---|---|---|
| Template Name | Text | Yes | A descriptive name (e.g. Student Enrollment Confirmation). |
| Category | Select | Yes | Student, Staff, Applicant, General, or Announcement. |
| Page Layout | Select | No | A4 Portrait or A4 Landscape. Default A4 Portrait. |
| Letter Type (Optional) | Select | No | Letter type from your configured letter types, or None. |

### Letterhead & Watermark

| Field | Type | Required | Description |
|---|---|---|---|
| Background Letterhead | Select | No | Letterhead used as full-page background. Options from active letterheads (type background or unspecified). |
| Watermark (Optional) | Select | No | Letterhead used as centered low-opacity overlay. Options from letterheads of type watermark. |
| Repeat letterhead on all pages | Switch | No | When on, letterhead repeats on every page. Default on. |

### Letter Body

| Field | Type | Required | Description |
|---|---|---|---|
| Show / Hide Preview | Button | No | Toggle to show or hide the live preview panel. |
| Use multiple text blocks | Switch | No | When on, body is split into multiple blocks (each with rich text). |
| Rich text | Switch | No | When on (and not using blocks), body uses a rich text editor. |
| Font | Select | No | Font family: Bahij Nassim, Bahij Titr, Arial, Helvetica, Times New Roman, Courier New, Georgia, Verdana, Noto Sans Arabic, Tahoma. |
| Font size | Slider (8–24 px) | No | Font size in pixels. Default 14. |
| Body Text | Textarea or Rich Text | Yes | Main letter content. Use the Available Fields selector to insert placeholders like {{student_name}}. Supports RTL. |
| Text Blocks (if enabled) | Rich text per block | No | Each block has its own editor. Add Block / Remove per block. |
| Available Fields | Card with selector | No | Insert placeholders for student, staff, applicant, and general fields into body or blocks. |

### Live Preview & Positioning

- **Actual Preview** — Server-rendered preview (same as printing). Refresh button to reload.
- **Designer** — Editor view with letterhead/watermark layers. When body and letterhead exist, **Enable Positioning** appears: drag text blocks to position them, resize with handles, and edit block properties (font size, font family, text align, color, width %, height %).
- When positioning is enabled and a block is selected, a properties panel shows: Font Size, Font Family, Text Align, Color, Width (%), Height (%).

### Options

| Field | Type | Required | Description |
|---|---|---|---|
| Include table structure | Switch | No | Enable table structure support for the template. |
| Mass template (for announcements) | Switch | No | Mark as mass template for announcements. |
| Active | Switch | No | When on, template is active and available when issuing letters. Default on. |

### What Happens After Submission

- The template is created and the dialog closes.
- A success message (e.g. "Template created successfully") appears.
- The templates list refreshes and the new template appears in the table.

---

## Editing a Template

To edit an existing template:

1. Find the template in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit dialog opens with the same form as Create, pre-filled with the template data.
4. Change any section: Basic Information, Letterhead & Watermark, Letter Body, Options, or positioning in the Designer preview.
5. Click **Update Template** (or **Create Template** in create mode).
6. A success message appears, the dialog closes, and the table refreshes.

---

## Deleting a Template

To delete a template:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears: "This action cannot be undone. This will permanently delete the template. If the template is in use by any documents, it cannot be deleted."
3. Click **Cancel** to keep the template or **Delete** to confirm.
4. On success, a success message appears and the template is removed from the list.

---

## View and Preview

- **View** — Opens a read-only dialog with template details and variable list. No edit.
- **Preview** — Opens a dialog that renders the template with letterhead and sample variable values so you can check layout and content before using it to issue letters.

---

## Export Options

This page does not offer PDF or Excel export of the template list. Use filters and the table to find templates.

---

## Tips & Best Practices

- **Set category to match use** — Choose Student, Staff, Applicant, or General so the template appears for the right recipient type when issuing letters.
- **Use the field selector** — Insert placeholders (e.g. {{student_name}}, {{father_name}}) from the Available Fields card so data is filled automatically when issuing.
- **Preview before saving** — Use Actual Preview to see how the letter will look when printed; use Designer and positioning to align blocks on the letterhead.
- **Duplicate to vary** — Use Duplicate to create a similar template (e.g. for another letter type) instead of recreating from scratch.

---

## Related Pages

- [Issue Letter](/help-center/s/dms/dms-issue-letter) — Issue letters using these templates
- [Letterheads](/help-center/s/dms/dms-letterheads) — Manage letterhead and watermark files used in templates
- [Letter Types](/help-center/s/dms/dms-letter-types) — Configure letter types available in templates
- [DMS Reports](/help-center/s/dms/dms-reports) — DMS reports and statistics

---

*Category: `dms` | Language: `en`*
