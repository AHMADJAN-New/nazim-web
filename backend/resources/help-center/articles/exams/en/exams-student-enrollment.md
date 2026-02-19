# Exam Student Enrollment

The Exam Student Enrollment page is where you enroll or remove students for a specific exam and class. You choose an exam and class, see available students (active in that class, not yet enrolled) and enrolled students, then add students one-by-one or in bulk, or remove them from the exam. Summary cards show Enrolled, Available, and Selected counts.

---

## Page Overview

When you open the Student Enrollment page (from the Exams list row action **Student Enrollment** or from the sidebar), you will see:

### Summary Cards

- **Enrolled** — Number of students currently enrolled in the selected exam and class.
- **Available** — Number of students who are in the selected class (active admissions for that class academic year) and not yet enrolled in this exam.
- **Selected** — Number of students you have selected in the "Available" list for bulk enroll (before clicking Enroll).

### Filters & Search

- **Exam** — Dropdown to select which exam to work with. Shows exam name and academic year. If you opened the page from an exam row, this may be pre-selected.
- **Class** — Dropdown to select which exam class. Options appear after an exam is selected; they are the classes assigned to that exam. If only one class exists, it may auto-select.
- **Search** — In the "Available Students" card, a search box filters the list by student full name or admission number.

---

## Data Table and Panels

The page is split into:

### Left panel: Select Exam & Class

A sticky card with:

- **Exam** — Select dropdown (exam name and academic year).
- **Class** — Select dropdown (class name and section). Shown only when an exam is selected. If no classes are assigned to the exam, a message says "No classes assigned to this exam".

### Center/right: Two-column layout

When an exam and class are selected:

**Available Students (left column)**  
- Title: "Available Students" with count.  
- **Select All** button to select all visible (filtered) available students.  
- Search box to filter by name or admission number.  
- Scrollable list of students with checkbox and name, admission number. Clicking the row or +/- toggles selection. Selected students appear highlighted.

**Selected Students (right column)**  
- Title: "Selected Students" with count.  
- **Clear All** to clear selection.  
- List of currently selected students (name, admission number) with remove (X) per student.  
- **"Enroll [N] Student(s)"** button to enroll all selected students at once.

### Quick Enroll Single Student

A card below with:

- **Select Student** — Dropdown of available students (same pool as Available list).
- **Enroll** button — Enrolls the single selected student.

### Enrolled Students Table

A table listing all enrolled students for the selected exam and class:

| Column | Description |
|--------|-------------|
| Admission No | Student admission number. |
| Name | Student full name. |
| Class | Class name (and section) for this enrollment. |
| Actions | **Remove** (trash) button — opens a confirmation dialog to remove the student from the exam. Shown only if you have enrollment permission. |

### Row Actions (Enrolled table)

- **Remove** — Removes the student from this exam. A confirmation dialog appears; confirm to complete. This action cannot be undone (re-enrollment would require enrolling again).

### Bulk Actions

- **Select All** (in Available) — Select all filtered available students.  
- **Clear All** (in Selected) — Clear the current selection.  
- **Enroll [N] Student(s)** — Enroll all selected students in one go.

---

## Enrolling Students

### Single student (Quick Enroll)

1. Select **Exam** and **Class** in the left panel.
2. In the "Quick Enroll Single Student" card, open **Select Student** and choose a student from the dropdown (only available students are listed).
3. Click **Enroll**.
4. The student is enrolled; the Enrolled count and table update, and the student disappears from Available (and from the dropdown until refreshed).

### Multiple students (bulk)

1. Select **Exam** and **Class**.
2. In **Available Students**, use the search if needed, then check the students you want or click **Select All**.
3. Selected students appear in **Selected Students**.
4. Click **"Enroll [N] Student(s)"**.
5. All selected students are enrolled. The selection clears and the lists refresh.

### Enroll All Classes

At the top right, when an exam and class are selected, a button **"Enroll All Classes"** is available (if you have permission). Clicking it enrolls all eligible students in all classes for this exam in one go. Use when you want every active student in every exam class to be enrolled.

---

## Removing a Student

1. In the **Enrolled Students** table, find the student.
2. Click the **Remove** (trash) button in the Actions column.
3. A confirmation dialog appears with the student name.
4. Click **Remove** (or Confirm) to remove the student from the exam. The student returns to the "available" pool for that class and can be enrolled again if needed.

---

## What “Available” Means

Available students are:

- In the **selected class** (same class academic year as the exam class).
- Have **active** enrollment status in that class.
- **Not already enrolled** in this exam for that class.

If Available is empty, either all students in the class are already enrolled, or there are no active admissions for that class in the academic year. Check class assignment on the exam’s Classes & Subjects page and admissions data.

---

## Export Options

This page does not provide PDF or Excel export. Use exam reports (from the exam row action **Reports**) for exported data.

---

## Tips & Best Practices

- **Select exam and class first** — Nothing loads until both are selected. The page may auto-select the latest exam from the current academic year or the first exam if opened without an exam ID.
- **Use search to find students** — When the available list is long, search by name or admission number to select the right students.
- **Enroll All Classes for full exams** — For term or final exams where every active student should sit, "Enroll All Classes" saves time.
- **Remove only when necessary** — Removing a student from an exam is permanent for that exam; re-add by enrolling again. Use remove for corrections (wrong class, duplicate, or withdrawal).
- **Check Enrolled table after bulk enroll** — After enrolling many students, scroll the Enrolled table to confirm counts and names.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Open Student Enrollment from the exam row action.
- [Exam Enrollment Flow](/help-center/s/exams/exams-enrollment) — How enrollment fits in the full exam workflow.
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter marks for enrolled students only.

---

*Category: `exams` | Language: `en`*
