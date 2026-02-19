# Student Admissions

The Student Admissions page shows all admissions (enrollments) of students into classes for given academic years. Here you can see who is placed in which class, residency type, room, shift, and enrollment status. You can add a new admission (admit a student to a class), view or edit an admission, delete an admission, or bulk deactivate selected admissions. If your subscription has a student limit, you cannot add new admissions when the limit is reached until you upgrade or free slots (e.g. by not creating new students).

---

## Page Overview

When you open the Student Admissions page, you will see:

### Summary Cards

Stats at the top (exact labels may vary by translation) typically include counts such as total admissions, active, pending, or by status. These give a quick overview of how many students are admitted and in what state.

### Filters & Search

- **Search** — Search by student name, admission number, admission year, class name, or section name.  
- **School** — Filter by school (if your organization has multiple schools). Default is often "All Schools".  
- **Status** — Filter by enrollment status: All, Pending, Admitted, Active, Inactive, Suspended, Withdrawn, Graduated.  
- **Residency** — Filter by residency type (e.g. Day scholar, Boarder).

### Primary and Secondary Actions

- **Admit Student** (primary) — Opens the admission form to create a new admission (student + class + academic year + optional details). Disabled when the student limit is reached.  
- **Deactivate (N)** (secondary) — Shown when at least one row is selected and at least one selected admission has status Active. Opens a confirmation dialog to bulk deactivate the selected admissions.

---

## Data Table

The main table shows one row per admission. Columns typically include:

| Column | Description |
|--------|-------------|
| Select | Checkbox to include the row in bulk deactivate. Header checkbox selects/deselects all on the current page. |
| Picture | Student photo thumbnail. |
| ID | Student code or admission number. |
| Student | Student full name, enrollment status badge, boarder badge if applicable, admission number below. On small screens the ID may also appear here. |
| School | School name. |
| Class / Shift | Class name, section badge if present, shift. |
| Residency | Residency type name. |
| Room | Room number. |
| Status | Enrollment status (Pending, Admitted, Active, Inactive, Suspended, Withdrawn, Graduated). |
| Actions | Dropdown: Fee Assignments (navigate to student fees), Edit, Delete. |

Clicking a row (except on the checkbox or actions) usually opens a **details panel** for that admission.

### Row Actions

- **Fee Assignments** — Navigates to the student’s fee assignment page.  
- **Edit** — Opens the admission edit form (same form as add, with data pre-filled).  
- **Delete** — Opens a confirmation dialog. Confirming deletes or removes that admission record.

### Bulk Actions

- **Deactivate (N)** — When one or more rows are selected and at least one selected admission is Active, this button appears. Click it, confirm in the dialog, and the selected admissions are deactivated (status changed so they no longer count as active). Selection is cleared after success.

---

## Adding a New Admission (Admit Student)

1. Click **"Admit Student"** at the top.  
2. If the student limit is reached, a message explains that you must upgrade or free slots; the button may be disabled.  
3. The admission form opens. Typically you:  
   - Select **Student** (existing student from your organization).  
   - Select **Academic Year** and **Class** (class section).  
   - Optionally set admission date, enrollment status, shift, residency type, room, boarder flag, fee status, placement notes.  
4. Submit the form. On success, the new admission appears in the table and the form closes.

---

## Editing an Admission

1. Find the admission in the table.  
2. Click the actions menu (⋮) → **Edit**.  
3. The same form opens with current data pre-filled.  
4. Change any fields (e.g. class, residency, room, status).  
5. Save. The table refreshes with the updated data.

---

## Deleting an Admission

1. Click the actions menu (⋮) → **Delete**.  
2. Confirm in the dialog. The admission is removed from the list.  
Note: Deleting an admission does not delete the student; it only removes that class placement.

---

## Viewing Admission Details

Click a row (or use the details panel if opened from a row click) to view full details of that admission (student info, class, dates, residency, room, status, etc.) in a side or bottom panel. From there you can often trigger Edit or other actions.

---

## Tips & Best Practices

- **Use filters** — Use school, status, and residency filters to focus on the admissions you need (e.g. active boarders in one school).  
- **Check student limit** — Before admitting many new students, check your subscription usage so you know if you can add new admissions or need to upgrade.  
- **Bulk deactivate with care** — Use bulk deactivate when many students are leaving a class or year; confirm the selection before deactivating.

---

## Related Pages

- [Students](/help-center/s/students/students) — Register and manage students before admitting them to classes.  
- [Students Import](/help-center/s/students/students-import) — Bulk import students and optionally their admissions.  
- [Admissions Report](/help-center/s/students/admissions-report) — View admission statistics and export reports.

---

*Category: `students` | Language: `en`*
