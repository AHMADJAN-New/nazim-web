# Certificate Templates (Course)

The Certificate Templates page is used to create and manage **course completion certificate templates** for short-term courses. School staff use these templates when issuing certificates to students who complete a course. You can define the layout, background image, font, text color, and which fields appear (e.g. student name, father name, course name, certificate number, date). One template can be set as the default and templates can be linked to a specific course or left as general use.

---

## Page Overview

When you open the Certificate Templates (course) page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

This page does not have filters or search. All templates for your organization are listed.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|--------------|
| Template Name | Name of the template. A "Default" badge appears if this template is the default for course certificates. |
| Description | Short description of the template, or "–" if none. |
| Background | "Yes" if a background image is set; "None" if not. |
| Status | Badge: "Active" or "Inactive". Inactive templates are not used when generating certificates. |
| Created | Date the template was created. |
| Actions | Buttons: Set as Default (star), Edit Layout, Edit (pencil), Delete (trash). |

### Row Actions

When you use the action buttons on any row:

- **Set as Default (star)** — Makes this template the default for course certificates. Only one template can be default; the button is hidden if this template is already default.
- **Edit Layout** — Opens the Layout Editor so you can drag and position fields (header, student name, father name, course name, certificate number, date) on the certificate and adjust styling.
- **Edit (pencil)** — Opens the create/edit dialog with the template’s current name, course, background, description, layout settings, default flag, and active status.
- **Delete (trash)** — Opens a confirmation dialog. Confirming permanently deletes the template.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Template

To create a new course certificate template, click the **"Create Template"** button at the top of the page. A dialog will open with the following:

### Main Fields

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| Template Name | Text | Yes | A unique name (e.g. "Course Completion Certificate"). |
| Course (Optional) | Dropdown | No | Assign this template to a specific short-term course, or "None (General Template)" for general use. |
| Background Image | File upload | No | Image file (e.g. PNG, JPG). Used as the certificate background. |
| Description | Textarea | No | Optional description of the template. |

### Layout Settings

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| Font Size | Number | No | Font size for certificate text (default 24). |
| Font Family | Select | No | Roboto (Default), Arial, Bahij Nassim (RTL Support), Times New Roman, Courier New, Helvetica, Tahoma. Bahij Nassim is recommended for Pashto/Arabic/Farsi. |
| Text Color | Color picker | No | Color for certificate text (default black). |
| Right-to-Left (RTL) | Switch | No | Enable for Pashto/Arabic. Default is on. |

### Options

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| Set as Default | Switch | No | When on, this template becomes the default for course certificates. |
| Active | Switch | No | When on, the template can be used when generating certificates. Default is on. |

### What Happens After Submission

- The template is saved and the table refreshes.
- If "Set as Default" was on, this template is used by default when issuing course certificates.
- You can then use **Edit Layout** to fine-tune positions of fields on the certificate.

---

## Editing a Template

To edit an existing template:

1. Find the template in the table.
2. Click the **Edit (pencil)** button.
3. The dialog opens with current name, course, description, layout settings, default, and active status. The current background image is kept unless you upload a new file.
4. Change any fields.
5. Click **"Save Template"**.
6. A success message appears and the table refreshes.

To change only the layout (positions of text and elements), use **Edit Layout** instead, then save from the Layout Editor.

---

## Deleting a Template

To delete a template:

1. Click the **Delete (trash)** button on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this certificate template? This action cannot be undone."
3. Click **"Delete"** to remove the template permanently, or **"Cancel"** to keep it.
4. If you delete the default template, another template should be set as default from the table.

---

## Layout Editor

The **Edit Layout** action opens a full-screen Layout Editor:

- **Background** — Your template’s background image is shown (if set) so you can place fields accurately.
- **Draggable elements** — Header, student name, father name, course name, certificate number, and date can be dragged to position them (positions are stored as percentages).
- **Save / Cancel** — Save updates the template layout; Cancel closes without saving.

Use the Layout Editor after creating a template to get the exact look you want for course completion certificates.

---

## Export Options

This page does not provide PDF or Excel export. It is for managing templates only.

---

## Tips & Best Practices

- **Use one default template** — Set a single, well-tested template as default so course certificates look consistent.
- **Use Bahij Nassim for RTL** — For Pashto, Arabic, or Farsi text, choose "Bahij Nassim (RTL Support)" in Font Family.
- **Assign to a course when needed** — Link a template to a specific course if that course should always use it; use "None" for a template shared across courses.
- **Upload a clear background** — Use a high-resolution image so the certificate prints clearly.
- **Preview before issuing** — After editing layout, generate a test certificate from the Course Students or course certificates flow to confirm the result.

---

## Related Pages

- [Certificates Templates (Graduation)](/help-center/s/certificates/certificates-templates) — Manage graduation certificate templates.
- [Certificates Issued](/help-center/s/certificates/certificates-issued) — View and manage issued graduation certificates.
- [Short-term Courses](/help-center/s/courses/short-term-courses) — Manage courses; course certificates use these templates.

---

*Category: `certificates` | Language: `en`*
