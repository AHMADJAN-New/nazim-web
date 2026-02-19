# Consolidated Mark Sheet

The Consolidated Mark Sheet report shows exam results for a class in one view: all subjects, marks per subject, total marks, percentage, grade, and overall result (Pass/Fail/Incomplete). Staff with exam report permission use it to print or export class-wise result sheets, compare students by rank, and see summary counts (total students, passed, failed, incomplete). You can view one class at a time or switch between classes in the “Multiple classes” tab and export all classes in one PDF/Excel.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

Summary cards appear **inside the report** after you select an exam and a class (in Single Class view). They are not at the very top of the page.

- **Total Students** — Number of students in the class with results in this exam.
- **Students Passed** — Count of students with result “Pass”.
- **Students Failed** — Count of students with result “Fail”.
- **Incomplete** — Count of students with incomplete marks (e.g. some subjects not yet entered).

### Filters & Search

- **Select Exam** — Dropdown/combobox to choose the exam. Lists all exams (with academic year in label). Defaults to the latest exam from the current academic year when possible.
- **Select Class** — Shown in the “Single Class” tab. Choose one class (and section) from the exam’s assigned classes. Required to load the consolidated report for that class.

There is no free-text search on this page. Filtering is by exam and class only.

---

## Data Table

The main table (in Single Class view, after selecting exam and class) shows:

| Column | Description |
|--------|-------------|
| Rank | Student rank by percentage (highest first). First rank has an award icon. |
| Picture | Student photo thumbnail or placeholder icon. |
| Student Name | Full name of the student. |
| Roll Number | Exam roll number for the student. |
| [Subject columns] | One column per subject in the exam for this class. Each cell shows marks obtained/total, or “Absent”, or “-” if no data. Pass/fail is shown by badge color. |
| Total Marks | Total obtained / total maximum for the student. |
| Percentage | Overall percentage. |
| Grade | Grade from the grades table (based on percentage). |
| Result | Pass (green), Fail (red), or Incomplete (outline). |

The table is paginated (e.g. 25 per page) with pagination controls at the bottom.

### Tabs

- **Single Class** — Select one exam and one class; the consolidated mark sheet for that class is shown. Export/print buttons apply to this class.
- **Multiple Classes** — After selecting an exam, all classes in that exam are listed as tabs. Click a class tab to see its consolidated mark sheet. Export buttons above let you export all classes in one go (Excel: one sheet per class; PDF: all classes with page breaks).

### Row Actions

There are no row actions on the consolidated mark sheet table.

### Bulk Actions

No bulk actions available.

---

## Export Options

- **Print** — Available via MultiSectionReportExportButtons. Generates a print-friendly version of the report (single class or all classes in Multiple Classes view).
- **PDF** — Available in Single Class view via ReportExportButtons when the report has data. Uses current filters (exam, class, academic year) and includes a filter summary.
- **Excel** — In Single Class view, ReportExportButtons can export the visible table to Excel. In Multiple Classes view, MultiSectionReportExportButtons exports all classes; each class is a separate sheet. Template type: `consolidated_mark_sheet`.

Exports respect the current selection: single class data or all classes depending on the active tab and which export control you use.

---

## Tips & Best Practices

- Ensure all marks are entered for the class before generating the consolidated report so that “Incomplete” count is accurate.
- Use **Single Class** when you need a clean sheet for one class (e.g. for parent meetings or notice board).
- Use **Multiple Classes** and the “Export all” option when you need a full exam result booklet with one section per class.
- The report sorts students by percentage (highest first); rank is computed from that order.

---

## Related Pages

- [Class–Subject Mark Sheet](/help-center/s/exams/exams-reports-class-subject) — Subject-wise marks for one class and one subject
- [Student Reports](/help-center/s/exams/exams-reports-student) — Student-wise report cards
- [Reports Hub](/help-center/s/exams/exams-reports-hub) — Central list of exam reports
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter exam marks by subject

---

*Category: `exams` | Language: `en`*
