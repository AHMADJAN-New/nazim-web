# Class–Subject Mark Sheet

The Class–Subject Mark Sheet report shows exam results for **one subject** in **one class**: each student’s marks for that subject, rank, percentage, grade, and result (Pass/Fail/Absent). Staff with exam report permission use it to print or export subject-wise lists, see top performers, and view summary stats (total students, class average, highest/lowest marks, pass percentage). You can view one class and one subject at a time (Single Subject tab) or export all classes and all subjects in one file (Multiple Subjects tab).

---

## Page Overview

When you open this page, you will see:

### Summary Cards

Summary cards appear **inside the report** after you select exam, class, and subject (in Single Subject view).

- **Total Students** — Number of students in the class for this subject/exam.
- **Class Average** — Average marks obtained in this subject.
- **Highest Marks** — Highest marks obtained.
- **Lowest Marks** — Lowest marks obtained.
- **Pass Percentage** — Percentage of students who passed this subject.

### Filters & Search

- **Select Exam** — Combobox to choose the exam. Defaults to the latest exam from the current academic year when possible.
- **Select Class** — Shown in Single Subject tab. Choose one class (and section) from the exam’s classes. Required before subject list loads.
- **Select Subject** — Shown in Single Subject tab. Choose one subject from the subjects assigned to the selected class for this exam.

There is no free-text search. Filtering is by exam, class, and subject only.

---

## Data Table

The main table (Single Subject view, after selecting exam, class, and subject) shows:

| Column | Description |
|--------|-------------|
| Rank | Student rank by marks (highest first). Top three may show trophy icons. |
| Picture | Student photo thumbnail or placeholder. |
| Student Name | Full name. |
| Roll Number | Exam roll number. |
| Admission No | Admission number. |
| Father Name | Father’s name. |
| Class | Class name and section (same for all rows in this report). |
| Subject | Subject name (same for all rows). |
| Marks Obtained | Marks obtained, or “Absent” badge, or “-” if not entered. |
| Total Marks | Total marks for the subject. |
| Passing Marks | Passing marks for the subject. |
| Percentage | Percentage for this subject. |
| Grade | Grade from grades table. |
| Result | Pass (green), Fail (red), or Absent (outline). |

The table is paginated with controls at the bottom.

### Top Performers

Below the summary, a “Top Performers” card shows the top three students by marks (with trophy icons and marks/percentage).

### Tabs

- **Single Subject** — Select exam, class, and subject. The subject-wise mark sheet for that class is shown. Export/print apply to this one class–subject combination.
- **Multiple Subjects** — After selecting an exam, you can use the export buttons above to generate one file containing all classes and all subjects (each class–subject in a separate Excel sheet or PDF section). No per-subject table tabs here; the page explains to use the export buttons.

### Row Actions

There are no row actions on the table.

### Bulk Actions

No bulk actions available.

---

## Export Options

- **Print** — Via MultiSectionReportExportButtons. Single subject: one section. Multiple subjects: all class–subject combinations with page breaks.
- **PDF / Excel** — In Single Subject view, when the report has data, MultiSectionReportExportButtons (and optionally ReportExportButtons) allow PDF/Excel export with filter summary (exam, class, subject, academic year). In Multiple Subjects view, MultiSectionReportExportButtons builds sections for every class and every subject in that exam and exports (Excel: one sheet per class–subject; PDF: sections with page breaks). Template type used: `class_subject_academic_year`.

Exports respect the current tab and selection (single class–subject or all classes and subjects).

---

## Tips & Best Practices

- Use **Single Subject** when you need a clean list for one subject in one class (e.g. to share with the subject teacher or for notice board).
- Use **Multiple Subjects** export when you need a full set of subject-wise sheets for the whole exam (all classes, all subjects) in one file.
- If a subject does not appear in the list, it may not be assigned to the selected class for this exam; check exam class–subject setup first.
- The “Subject not in class” message appears in Multiple Subjects tab when a class does not have that subject.

---

## Related Pages

- [Consolidated Mark Sheet](/help-center/s/exams/exams-reports-consolidated) — Class-wise all-subjects result sheet
- [Student Reports](/help-center/s/exams/exams-reports-student) — Student-wise report cards
- [Reports Hub](/help-center/s/exams/exams-reports-hub) — Central list of exam reports
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter exam marks

---

*Category: `exams` | Language: `en`*
