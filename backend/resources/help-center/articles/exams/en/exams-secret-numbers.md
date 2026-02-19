# Secret Number Management

The Secret Number Management page lets you assign and edit secret numbers for students enrolled in an exam. Secret numbers are used for anonymous grading: exam scripts or mark sheets can show only the secret number until results are finalized. You can auto-assign numbers, preview and confirm, edit individuals, and look up a student by secret number.

---

## Page Overview

When you open Secret Number Assignment (from **Exams** → select an exam → **Secret Numbers**, or the relevant sidebar link), you will see:

### Summary Cards

Four cards show progress for the selected exam:

- **Total Students** — Total enrolled students (or in the selected class if filtered).
- **Assigned** — Number with a secret number assigned (green).
- **Missing** — Number without a secret number (amber).
- **Progress** — Percentage assigned (0–100%).

### Filters & Search

- **Exam** — When the page is opened without an exam in the URL, a **Select Exam** card appears. Choose the exam; the latest from the current academic year may be auto-selected.
- **Class** — In the **Auto Assignment** card: **All Classes** or a specific class. Used for scope and filtering.
- **Search** — In the Students card header. Search by name, student code, secret number, or class. The table shows only matching students.

---

## Lookup by Secret Number

A card **Lookup by Secret Number** appears near the top.

- **Purpose:** Find a student by their secret number (e.g. when processing scripts or results).
- **Enter secret number** — Type the secret number and press Enter or click **Lookup**.
- **Lookup** — Runs the search. If found, a dialog shows: Student Name, Student Code, Roll Number, Class. If not found, the dialog shows "No student found with this secret number".

---

## Data Table (Students)

The main table lists enrolled students and their secret number status.

| Column | Description |
|--------|-------------|
| Secret Number | Shown masked by default (e.g. first and last character with asterisks). Use **Show Numbers** in the card header to show full numbers. "Not assigned" (amber) if missing. When editing, shows input + Save and Cancel (X). |
| Roll Number | Roll number for the exam. Hidden on small screens. |
| Student Code | Admission/code. Hidden on small and medium screens. |
| Name | Student full name. On small screens, roll and code appear below. |
| Class | Class and section. Hidden on smaller screens. |
| Actions | Edit (pencil) to change this student’s secret number (only if you have assign permission and the exam is not completed/archived). |

### Row Actions

- **Edit (pencil)** — Edit the secret number for that row. Enter the new value, then Save (check) or X to cancel. Table refreshes after save.

### Show / Hide Numbers

In the Students card header, **Show Numbers** / **Hide Numbers** toggles whether the Secret Number column shows full numbers or a masked value (e.g. 5***9). Use **Hide Numbers** when others might see the screen.

### Bulk Actions

No bulk actions in the table. Use **Preview Auto Assignment** and **Confirm & Assign** in the Auto Assignment card for bulk assignment (see below).

---

## Auto Assignment

If you have **exams.secret_numbers.assign** permission and the exam is not **Completed** or **Archived**, an **Auto Assignment** card is shown.

### Fields and options

- **Class** — **All Classes** or a specific class. **Selected Class** scope uses this class only.
- **Start From** — Starting number (e.g. 5001). **Use suggested** (refresh) fills the suggested value when available.
- **Scope** — **Entire Exam** or **Selected Class** (disabled if no class selected).
- **Options** — **Override existing numbers** — If checked, students who already have a secret number can get a new one.

### Workflow

1. Set **Class**, **Start From**, **Scope**, and **Override existing numbers**.
2. Click **Preview Auto Assignment**. A dialog shows: Name, Class, Current (secret number), New, Status (New / Override / Collision). Up to 50 rows; "... and N more" if there are more.
3. Review. If there are overrides and you click **Confirm & Assign**, a confirmation dialog warns that existing numbers will be overridden and cannot be undone.
4. Click **Confirm & Assign** (and **Yes, Override** in the confirmation if shown). Numbers are saved and the list refreshes.
5. Use **Cancel** in the preview to close without applying.

---

## Editing a Secret Number Manually

1. Find the student in the table.
2. Click the **Edit** (pencil) button in the Actions column.
3. Enter the new secret number (or clear to leave unassigned if allowed).
4. Click **Save** (check) to save, or **X** to cancel.
5. The table refreshes.

---

## Deleting or Clearing a Secret Number

There is no separate "Delete" action. To clear, use **Edit** and clear the value if the system allows, or use Auto Assignment with **Override existing numbers**. Clearing may depend on school policy.

---

## Tips & Best Practices

- **Assign before marking** — Assign secret numbers before marks entry if you use them for anonymous grading.
- **Keep numbers confidential** — Use **Hide Numbers** when the screen might be seen by others; use lookup when you need to identify a student by secret number.
- **Use preview** — Always preview auto-assignment to check for collisions and overrides before confirming.
- **Override with care** — Overriding existing secret numbers can break links to already-entered marks or scripts; confirm before overriding.
- **Permission** — You need **exams.secret_numbers.read** to view and **exams.secret_numbers.assign** to assign or edit. Completed/archived exams do not allow assignment.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Create exams and open Secret Numbers from the exam row.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students; only enrolled students appear here.
- [Exam Roll Numbers](/help-center/s/exams/exams-roll-numbers) — Assign roll numbers (used together with secret numbers on mark sheets).
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter marks; mark sheets may show secret numbers for anonymity.
- [Exam Number Reports](/help-center/s/exams/exams-number-reports) — Print secret labels and related reports.

---

*Category: `exams` | Language: `en`*
