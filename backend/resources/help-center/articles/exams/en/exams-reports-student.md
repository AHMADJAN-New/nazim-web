# Student Reports (Exam Report Cards)

The Student Reports page lets you view and print **student-wise exam report cards** for one or more students. Staff with student read permission use it to generate report cards showing each student’s subjects, marks obtained, total marks, percentage, grade, and overall result (Pass/Fail). You choose an exam, then a class, then one or more students from that class (enrolled in the exam). You can print the current view or export selected students’ report cards to PDF/Excel. There is no create, edit, or delete on this page—only viewing and exporting existing exam data.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards at the top. Each selected student’s report is shown as a full report card (see Data Table / Report Card below).

### Filters & Search

- **Select Exam** — Combobox to choose the exam. Lists all exams with academic year in the label. Defaults to the latest exam from the current academic year when available.
- **Class** — Combobox to choose one class (and section) from the exam’s classes. Required before the student list is shown. Only students enrolled in the selected exam and in this class appear.
- **Select Student** — A list of students (from the selected exam and class) with checkboxes. You can select one or more students. A “Select All” / “Deselect All” button toggles all students. Student options show name and may include roll number and secret number in the label for search. Below the list, the number of selected students is shown.

There is no separate search box; the student combobox/list is searchable by the labels (name, roll, secret).

---

## Data Table / Report Card

There is no traditional data table. For each selected student, a **report card** (GradeCard) is shown with:

### Report Card Sections

1. **Header** — Title “Student Report Card” and badges: Exam name, Class (and section), Academic year.
2. **Student Information** — Student photo (or placeholder), Full name, Roll number, Father name, Date of birth, Admission number.
3. **Academic Performance** — A table with columns:
   - **#** — Row number.
   - **Subject Name** — Name of each subject in the exam.
   - **Max Marks** — Maximum marks for that subject.
   - **Marks Obtained** — Obtained marks, or “Absent” badge, or “-”.
   - **Percentage** — Percentage for that subject.
   - A **Grand Total** row with total maximum marks, total obtained, and overall percentage.
4. **Overall Result** — Card showing: Overall percentage, Overall grade (from grades table), Result (Pass/Fail badge).
5. **Teacher Remarks** — Placeholder area for remarks (no data entry on this page).
6. **Signatures** — Placeholder lines for Class Teacher, Principal, and Parent, plus “Date issued”.

If you select multiple students, each gets a separate report card; layout may use page-break styling for printing.

### Row Actions

There are no row actions. Selection is done via the filter panel checkboxes.

### Bulk Actions

- **Select All / Deselect All** — In the student list, toggles all students in the current class at once.
- **Print** — Prints the current page (all visible report cards).
- **Export (PDF/Excel)** — ReportExportButtons export the currently selected students’ report data (student name, roll number, class, subjects summary, total marks, percentage, grade, result) with a filter summary (exam, academic year, number of students). Template type: `student_report_card`. Disabled when no report data is loaded.

---

## Export Options

- **Print** — “Print Card” button sends the current view to the browser print dialog. Use it after selecting exam, class, and one or more students so that the report cards are loaded.
- **PDF / Excel** — Available when at least one student is selected and report data has been fetched. Export includes the same fields as the on-screen report cards and respects the current filters (exam, class, selected students). Filter summary is included in the generated report.

---

## Tips & Best Practices

- **Select in order** — Choose exam first, then class, then students. The student list only shows students enrolled in the selected exam and class.
- **Verify enrollment** — If you do not see a student, ensure they are enrolled in the exam and in the selected class (via Exam Student Enrollment). A warning appears if selected students are not enrolled.
- **Batch report cards** — Select multiple students and use “Print” or “Export” to get a set of report cards in one go for distribution or records.
- **Use Select All** when you need report cards for the whole class; then export or print once.

---

## Related Pages

- [Consolidated Mark Sheet](/help-center/s/exams/exams-reports-consolidated) — Class-wise all-subjects result sheet
- [Class–Subject Mark Sheet](/help-center/s/exams/exams-reports-class-subject) — Subject-wise marks by class
- [Reports Hub](/help-center/s/exams/exams-reports-hub) — Central list of exam reports
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students in exams
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter exam marks

---

*Category: `exams` | Language: `en`*
