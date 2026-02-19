# Exam Analytics

Exam Analytics is the overview and progress view for an exam: summary cards, enrollment status by class, and marks entry progress by subject. It is the same page as Exam Reports (Exams → Reports or sidebar → Exam Reports). Administrators and staff use it to monitor how many classes and subjects are in the exam, how enrollment is doing, and how much marks entry is complete. You can export both views to PDF or Excel.

---

## Page Overview

When you open this page (with an exam selected or from an exam’s **Reports** action), you will see:

### Summary Cards

Four cards at the top give a quick snapshot of the selected exam:

- **Total Classes** — Number of classes assigned to the exam.
- **Total Subjects** — Number of subjects in the exam (across classes).
- **Enrolled Students** — Total students enrolled in the exam.
- **Results Entered** — Number of exam results (marks) entered so far.

These cards help you see at a glance whether the exam is fully set up and how far marks entry has progressed.

### Filters & Search

- **Exam** — When the page is opened without an exam in the URL, a **Select exam** dropdown at the top lets you choose the exam. The page tries to auto-select the latest exam from the current academic year. All analytics (cards and tables) update for the selected exam.

There is no separate text search on this page; the only filter is the exam selection.

---

## Analytics Views (Tabs)

Two tabs provide the main analytics:

### Tab 1: Enrollment Status

- **What it shows:** Enrollment count and percentage by class.
- **Overall Enrollment** — Progress bar and total (e.g. 45 / 50 enrolled).
- **Table:** Class, Enrolled, Available, Percentage. Use it to see which classes are fully enrolled and which still need students.
- **Export** — PDF and Excel buttons in the card header export this table (report key: `exam_enrollment_status`).

### Tab 2: Marks Entry Progress

- **What it shows:** How many results have been entered per subject and class.
- **Overall Progress** — Progress bar and total entered vs expected.
- **Table:** Subject, Class, Entered, Total, Status (Complete or percentage). Use it to see which subjects/classes still need marks.
- **Export** — PDF and Excel export for this table (report key: `exam_marks_progress`).

---

## Data Table

Each tab has one table. See **Analytics Views (Tabs)** above for columns. There are no row actions or bulk actions; use the **Export** buttons in the card header to export the current tab’s data.

---

## Export Options

- **PDF** — From the Export (ReportExportButtons) in each tab’s card header. Generates a PDF with title, org/school, filter summary, and page numbers. Uses server-side generation with a progress dialog.
- **Excel** — Same place; exports the same data with title row and column headers. Exports match the current exam and the data shown on screen.

---

## Tips & Best Practices

- **Use the cards first** — Check Total Classes and Enrolled Students before exam day; use Results Entered to see how much marking is left.
- **Switch exams from the dropdown** — If you use the global Exam Reports entry, change the exam in the dropdown to see analytics for another exam.
- **Export what you see** — Exports reflect the selected exam and the active tab (Enrollment Status or Marks Entry Progress).
- **Permission** — You need **exams.view_reports** to access this page.

---

## Related Pages

- [Exam Reports](/help-center/s/exams/exams-reports) — Same page; focused on report types and export details.
- [Exams](/help-center/s/exams/exams) — Create and manage exams; open Reports from the exam row actions.
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter marks; progress appears in the Marks Entry Progress tab.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students; enrollment appears in the Enrollment Status tab.
- [Exam Reports Hub](/help-center/s/exams/exams-reports-hub) — Hub for consolidated and class–subject mark sheets and student reports.

---

*Category: `exams` | Language: `en`*
