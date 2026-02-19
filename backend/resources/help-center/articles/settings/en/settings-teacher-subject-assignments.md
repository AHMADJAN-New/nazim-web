# Teacher Subject Assignments

The Teacher Subject Assignments page lets you assign teachers (staff) to subjects for specific classes and academic years. School administrators use it to define who teaches which subject in which class, and to link assignments to schedule slots for timetabling. Assignments are used when building timetables and when viewing teacher workloads.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by teacher name, employee ID, subject name/code, or class name/code. Type in the search box to filter the table.
- **Filter by Teacher** — Dropdown to show only assignments for a specific teacher. Options: All Teachers, or each active staff member (employee ID and name, with staff type in parentheses).
- **Filter by Academic Year** — Dropdown to show only assignments for a specific academic year. Options: All Academic Years, or each academic year name.

A **Clear** button appears when any filter or search is active; click it to reset all filters.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Teacher | Teacher name (employee ID and full name). |
| Academic Year | The academic year this assignment belongs to. |
| Class | Class name and section (e.g. "10A - Section 1"). |
| Subject | Subject name or code. |
| Schedule Slots | Badges for each schedule slot (e.g. slot codes) linked to this assignment. |
| Status | Active or Inactive badge. |
| Actions | Edit (pencil) and Delete (trash) buttons. |

### Row Actions

When you use the actions on any row:

- **Edit** — Opens the edit dialog. Step 1 shows teacher, academic year, class, and subject as read-only; you can change schedule slots. Step 2 lets you edit notes. Click **Update Assignment** to save.
- **Delete** — Opens a confirmation dialog. Click **Delete** to remove the assignment permanently.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Assignment

To create a new assignment, click the **"Create Assignment"** button at the top of the page. A two-step dialog opens.

### Step 1: Teacher and Classes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Teacher | Select | Yes | Choose the teacher (staff member). List shows employee ID, name, and staff type. Only active staff appear. |
| Academic Year | Select | Yes | Choose the academic year for the assignment. |
| School | Select | No | Shown only if the organization has more than one school. Choose a school or "All Schools". |
| Classes | Checkboxes | Yes | Select at least one class (class academic year). List shows class name and section. |
| Schedule Slots | Checkboxes | Yes | Select at least one schedule slot. Each option shows slot name, code, and time range (e.g. "Slot 1 (S1) - 08:00 to 09:00"). |

Click **Next** to go to Step 2.

### Step 2: Select Subjects

For each selected class, a section lists the subjects already assigned to that class (from Class Subjects). Select the subjects this teacher will teach for each class using the checkboxes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Notes | Textarea | No | Optional notes for this assignment. |

Click **Create Assignments** to create one assignment per selected class–subject combination (same teacher, academic year, school, and selected schedule slots).

### What Happens After Submission

- The system creates one assignment per (teacher, class, subject) with the chosen schedule slots and notes.
- A success message appears and the dialog closes.
- The table refreshes to show the new assignments.

---

## Editing an Assignment

To edit an existing assignment:

1. Find the assignment in the table.
2. Click the **Edit** (pencil) button on that row.
3. In Step 1 you can only change **Schedule Slots** (teacher, academic year, class, subject are read-only).
4. In Step 2 you can edit **Notes**.
5. Click **Update Assignment**.
6. A success message appears and the table refreshes.

---

## Deleting an Assignment

To delete an assignment:

1. Click the **Delete** (trash) button on the row.
2. A confirmation dialog appears.
3. Click **Delete** to permanently remove the assignment.
4. The assignment is removed from timetables and teacher workload views. No other data (teacher, class, subject) is deleted.

---

## Export Options

When the table has results, **Export** (PDF/Excel) buttons appear in the filters area. The export uses the current filters and search. The report includes columns: Teacher, Academic Year, Class, Subject, Schedule Slots, and Status. Filter summary (search text, teacher, academic year) is included when applicable.

---

## What This Setting Controls and What Depends on It

- **Controls:** Which teacher teaches which subject in which class for a given academic year, and which schedule slots are linked to that assignment.
- **Depends on:** Staff (teachers must exist and be active), Academic Years, Classes (class academic years), Subjects (assigned to classes via Class Subjects), and Schedule Slots. Ensure those are set up before creating assignments.
- **Used by:** Timetable generation, teacher workload views, and any feature that shows “who teaches what” per class.

---

## Tips & Best Practices

- Complete Academic Years, Classes, Class Subjects, and Schedule Slots before creating teacher subject assignments.
- Use filters by teacher or academic year to review one teacher’s load or one year’s assignments quickly.
- Use the same schedule slots across assignments that should appear in the same time blocks on the timetable.
- Add short notes (e.g. “Primary teacher”, “Shared with X”) to help staff understand roles.

---

## Related Pages

- [Settings – Schedule Slots](/help-center/s/settings/settings-schedule-slots) — Define time slots used in assignments and timetables
- [Settings – Classes](/help-center/s/settings/settings-classes) — Manage classes and class academic years
- [Settings – Subjects](/help-center/s/settings/settings-subjects) — Manage subjects and class subject assignments
- [Timetables](/help-center/s/academic/timetables) — Build and view timetables using these assignments

---

*Category: `settings` | Language: `en`*
