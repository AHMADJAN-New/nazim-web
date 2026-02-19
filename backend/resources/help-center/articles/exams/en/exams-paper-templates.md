# Exam Paper Templates

The Exam Paper Templates page (Exam Papers) lets you manage exam paper templates and the HTML template files used to render them. You create templates by school, class, and subject; set language, duration, and optional total marks; and optionally attach a template file for layout. The page has two tabs: one for the list of paper templates (with filters, table, create/edit, row actions, and export) and one for managing template files.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Tabs

- **Exam Papers** — List of exam paper templates. Filters, table, Create Template, Export, and row actions (Preview, Generate PDF, Edit Questions, Edit, Duplicate, Delete).
- **Template Files** — Manage HTML template files (create, edit, delete) used as layout for exam papers.

### Filters & Search (Exam Papers tab)

- **Search** — Search by paper title.
- **School** — Filter by school (All Schools or a specific school).
- **Subject** — Filter by subject (All Subjects or a specific subject).
- **Exam** — Filter by exam (All Exams or a specific exam). Papers with no exam show as "Generic".

---

## Data Table (Exam Papers tab)

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Title | Paper template title. "Default" badge if it is the default for that exam subject. |
| Subject | Subject (badge). |
| Exam | Exam name (badge) or "Generic". |
| Language | Language (English, Pashto, Farsi, Arabic). |
| Duration | Duration in minutes. |
| Questions | Number of questions/items in the paper. |
| Marks | Total marks (computed or set). |
| Status | Active or Inactive. |
| Actions | Dropdown menu (⋮) for row actions. |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **Preview** — Opens a dialog to preview the exam paper.
- **Generate PDF** — Opens a dialog to generate and download the paper as PDF.
- **Edit Questions** — Navigates to the paper edit page to add, edit, reorder, or remove questions in the paper.
- **Edit** — Opens the edit form for the template (metadata, language, duration, instructions, template file, header/footer, active, default).
- **Duplicate** — Creates a copy of the template as a new paper.
- **Delete** — Opens a confirmation dialog; confirming deletes the template.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Template

To create a new exam paper template, click **"Create Template"** in the Exam Papers tab. A form opens with:

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| School | Select or read-only | Yes | School (read-only if default school). |
| Academic Year | Select | Yes | Academic year. |
| Class | Select | Yes | Class (class academic year). |
| Subject | Select | Yes | Subject for the class. |
| Exam (Optional) | Select | No | Exam or "Generic Template (no exam)". |
| Title | Text | Yes | Template title. |
| Language | Select | Yes | English, Pashto, Farsi, or Arabic. |
| Duration (minutes) | Number | Yes | 1–600. |
| Total Marks (optional) | Number | No | Optional; otherwise auto-calculated from questions. |
| Instructions | Textarea | No | Instructions for students. |
| Template File (Optional) | Select + Manage Template Files | No | Choose a template file or use default. |
| Header HTML | Textarea | No | Custom header HTML. |
| Footer HTML | Textarea | No | Custom footer HTML. |
| Active | Switch | Yes | Default On. |
| Default for Exam Subject | Switch | No | Mark as default for this exam subject. |

### What Happens After Submission

On success, the dialog closes and the table refreshes. Use **Edit Questions** from the row menu to add questions to the new template.

---

## Editing a Template

1. In the table, click the actions menu (⋮) → **Edit**.
2. Update the fields in the form.
3. Click **"Update"**. The dialog closes and the table refreshes.

To change the questions in the paper, use **Edit Questions** from the row menu.

---

## Deleting a Template

1. Click the actions menu (⋮) → **Delete**.
2. Confirm in the dialog. The template and its items are deleted; this cannot be undone.

---

## Template Files Tab

The **Template Files** tab shows a manager for HTML template files. You can create, edit, and delete template files. Each file has a name, language, and content. When creating or editing an exam paper template, the **Manage Template Files** button in the form opens the same manager in a dialog so you can pick a template file for that paper. Selecting a file in the dialog sets it on the form and closes the dialog.

---

## Export Options

When there are paper templates in the filtered list, **Report Export** buttons (PDF and Excel) appear at the top of the Exam Papers tab. Export uses the current filters and includes columns such as Title, Subject, Exam, Class, Language, Duration, Questions, Total Marks, and Status. The report title is "Exam Papers" and a filters summary is included.

---

## Tips & Best Practices

- Use one template file per language (e.g. Pashto, Arabic) so all papers in that language share the same layout.
- Set **Default for Exam Subject** on the template you use most for each exam and subject.
- Use **Duplicate** to create variants (e.g. different instructions or duration) without re-entering all fields.
- After creating a template, always open **Edit Questions** to add questions from the question bank.

---

## Related Pages

- [Question Bank](/help-center/s/exams/exams-question-bank) — Create questions used in paper templates
- [Exam Papers](/help-center/s/exams/exams-papers) — Same page; list and create/edit exam papers
- [Print Tracking](/help-center/s/exams/exams-papers-print-tracking) — Track print status for exam papers

---

*Category: `exams` | Language: `en`*
