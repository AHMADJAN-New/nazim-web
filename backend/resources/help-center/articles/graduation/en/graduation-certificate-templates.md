# Graduation Certificate Templates

The Certificate Templates page is where you create and manage graduation certificate templates used when issuing certificates from a graduation batch. School administrators and staff use this page to add templates (title, school, description, page size, RTL, active status), optionally set body HTML for backward compatibility, and use the Layout Editor to position and style certificate elements (e.g. student name, date, logo) with drag-and-drop. Each template can be assigned to a specific school or left as a general template for all schools.

---

## Page Overview

When you open the Certificate Templates page, you will see:

### Data Table

The main table lists all graduation certificate templates with these columns:

| Column | Description |
|--------|-------------|
| Title | Template name/title. |
| School | The school this template is assigned to, or "All Schools" if no school is set (general template). |
| Background | "Yes" (with icon) if a background image is set; "None" otherwise. |
| Status | Badge: Active or Inactive. |
| Created | Creation date of the template. |
| Actions | Edit Layout (layout icon) if the template has a layout config; Delete (trash icon). |

### Row Actions

- **Edit Layout** — Opens the Layout Editor dialog for this template. You can drag and position elements, set fonts and styles, and save the layout. Only shown when the template has a layout config.
- **Delete** — Opens a confirmation dialog. Confirming permanently deletes the template. This action cannot be undone.

---

## Creating a New Template

Below the table, a **Create** card contains a form. Fill in the fields and click **Save**.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | Text | Yes | Display name of the template (e.g. "Graduation Certificate 1403"). |
| School (Optional) | Select | No | Assign the template to a specific school, or choose "None (General Template)" for use across all schools. |
| Description | Textarea | No | Short description of the template (e.g. purpose or year). |
| Body HTML (Optional) | Textarea | No | Legacy HTML with placeholders like `{{student_name}}`. The note says to use the Layout Editor for drag-and-drop positioning. |
| Page Size | Select | No | A4 or A5. Default A4. |
| RTL | Switch | No | Right-to-left layout. Default on (true). |
| Active | Switch | No | Whether the template is active and available when issuing certificates. Default on. |

### What Happens After Submission

- The template is created and appears in the table. You can then open **Edit Layout** (after the template has a layout config) to design the certificate layout. Creating a template does not automatically open the Layout Editor; use Edit Layout on the new row to customize layout and background if needed.

---

## Editing a Template (Layout Editor)

1. Find the template in the table.
2. Click **Edit Layout** (layout icon) in the Actions column. The Layout Editor dialog opens.
3. The editor shows the certificate with the current layout and optional background image. You can drag elements to reposition them and change styling (fonts, sizes, alignment).
4. Click **Save** in the editor to save the layout; the dialog closes and the template is updated.
5. Click **Cancel** or close the dialog to leave without saving.

Templates with a saved layout config show "Edit Layout"; those without may only show Delete until a layout is saved (e.g. from another flow that creates layout config).

---

## Deleting a Template

1. Click the **Delete** (trash) button for the template in the Actions column.
2. A confirmation dialog appears: "Are you sure you want to delete this certificate template? This action cannot be undone."
3. Click **Cancel** to keep the template, or **Delete** to permanently remove it.

Deleting a template does not delete certificates already issued using that template; it only removes the template from future use.

---

## Export Options

This page does not provide PDF or Excel export. Use the Graduation Batches page to export batch data. Certificate templates are configuration only.

---

## Tips & Best Practices

- **Use a clear title** — Include school name or year (e.g. "Graduation 1403 - Main School") so staff can easily choose the right template when issuing.
- **Assign school when needed** — Use "School (Optional)" to restrict a template to one school, or leave as "All Schools" for a shared template.
- **Use the Layout Editor** — Prefer the Layout Editor over raw Body HTML for consistent, visual design and placeholders.
- **Set Active/Inactive** — Turn off old templates (Inactive) instead of deleting them if you might need to reissue or reference them later.
- **RTL for Pashto/Arabic** — Keep RTL on for certificates that will display names and text in right-to-left languages.

---

## Related Pages

- [Graduation Dashboard](/help-center/s/graduation/graduation) — Quick link to "View Templates" and graduation overview
- [Graduation Batches](/help-center/s/graduation/graduation-batches) — Create batches and issue certificates; certificate issuance uses templates from this page

---

*Category: `graduation` | Language: `en`*
