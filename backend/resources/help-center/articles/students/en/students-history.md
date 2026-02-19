# Students History

The Students History feature lets you view a single student’s lifetime academic and administrative history in one place. You can open it from the main Students list (row action **View History**) or via the History list page. The history includes admissions, attendance, exams, fees, and other events, with summary cards, a timeline, section tabs, and charts. You can export the history as PDF or Excel.

---

## Page Overview

### History List Page (`/students/history`)

When you open the Students History list:

- **Page header** — Title and short description for the history list.  
- **Search** — Search by student name, admission number, father name, or class name.  
- **Status filter** — Filter by student status (e.g. All, Applied, Admitted, Active, Withdrawn).  
- **Table columns** — Picture, Full Name, Admission #, Class, Status.  
- **Row action** — **View History** (eye icon): opens that student’s full history page.  
- **Pagination** — Navigate pages and change page size.

Clicking a row or **View History** takes you to the detail page for that student.

### Student History Detail Page (`/students/:studentId/history`)

When you open a student’s history:

- **Back button** — Returns to the History list (or “Back to History”).  
- **Page header** — “Student Lifetime History” with a short description.  
- **Student header card** — Photo, full name, status badge, admission number, class, date of birth, phone.  
- **Export buttons** — **Export PDF** and **Export Excel** to download the full history report.  
- **Full student details** — Expandable section with full profile data.  
- **Summary cards** — Counts or summaries (e.g. admissions, attendance records, exams, fees).  
- **View mode toggle** — Three modes: **Sections**, **Timeline**, **Charts**.

---

## View Modes

### Sections

Data is grouped into sections (e.g. Admissions, Attendance, Exams, Fees). Each section shows a table or list of records (dates, details, amounts) so you can scan by category.

### Timeline

A chronological timeline of events (admissions, attendance entries, exam enrollments, fee payments, etc.) so you can see the order in which things happened.

### Charts

Charts summarize attendance, exams, and fees (e.g. by period or category). Use this for a quick visual overview.

---

## Export Options

- **Export PDF** — Generates a PDF report of the student’s full history. A progress dialog appears; when ready, you can download and print.  
- **Export Excel** — Generates an Excel file of the history data. Same progress and download flow.

Exports reflect the data loaded for that student at the time you click; they are not affected by the current view mode (Sections/Timeline/Charts) on screen.

---

## How to Open Student History

1. From **Students** page: open the row actions menu (⋮) for a student → **View History**.  
2. From **Students History** list: go to **Students** → **Students History** (or `/students/history`), then search/filter if needed and click a row or **View History** for the student.

---

## Tips & Best Practices

- **Use history after key events** — Check the timeline or sections after recording attendance, exam results, or fee payments to confirm they appear correctly.  
- **Export for records** — Use PDF or Excel export when you need a printable or shareable record of a student’s history.  
- **Use filters on the list** — On the History list page, use search and status filter to find students quickly before opening their detail page.

---

## Related Pages

- [Students](/help-center/s/students/students) — Main student list and profile actions.  
- [Admissions](/help-center/s/students/admissions) — Manage admissions to classes.  
- [Admissions Report](/help-center/s/students/admissions-report) — Admission statistics and reports.

---

*Category: `students` | Language: `en`*
