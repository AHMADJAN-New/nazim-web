# Report Templates

The Report Templates settings page lets you create and manage report templates for PDF and Excel reports. Each template defines header/footer text or HTML, logo selection (up to two logos), font size, watermark, page numbers, generation date, and table styling. Templates are scoped by school and report type (e.g. Student Report, Attendance Report, Fee Report). School administrators use this page to add, edit, preview, and delete templates and to set a default template per type.

---

## Page Overview

When you open this page, you will see a **PageHeader** (title "Report Templates", description, and **Add Template** button when permitted), then a **Card** with a filter panel and a table of templates.

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **School** — Filter templates by school. Select a school to see only templates for that school.
- **Search** — Search by template name. Type in the search box to filter the table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Template Name | Name of the report template. |
| Type | Report type (e.g. Student Report, Attendance Report, Fee Report, Exam Report, Class Report, Buildings Report, General Report). |
| School | School the template belongs to. |
| Default | Badge: "Default" if this template is the default for its type and school; otherwise empty. |
| Status | Badge: Active or Inactive. Inactive templates are not used when generating reports. |
| Actions | Preview (eye), Edit (pencil), Delete (trash). |

### Row Actions

- **Preview** — Opens a preview dialog showing how the template will look (header, footer, logos, sample content).
- **Edit** — Opens the create/edit dialog with all template fields pre-filled.
- **Delete** — Opens a confirmation dialog. Confirming removes the template.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Report Template

Click **"Add Template"** at the top. A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Template Name | Text | Yes | Display name. Max 255 characters. |
| Template Type | Select | Yes | One of: Student Report, Attendance Report, Fee Report, Exam Report, Class Report, Buildings Report, General Report. |
| School | Select | Yes | School this template belongs to (UUID). |
| Header Text | Textarea | No | Plain text for the header. |
| Header Text Position | Select | No | Above school name or Below school name. |
| Footer Text | Textarea | No | Plain text for the footer. |
| Footer Text Position | Text | No | Optional. |
| Header HTML / Footer HTML | Textarea | No | Advanced HTML for header/footer. |
| Logo selection | Group | No | Up to 2 logos: Primary, Secondary, Ministry. Checkboxes and position (left/right). |
| Show Page Numbers | Switch | No | Default On. |
| Show Generation Date | Switch | No | Default On. |
| Table Alternating Colors | Switch | No | Default On. |
| Report Font Size | Text | No | e.g. 12px. Max 10 characters. |
| Watermark | Select | No | Optional watermark from school branding. |
| Is Default | Switch | No | If On, this template is used by default for this type and school. |
| Is Active | Switch | No | Default On. |

Click **Save**. The new template appears in the table and can be used when generating reports for that school and type.

---

## Editing a Report Template

1. Find the template in the table (use School filter and Search if needed).
2. Click **Edit** (pencil) on that row.
3. Change any fields in the dialog.
4. Click **Save**.
5. The dialog closes and the table refreshes.

---

## Deleting a Report Template

1. Click **Delete** (trash) on the template row.
2. A confirmation dialog appears.
3. Click **Delete** to confirm.
4. The template is removed. Reports that used it will fall back to the default or another template.

---

## What This Setting Controls

- **Report templates** define how PDF and Excel reports look: header, footer, logos (max 2), font size, watermark, page numbers, generation date, and table alternating colors.
- Templates are **per school** and **per report type**. Each type (e.g. Student Report) can have one default template per school.
- Inactive templates are not offered when generating reports.

---

## Tips & Best Practices

- Use a clear template name (e.g. "Student Report – Main Campus") so staff can identify it.
- Set **Is Default** for the template you want used most often for that type and school.
- You can enable at most two logos per template; choose Primary + Secondary or Primary + Ministry as needed.
- Use **Preview** before saving to check header/footer and logo placement.

---

## Related Pages

- [Settings: Schools](/help-center/s/settings/settings-schools) — Manage schools; templates are scoped by school
- [Settings: Watermarks](/help-center/s/settings/settings-watermarks) — Manage watermarks used in templates (if available)
- [Reports](/help-center/s/reports/reports-student-registrations) — Generate reports; report type uses the template for that school

---

*Category: `settings` | Language: `en`*
