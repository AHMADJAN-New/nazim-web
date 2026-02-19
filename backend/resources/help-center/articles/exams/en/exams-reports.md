# Exam Reports

The Exam Reports page gives you an overview of enrollment and marks entry progress for a selected exam. School administrators and staff use it to see how many classes and subjects are assigned, how many students are enrolled, and how many results have been entered. You can export enrollment status and marks progress to PDF or Excel.

---

## Page Overview

When you open the Exam Reports page (from **Exams** → select an exam → **Reports**, or from **Exam Reports** in the sidebar), you will see:

### Summary Cards

Four summary cards at the top show key numbers for the selected exam:

- **Total Classes** — Number of classes assigned to the exam. Useful to confirm exam setup.
- **Total Subjects** — Number of subjects (across all classes) in the exam.
- **Enrolled Students** — Total students enrolled in the exam across all classes.
- **Results Entered** — Number of exam results (marks) that have been entered so far.

### Filters & Search

- **Exam** — When you open the page without an exam in the URL, a dropdown at the top lets you **Select exam**. Choose the exam whose report you want to see. The page auto-selects the latest exam from the current academic year if available.

There is no separate search box on this page; the view is driven by the selected exam.

---

## Report Types (Tabs)

The page has two tabs that show different report types:

### Tab 1: Enrollment Status

- **Purpose:** Student enrollment by class for the selected exam.
- **Overall Enrollment** — A progress bar and count (e.g. 45 / 50) showing total enrolled vs total available students.
- **Table columns:**
  - **Class** — Class name and section (e.g. "10A - Section 1").
  - **Enrolled** — Number of students enrolled in that class for the exam.
  - **Available** — Number of students available (eligible) in that class.
  - **Percentage** — Enrollment percentage for that class (badge; 100% shown as complete).
- **Export** — In the card header, **ReportExportButtons** (PDF and Excel) export the enrollment status table. The export uses the report key `exam_enrollment_status` and includes filter summary (exam name, academic year, total enrolled).

### Tab 2: Marks Entry Progress

- **Purpose:** Progress of marks entry by subject and class.
- **Overall Progress** — A progress bar and count (e.g. 120 / 150) showing total results entered vs total expected.
- **Table columns:**
  - **Subject** — Subject name.
  - **Class** — Class name.
  - **Entered** — Number of results entered for that subject–class.
  - **Total** — Total students expected (enrolled) for that subject–class.
  - **Status** — "Complete" (with checkmark) or a percentage badge for incomplete.
- **Export** — PDF and Excel export for the marks progress table. Report key: `exam_marks_progress`; includes exam name, academic year, and overall progress in the filter summary.

---

## Data Table

There are two tables (one per tab). See **Report Types (Tabs)** above for column descriptions.

### Row Actions

This page does not have row-level actions on the tables. Use the **Export** buttons in the card header of each tab to export the visible data.

### Bulk Actions

No bulk actions on this page.

---

## Export Options

- **PDF** — Available from the **ReportExportButtons** in the Enrollment Status and Marks Entry Progress card headers. Exports the current tab’s table with title, organization/school name, filter summary, and page numbers. Uses server report generation (async) with progress dialog.
- **Excel** — Same placement; exports the same data with title row, column headers, and data. Filter summary can be included. Requires `exams.view_reports` permission; export respects current exam selection and data on screen.

---

## Tips & Best Practices

- **Select the right exam** — If you opened the page from the global Exam Reports link, use the exam dropdown to switch between exams; the latest exam from the current academic year is auto-selected when possible.
- **Check both tabs** — Use Enrollment Status to ensure all classes are fully enrolled before exam day; use Marks Entry Progress to see which subjects or classes still need marks entered.
- **Export after filtering** — Exports match the data shown on screen (selected exam and current tab). Export from the tab you want (enrollment or marks progress).
- **Permission** — You need **exams.view_reports** to see this page. If you see an error or empty state, confirm your role has this permission.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Create and manage exams; open an exam and go to Reports from the row actions.
- [Exam Timetables](/help-center/s/exams/exams-timetables) — Set exam schedule and time slots.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students in an exam; enrollment numbers feed into the Enrollment Status tab.
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter marks; progress is shown in the Marks Entry Progress tab.
- [Exam Reports Hub](/help-center/s/exams/exams-reports-hub) — Central hub for consolidated mark sheets, class–subject mark sheets, and student reports.

---

*Category: `exams` | Language: `en`*
