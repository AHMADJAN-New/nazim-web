# Exam Roll Numbers

The Exam Roll Numbers page lets you assign and manage roll numbers for students enrolled in an exam. Staff with roll-number permission use it to auto-assign sequential roll numbers (with a starting value and scope), preview changes before applying, or edit individual roll numbers manually. Summary cards show total students, how many have a roll number assigned, how many are missing, and progress percentage. You can filter by exam (when opened from the sidebar) and by class, and search the student list by name, student code, roll number, or class.

---

## Page Overview

When you open the Roll Number Assignment page (from the Exams list row action **Roll Numbers** or from the sidebar), you will see:

### Summary Cards

- **Total Students** — The total number of students enrolled in the selected exam (or in the selected class if a class filter is applied).
- **Assigned** — Count of students who already have a roll number assigned (shown in green).
- **Missing** — Count of students who do not yet have a roll number (shown in amber).
- **Progress** — Percentage of enrolled students who have a roll number (Assigned ÷ Total × 100).

### Filters & Search

- **Select Exam** — If you opened the page without an exam (e.g. from the sidebar), a **Select Exam** card appears. Choose an exam from the dropdown; the page then shows that exam’s enrolled students and roll number data. When you open the page from an exam row (**Roll Numbers**), the exam is already selected.
- **Class** — In the Auto Assignment card, filter by **All Classes** or a specific exam class. This limits both the auto-assignment scope and the students table to that class.
- **Search** — In the Students table header, search by student name, student code, roll number, or class name. Type in the search box to filter the list.

---

## Data Table

The **Students** table shows all enrolled students (for the selected exam and optional class). Columns:

| Column | Description |
|--------|-------------|
| Roll Number | Current roll number (badge) or "Not assigned" (amber outline badge). When editing, shows an input plus Save and Cancel buttons. |
| Student Code | Student/admission code. Hidden on small screens (shown under name on mobile). |
| Name | Student full name. |
| Father Name | Father's name. Hidden on medium and smaller screens. |
| Class | Class name and section if any. Hidden on large screens and below. |
| Actions | **Edit** (pencil) button to manually change this student’s roll number. Shown only when you have assign permission and the exam is not Completed or Archived. |

Rows with no roll number show "Not assigned" in the Roll Number column. You can assign numbers via **Auto Assignment** (below) or by clicking **Edit** and entering a value, then **Save**.

### Row Actions

- **Edit** — Click the pencil icon to edit this student’s roll number. An inline input appears with **Save** and **Cancel**. Enter the new roll number and click **Save** to update, or **Cancel** to discard. Only visible when you have assign permission and the exam status allows changes (not Completed or Archived).

### Bulk Actions

No bulk actions on this page. Use **Auto Assignment** to assign many roll numbers at once.

---

## Auto Assignment (Roll Numbers)

If you have **assign** permission and the exam is not Completed or Archived, an **Auto Assignment** card is shown with:

| Control | Type | Description |
|---------|------|-------------|
| Class | Dropdown | **All Classes** or a specific exam class. If you choose a class, the **Scope** option "Selected Class" is enabled; otherwise only "Entire Exam" is used. |
| Start From | Text input + button | Starting number for the sequence (e.g. 1001). A **Use suggested** (refresh) button fills in the system’s suggested value. |
| Scope | Radio | **Entire Exam** — assign numbers for all enrolled students in the exam. **Selected Class** — only for the class chosen in the Class dropdown (disabled if Class is "All Classes"). |
| Override existing numbers | Checkbox | If checked, students who already have a roll number may get a new number in this run. If unchecked, only students without a roll number are assigned. |

Click **Preview Auto Assignment** to see what will change without saving. A dialog opens showing:

- How many students will get a new roll number.
- How many existing numbers will be overridden (if Override is checked).
- A table (up to 50 rows) with: Name, Class, Current roll number, **New** roll number, and **Status** (New, Override, or Collision).

If there are more than 50 rows, a message like "... and N more" appears below the table.

- **Cancel** — Close the preview without applying.
- **Confirm & Assign** — Apply the assignment. If any existing numbers will be overridden, a second confirmation dialog appears: **Confirm Override** with the count and "Yes, Override" to proceed. On success, a toast shows how many roll numbers were assigned (and any errors if some failed); the dialog closes and the table refreshes.

### What Happens After Assignment

- Roll numbers are saved for the exam students. The summary cards and table update.
- If you chose "Override existing numbers" and some students already had numbers, those are replaced. The override confirmation step helps avoid accidental overwrites.

---

## Editing a Roll Number Manually

To change one student’s roll number without auto-assignment:

1. Find the student in the **Students** table.
2. Click the **Edit** (pencil) button in the Actions column.
3. An inline input appears with the current value (or empty if not assigned). Type the new roll number.
4. Click **Save** (checkmark) to save, or **Cancel** (X) to discard.
5. A success toast appears and the table refreshes.

You can clear a roll number by deleting the value and saving (if the system allows null). Edit is only available when the exam is not Completed or Archived and you have assign permission.

---

## Deleting or Clearing a Roll Number

There is no separate "Delete" action. To clear a roll number, use **Edit**, clear the input, and **Save** (if the backend allows null). To replace a number, use **Edit** and enter a new value, then **Save**. To reassign many numbers, use **Auto Assignment** with **Override existing numbers** checked and **Preview** first.

---

## Export Options

This page does not have its own PDF/Excel export. For roll number lists and slips, use the **Number Reports** page (Roll Number List, Summary, Print Roll Slips, etc.).

---

## Tips & Best Practices

- **Use suggested Start From** — Click the refresh icon next to Start From to use the system’s suggested value (e.g. next available number), which helps avoid duplicates.
- **Preview before confirming** — Always use **Preview Auto Assignment** to see how many will be assigned and how many overridden before clicking **Confirm & Assign**.
- **Use class scope for large exams** — For big exams, assign by class (select Class, then Scope: Selected Class) so numbers are grouped by class and easier to manage.
- **Lock exam when done** — When roll numbers are final, consider moving the exam to a later status (e.g. In Progress) so that accidental edits are prevented (edit is disabled for Completed/Archived).
- **Check Number Reports** — After assigning, open **Number Reports** to print roll slips or export the roll list for exam day.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Create and manage exams; open Roll Numbers from the row action
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students in the exam before assigning roll numbers
- [Secret Numbers](/help-center/s/exams/exams-secret-numbers) — Assign and manage secret numbers for the same exam
- [Number Reports](/help-center/s/exams/exams-number-reports) — View and print roll number list, summary, and roll slips

---

*Category: `exams` | Language: `en`*
