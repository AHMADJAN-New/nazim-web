# Exam Marks Entry

The Exam Marks page is where you enter or edit marks for students in a selected exam, class, and subject. You choose the exam, class, and subject, then see a table of enrolled students with roll number, secret number, admission number, and a marks field plus Present/Absent per student. You can search by admission, roll, or secret number, use Fast Entry mode to jump to a student by scanning a number, sort columns, and save all marks at once.

---

## Page Overview

When you open the Exam Marks page (from the Exams list row action **Marks Entry** or by URL with an exam ID), you will see:

### Summary Cards

This page does not have summary cards. A **Marks Entry Progress** bar shows how many students have marks (or absent) entered for the current subject (e.g. "X / Y entered" and a percentage). This helps you see how much is left to enter.

### Filters & Search

- **Exam** — Dropdown to select the exam. Shows exam name and academic year.
- **Class** — Dropdown to select the exam class. Options depend on the selected exam.
- **Subject** — Dropdown to select the subject. Options depend on the selected class. The subject’s total marks and passing marks are shown in the Marks Entry card description.
- **Search by Admission No** — Text box to filter the student table by admission number (or student code).
- **Search by Roll Number** — Text box to filter by exam roll number.
- **Search by Secret Number** — Text box to filter by exam secret number.

Clearing a search box shows all students again. Table columns are also sortable (see Data Table).

---

## Data Table

After you select Exam, Class, and Subject, a table lists all enrolled students for that exam and class. Columns:

| Column | Description |
|--------|-------------|
| Student Name | Full name. Column is sortable (click header). |
| Roll Number | Exam roll number. Sortable. |
| Secret Number | Exam secret number. Sortable. |
| Admission No | Admission number or student code. Sortable. |
| Marks | Numeric input: enter marks obtained (0 up to the subject’s total marks, e.g. 100). Decimals allowed. Disabled when the student is marked Absent. Sortable. |
| Present/Absent | Checkbox. Checked = Present, unchecked = Absent. When set to Absent, the marks field is cleared and disabled. |
| Status | Badge: **Pass** (green) if marks ≥ passing marks and not absent, **Fail** (red) if below passing, **Absent** (outline) if absent. Shows "—" when marks are not yet entered and student is present. |

Only enrolled students appear. If no students are enrolled for that exam and class, a message says "No students enrolled for this exam class." The table can be scrolled vertically; the header stays visible (sticky).

### Row behaviour

- **Marks input** — Type the marks. The value is validated against the subject’s total marks (cannot exceed it). Pressing Enter can move focus or trigger save depending on implementation.
- **Present/Absent** — Toggle to mark the student present or absent. Absent clears and disables the marks field.
- **Pass/Fail** — Calculated from subject total and passing marks; you do not edit it directly.

### Bulk save

At the top right, a **"Save All Marks"** button is shown when a subject is selected and you have marks permission. It saves all current marks, absent flags, and remarks for every student in the table for the selected exam + class + subject. The button is disabled when there are no changes or while saving. After a successful save, a success message appears.

---

## Fast Entry Mode

A **Fast Entry Mode** toggle (or button) opens a small panel where you can:

- Enter or scan a **roll number**, **secret number**, or **admission number** in a single input.
- Click **Find Student** or press Enter.
- The system finds the matching student row and highlights it briefly; the marks input for that student is focused so you can type marks immediately. This is useful when entering from paper sheets or a barcode/QR scanner.

If no student matches, an error message (e.g. "Student not found") is shown. You can exit Fast Entry mode with the close or "Exit Fast Entry" control.

---

## Saving Marks

- **Per-row** — Enter or change marks and Present/Absent in the table. Changes are kept in memory until you save.
- **Save All Marks** — Click the top **"Save All Marks"** button to send all current data (marks, absent, remarks if any) for the selected exam, class, and subject to the server. This is a bulk save for the whole grid.
- **Validation** — Marks must be between 0 and the subject’s total marks. Absent students do not require marks. The system may show validation errors (e.g. red border) if a value is out of range.
- **Success** — On successful save, a success message (e.g. "Marks saved successfully") appears and the table state is updated so that "unsaved changes" are cleared.

---

## What Happens After Submission

- All entered marks and absent flags for the selected exam, class, and subject are stored.
- The progress bar updates to reflect how many students have data.
- If you navigate away without saving, in-memory changes are lost; save before leaving to persist.

---

## Export Options

The Exam Marks page itself does not provide PDF or Excel export. Use the exam **Reports** (from the exam row on the Exams list) to generate or export mark sheets and reports.

---

## Tips & Best Practices

- **Select exam, class, then subject** — The subject list depends on the class. Enter marks one subject at a time; the progress bar is per subject.
- **Use Fast Entry when using scanned roll/secret numbers** — Speeds up data entry when you have printed sheets or a scanner.
- **Mark absent students first** — Uncheck Present for absent students so their marks field is disabled and you don’t enter marks by mistake.
- **Save regularly** — Use "Save All Marks" after entering a batch to avoid losing data if the browser or tab is closed.
- **Check total and passing marks** — The subject’s total and passing marks are shown in the card description; use them to ensure marks are within range and to interpret Pass/Fail.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Open Marks Entry from the exam row action.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Only enrolled students appear on the marks page; enroll first if the list is empty.
- [Exam Reports](/help-center/s/exams/exams-reports) — View or export mark sheets and result reports.

---

*Category: `exams` | Language: `en`*
