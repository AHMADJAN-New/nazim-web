# Exam Papers

The Exam Papers page is where you create and manage exam paper templates for your school. Staff and teachers use it to define papers by class and subject, set duration and total marks, attach optional template files, and then add or edit questions in each paper. You can preview papers, generate PDFs, duplicate templates, and open the Template Files tab to manage HTML template files used for layout.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Tabs

- **Exam Papers** — List of exam paper templates with filters and table. Create, edit, preview, generate PDF, edit questions, duplicate, and delete.
- **Template Files** — Manage HTML template files used for exam paper layout (create, edit, delete template files).

### Filters & Search (Exam Papers tab)

- **Search** — Search by paper title. Type in the search box to filter the list.
- **School** — Filter by school. "All Schools" shows all.
- **Subject** — Filter by subject. "All Subjects" shows all.
- **Exam** — Filter by exam. "All Exams" shows all; papers not linked to an exam appear as "Generic".

---

## Data Table (Exam Papers tab)

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Title | Paper title. A "Default" badge appears if it is the default template for that exam subject. |
| Subject | Subject name (badge). |
| Exam | Exam name (badge) or "Generic" if not linked to an exam. |
| Language | Language (e.g. English, Pashto, Farsi, Arabic). |
| Duration | Duration in minutes. |
| Questions | Number of questions (items) in the paper. |
| Marks | Total marks (computed or set). |
| Status | Active or Inactive. |
| Actions | Dropdown menu (⋮) for row actions. |

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **Preview** — Opens a dialog to preview the exam paper (student or teacher view).
- **Generate PDF** — Opens a dialog to generate and download the exam paper as PDF.
- **Edit Questions** — Navigates to the paper edit page where you add, edit, reorder, or remove questions (items) in the paper.
- **Edit** — Opens the edit form for the paper template (title, subject, exam, language, duration, instructions, template file, header/footer, active, default for exam subject).
- **Duplicate** — Creates a copy of the template so you can save it as a new paper.
- **Delete** — Opens a confirmation dialog. Confirming deletes the exam paper template; the template name is shown in the message.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Exam Paper

To create a new exam paper, click the **"Create Template"** button at the top of the Exam Papers tab. A form will open with the following fields:

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| School | Select or read-only | Yes | School. Shown read-only if you have a default school. |
| Academic Year | Select | Yes | Academic year. |
| Class | Select | Yes | Class (class academic year). Depends on academic year. |
| Subject | Select | Yes | Subject (for this class). Depends on class. |
| Exam (Optional) | Select | No | Link to an exam or "Generic Template (no exam)". |
| Title | Text | Yes | e.g. "Mathematics Final Exam Paper". |
| Language | Select | Yes | English, Pashto, Farsi, or Arabic (RTL indicated). |
| Duration (minutes) | Number (1–600) | Yes | Exam duration in minutes. |
| Total Marks (optional) | Number | No | Leave blank to auto-calculate from questions. |
| Instructions | Textarea | No | Instructions for students. |
| Template File (Optional) | Select + "Manage Template Files" | No | Choose a template file for layout or "Use Default Template". Button opens Manage Template Files dialog. |
| Header HTML | Textarea | No | Custom header HTML. |
| Footer HTML | Textarea | No | Custom footer HTML. |
| Active | Switch | Yes | Whether the template is active (default On). |
| Default for Exam Subject | Switch | No | Mark as default template for this exam subject. |

### What Happens After Submission

- On success, a success message is shown, the dialog closes, and the table refreshes.
- The new paper appears in the list. Use **Edit Questions** from the row menu to add questions to the paper.

---

## Editing an Exam Paper

To edit an existing exam paper:

1. Find the paper in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit form opens with current data. School is fixed; you can change academic year, class, subject, exam, title, language, duration, total marks, instructions, template file, header/footer HTML, active, and default for exam subject.
4. Click **"Update"**.
5. On success, the dialog closes and the table refreshes.

To change the questions inside the paper, use **Edit Questions** from the row menu instead.

---

## Deleting an Exam Paper

To delete an exam paper:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears with the paper title.
3. Click **"Confirm"** (or the destructive action button) to delete the template.
4. This action cannot be undone. The paper and its question items are removed.

---

## Preview and Generate PDF

- **Preview** — From the row menu, opens a dialog to preview the paper (student or teacher view) in the browser.
- **Generate PDF** — From the row menu, opens a dialog to generate the exam paper as PDF and download it.

---

## Template Files Tab

On the **Template Files** tab you can create and manage HTML template files used for exam paper layout. These are separate from the exam paper templates; a paper template can optionally select one of these files. Use the **Manage Template Files** button inside the create/edit form to open the same manager and optionally select a file for the current paper.

---

## Export Options

When the Exam Papers tab is active and there are papers in the filtered list, **Report Export** buttons (PDF/Excel) appear at the top. Export includes the current filters and columns such as Title, Subject, Exam, Class, Language, Duration, Questions, Total Marks, and Status. The report title is "Exam Papers" and a filters summary is included.

---

## Tips & Best Practices

- Set **Academic Year** and **Class** when creating a paper so it is clearly scoped; then use **Edit Questions** to add questions from the question bank.
- Use **Default for Exam Subject** for the main template you want to use for a given exam and subject.
- Use **Duplicate** to create a new paper based on an existing one (e.g. for another class or language).
- Use the **Template Files** tab to maintain consistent layout (header, footer, styling) across papers.

---

## Related Pages

- [Question Bank](/help-center/s/exams/exams-question-bank) — Create and manage questions used in exam papers
- [Exam Paper Templates](/help-center/s/exams/exams-paper-templates) — Same page; details on templates and template files
- [Print Tracking](/help-center/s/exams/exams-papers-print-tracking) — Track print status and copies for exam papers

---

*Category: `exams` | Language: `en`*
