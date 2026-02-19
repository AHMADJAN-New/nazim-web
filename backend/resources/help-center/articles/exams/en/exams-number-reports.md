# Exam Number Reports

The Exam Number Reports page lets you view and print roll numbers and secret numbers for students enrolled in an exam. Staff with roll number or secret number permissions use this page to generate roll slips for exam halls, secret labels for anonymous marking, and to export student lists with numbers. You can filter by exam and class, view summary statistics, and export to CSV or PDF/Excel.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not show summary cards at the top. Summary statistics appear inside the **Summary** tab (see below).

### Filters & Search

- **Select Exam** — Shown when you open the page from the main exams menu (without an exam in the URL). Choose the exam for which you want to view or print number reports. If you opened the page from a specific exam (e.g. from the exam’s “Number reports” link), the exam is already set.
- **Class** — Filter students by a single class or “All Classes”. Options are loaded from the exam’s assigned classes.
- **Search** — Search by student name, student code, roll number, or class name. The table and export use the filtered list.

---

## Data Table

The main content is organized in two tabs.

### Tab: Roll Number List

The table shows the following columns:

| Column | Description |
|--------|-------------|
| Roll Number | The exam roll number assigned to the student, or a “Not assigned” badge if missing. |
| Student Code | Student code or admission identifier. |
| Name | Student full name. |
| Father Name | Father’s name. |
| Class | Class name and section (e.g. “10A - Section 1”). |
| Secret Number | Shown only if you have secret number permission. Displays the secret number or a show/hide control (•••••• by default). |

### Tab: Summary

Summary section includes:

- **Roll Number Summary** — Total students, With Roll Number, Without Roll Number, and progress percentage.
- **Secret Number Summary** — Total students, With Secret Number, Without Secret Number, and progress percentage.
- **Class Breakdown** — A table per class/section with columns: Class, Total, Roll #, Secret #, and Complete (Yes/No when both roll and secret are assigned).

### Row Actions

This page does not have row-level actions. Use the filter and export/print buttons at the top.

### Bulk Actions

No bulk actions available on this page.

---

## Print and Export

### Print Roll Slips

1. Select an exam (if not already set) and optionally a class.
2. Click **Print Roll Slips**.
3. A preview dialog opens with the roll slips HTML. Review it.
4. Click **Print** to send to the printer. Printing uses a hidden iframe.

Available only if you have the “numbers print” permission.

### Print Secret Labels

1. Select an exam and optionally a class.
2. Click **Print Secret Labels**.
3. A preview dialog opens with the secret labels. Review it.
4. Click **Print** to print.

Available only if you have the “numbers print” permission.

### Export CSV

1. Select exam and optionally class.
2. Click **Export CSV**.
3. A file downloads with columns: Roll Number, Student Code, Name, Father Name, Class, Section, Secret Number (if permitted). Filename includes exam name and date.

### Export PDF / Excel

When the report has data, **ReportExportButtons** are shown. Use them to generate PDF or Excel using the same filters and the current table columns (including Secret Number only if you have secret number view permission). The export uses the filtered student list and includes a filter summary (exam, class, total students).

---

## Tips & Best Practices

- Assign roll numbers and secret numbers (via Roll Numbers and Secret Numbers pages) before generating slips or labels.
- Use the **Class** filter to print or export one class at a time for exam hall lists.
- Use the **Summary** tab to quickly see how many students still need roll or secret numbers.
- If you have both permissions, use the show/hide control in the Secret Number column to avoid exposing secret numbers on screen when not needed.

---

## Related Pages

- [Roll Numbers](/help-center/s/exams/exams-roll-numbers) — Assign and manage exam roll numbers
- [Secret Numbers](/help-center/s/exams/exams-secret-numbers) — Assign and manage exam secret numbers
- [Exams](/help-center/s/exams/exams) — Create and manage exams
- [Reports Hub](/help-center/s/exams/exams-reports-hub) — Central list of exam reports

---

*Category: `exams` | Language: `en`*
