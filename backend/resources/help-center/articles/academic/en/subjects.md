# Subjects

The Subjects page is where you define base subjects (e.g., Mathematics, Arabic) and assign them to classes in two steps: first to class templates (which subjects are offered for a class), then to class academic years (which subjects are actually taught in a specific year, with teacher, room, and optional details). You can also bulk-assign subjects and copy subject assignments from one class-year to another. School administrators and academic staff use this page to set up the curriculum that feeds into timetables and exams.

---

## Page Overview

When you open the Subjects page (Settings > Subjects), you will see a header and two tabs: **Base Subjects** and **Class Subjects**.

### Summary Cards

This page does not have summary cards.

### Tabs

- **Base Subjects** — List of all subject definitions (code, name, description, active status). Here you add, edit, and delete subjects and use search and export.
- **Class Subjects** — Two-step workflow: Step 1 assigns subjects to a *class* (template); Step 2 assigns subjects to a *class academic year* (specific year and section) with teacher, room, and weekly hours. This tab also supports bulk assign and copy between class-years.

---

## Base Subjects Tab

### Filters & Search

- **Search** — Search by subject name, code, or description. Use the Filters panel to expand/collapse the search box.

### Data Table

| Column | Description |
|--------|-------------|
| Code | Subject code (e.g., MATH, AR). |
| Name | Subject name (e.g., Mathematics, Arabic). |
| Description | Short description or "-". |
| Is Active | Badge: Active or Inactive. |
| Actions | Edit (pencil), Delete (trash). |

### Row Actions (Base Subjects)

- **Edit** — Opens the edit subject form with current name, code, description, and active status.
- **Delete** — Opens a confirmation dialog. Confirming deletes the subject (may affect class subject assignments; check warnings).

### Creating a New Subject

1. Click **Add Subject**.
2. In the dialog:
   - **Name** * (required) — Full name of the subject.
   - **Code** * (required) — Short code (e.g., MATH).
   - **Description** (optional) — Up to 500 characters.
   - **Is Active** — Toggle; default On.
3. Click **Save**.

The new subject appears in the Base Subjects table. You can then assign it to classes in the Class Subjects tab.

### Editing a Subject

1. Click Edit (pencil) for the subject row.
2. Change Name, Code, Description, or Is Active.
3. Click **Save**.

### Deleting a Subject

1. Click Delete (trash) for the row.
2. Confirm in the dialog. The subject is removed; any assignments that reference it may be affected (the system may block deletion if in use).

---

## Class Subjects Tab

This tab has two steps. **Step 1** defines which subjects are *available* for a class (template). **Step 2** assigns subjects to a *class academic year* (a specific class and section in a given year) and optionally assigns teacher, room, and weekly hours.

### Step 1: Assign Subjects to Classes (Templates)

- **Select Class** — Choose a base class (e.g., Grade 10). The table below shows which subjects are assigned to this class as a template.
- **Assign Subject to Class** — Button that opens a dialog: select **Class** * and **Subject** *, then Save. Adds one subject to the class template.
- **Bulk Assign to Class** — Button that opens a dialog: select **Class** * and one or more **Subjects** (checkboxes), then submit. Adds multiple subjects to the class template in one go.
- **Table** — Columns: Code, Name, Actions (e.g., remove subject from template). Use row actions to remove a subject from the class template.
- **Export** — Export the list of subjects for the selected class (code, name) to PDF or Excel when the table has data.

Removing a subject from a class template does not delete the base subject; it only removes it from that class’s offered subjects. Step 2 assignments for that subject in specific class-years may still exist until you remove them there.

### Step 2: Assign Subjects to Class Academic Years

- **Academic Year** — Dropdown to select the academic year. The list of class instances (class + section) for that year is used for the next dropdown.
- **Select Class (Year)** — Dropdown to select a class academic year (e.g., "Grade 10 - A"). The table below shows subjects assigned to *this* class instance, with teacher, room, and weekly hours.
- **Assign Subject** — Button that opens a dialog: **Class (Academic Year)** *, **Subject** *, **Room** (optional), **Notes** (optional). Save to add one subject to this class-year. Teacher and weekly hours may be editable in the table or in a separate edit flow depending on your setup.
- **Bulk Assign Subjects** — Button that opens a dialog: select **Class (Academic Year)** *, one or more **Subjects**, and optionally **Default Room**. Saves multiple subject assignments to the selected class-year.
- **Table** — Columns: Code, Name, Teacher, Room, Weekly Hours, Actions (Edit, Remove). Each row is one subject assigned to this class-year. Use row actions to edit (e.g., change teacher, room, hours) or remove the assignment.
- **Copy Subjects** — Option to copy subject assignments from one class academic year to another (e.g., from "Grade 10 - A" in 2023 to "Grade 10 - A" in 2024), with an option to copy teacher/room/details.

### Copy Subjects Between Class-Years

1. In the Class Subjects tab, select the **Academic Year** and the **Class (Year)** that will be the *source*.
2. Open the **Copy Subjects** dialog (button or link).
3. **From Class (Year)** * — Source class academic year (often pre-filled).
4. **To Class (Year)** * — Target class academic year.
5. **Copy Assignments** — Check to copy full assignment details (e.g., teacher, room) to the target; otherwise only the list of subjects may be copied.
6. Submit. The target class-year gets the same subject assignments (and optionally details) as the source.

---

## What Happens After Submission

- **Base subject create/edit** — Table refreshes; the new or updated subject appears in the list.
- **Assign to class template (Step 1)** — The subject appears in the Step 1 table for the selected class.
- **Assign to class year (Step 2)** — The subject appears in the Step 2 table for the selected class academic year; you can then assign a teacher and set room/weekly hours if the form or table supports it.
- **Remove** — The assignment is removed from the template or class-year; the base subject remains.

---

## Export Options

- **Base Subjects tab** — Export is available when the table has data; exports the filtered list (e.g., code, name, description, active) to PDF or Excel with pagination/filter summary as applicable.
- **Class Subjects Step 1** — Export list of subjects for the selected class (code, name) to PDF or Excel when the template table has data.
- **Class Subjects Step 2** — Export can be available for the class-year subject list (code, name, teacher, room, weekly hours) to PDF or Excel when the table has data.

---

## Tips & Best Practices

- Create all **base subjects** first (Base Subjects tab), then use **Class Subjects** to define which subjects each class offers (Step 1) and which are actually taught in each academic year (Step 2).
- Use **Step 1** as the master list of subjects per class; use **Step 2** to assign teachers and rooms and to align with timetable generation and exams.
- Use **Bulk Assign** in both steps to add many subjects at once instead of one-by-one.
- When starting a new academic year, use **Copy Subjects** from the previous year’s class-year to replicate the same subject set (and optionally teacher/room) quickly.
- Keep subject **codes** short and unique (e.g., MATH, AR, EN) so they are easy to recognize in timetables and reports.

---

## Related Pages

- [Classes](/help-center/s/academic/classes) — Manage classes and assign them to academic years
- [Academic Years](/help-center/s/academic/academic-years) — Manage academic years
- [Timetables](/help-center/s/academic/timetables) — Build timetables; uses teacher–subject assignments from Class Subjects Step 2
- [Academic Timetable Generation](/help-center/s/academic/academic-timetable-generation) — Generate timetables from assignments
- Settings > Teacher-Subject Assignments — Assign teachers to subjects for class-years (if managed from a separate page)
- Settings > Schedule Slots — Define periods for timetables
- Settings > Rooms — Manage rooms for subject assignment

---

*Category: `academic` | Language: `en`*
