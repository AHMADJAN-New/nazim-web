# Classes

The Classes page is where you define base classes (e.g., Grade 10, Grade 11) and assign them to academic years with optional sections, rooms, and capacity. You can also bulk-create sections for a class in one year and copy class assignments from one academic year to another. School administrators use this page to set up the class structure that is then used for subject assignments, timetables, and student admissions.

---

## Page Overview

When you open the Classes page (Settings > Classes), you will see a card with three tabs: **Base Classes**, **Year Classes**, and **Copy Classes**.

### Summary Cards

This page does not have summary cards.

### Tabs

- **Base Classes** — List of all base class definitions (name, code, grade level, capacity, active status). Here you add, edit, delete base classes and view class history.
- **Year Classes** — Class instances per academic year. You select an academic year and see a table of classes assigned to that year (with section, room, capacity, student count). Here you assign a class to a year, bulk-create sections, and edit or remove class instances.
- **Copy Classes** — Copy class instances (and optionally their subject/teacher assignments) from one academic year to another.

---

## Base Classes Tab

### Filters & Search

- **Search** — Search by class name, code, or description. Type in the search box to filter the table.

### Data Table

| Column | Description |
|--------|-------------|
| Name | Base class name (e.g., Grade 10). |
| Code | Short code for the class (e.g., G10). |
| Grade Level | Numeric grade level (0–12) or "-" if not set. |
| Default Capacity | Default maximum students per class instance (e.g., 30). |
| Is Active | Badge: Active or Inactive. |
| Actions | History (clock icon), Edit (pencil), Delete (trash). |

### Row Actions (Base Classes)

- **View History** — Opens a dialog showing past academic years, sections, teacher, room, and student count for this class.
- **Edit** — Opens the edit class form with current data.
- **Delete** — Opens a confirmation dialog. Confirming deletes the base class (and may affect class instances; see Deleting a Class).

### Creating a New Base Class

1. Click **Add Class**.
2. In the dialog, fill in:
   - **Name** * (required) — e.g., "Grade 10".
   - **Code** * (required) — e.g., "G10".
   - **Grade Level** (optional) — Number 0–12.
   - **Description** (optional) — Text up to 500 characters.
   - **Default Capacity** — Number 1–200 (default 30).
   - **Is Active** — Toggle; default On.
3. Click **Save**.

The new base class appears in the Base Classes table. You can then assign it to an academic year in the Year Classes tab.

### Editing a Base Class

1. In the Base Classes table, click the Edit (pencil) button for the row.
2. Change any fields (Name, Code, Grade Level, Description, Default Capacity, Is Active).
3. Click **Save**.

### Deleting a Base Class

1. Click the Delete (trash) button for the row.
2. In the confirmation dialog, read the warning (deleting may affect class instances and related data).
3. Click **Delete** to confirm.

Only users with delete permission can delete. If the class is in use (e.g., has students or subject assignments), the system may prevent deletion or show a warning.

---

## Year Classes Tab

Select an **Academic Year** from the dropdown. The table then shows all class instances (base class + section) assigned to that year.

### Data Table (Year Classes)

| Column | Description |
|--------|-------------|
| Name | Base class name (e.g., Grade 10). |
| Section | Section name (e.g., A, B) or "-". |
| Room | Room number (or "-") if assigned. |
| Capacity | Capacity for this instance (or class default). |
| Student Count | Current number of students in this class instance. |
| Actions | Edit instance, Remove from year. |

### Row Actions (Year Classes)

- **Edit** — Opens the Assign/Edit dialog for this class instance so you can change Section, Room, Capacity, Notes.
- **Remove** — Removes this class instance from the academic year (confirmation required). Does not delete the base class.

### Assigning a Class to an Academic Year

1. Select an **Academic Year**.
2. Click **Assign to Year**.
3. In the dialog:
   - **Select Class** * — Choose the base class.
   - **Select Academic Year** * — Choose the year (pre-filled if one is selected).
   - **Section Name** (optional) — e.g., "A" or "1".
   - **Select Room** (optional) — Assign a room.
   - **Capacity** (optional) — Override default capacity.
   - **Notes** (optional).
4. Click **Save**.

The class instance appears in the Year Classes table for that year.

### Bulk Create Sections

1. Select an **Academic Year**.
2. Click **Bulk Create Sections**.
3. In the dialog:
   - **Select Class** * — Base class.
   - **Select Academic Year** * — Year.
   - **Sections** * — Comma-separated section names (e.g., "A, B, C, D").
   - **Default Room** (optional) — Applied to all created sections.
   - **Default Capacity** (optional) — Applied to all.
4. Click **Create Sections**.

One class instance per section is created for that year.

### Editing a Class Instance (Year)

1. In the Year Classes table, click Edit for the row.
2. The Assign dialog opens with Class and Academic Year disabled. Change **Section Name**, **Room**, **Capacity**, or **Notes**.
3. Click **Save**.

### Removing a Class Instance from a Year

1. Click the Remove (trash) button for the row.
2. Confirm in the dialog. The instance is removed from that academic year; the base class remains.

---

## Copy Classes Tab

Use this tab to copy class instances from one academic year to another, optionally including their subject/teacher assignments.

1. Select the **Academic Year** that will be the *source* (from which to copy).
2. Click **Copy Classes**.
3. In the dialog:
   - **From Year** * — Source academic year (often pre-filled).
   - **To Year** * — Target academic year.
   - **Select Classes** * — Check the class instances to copy (list shows class name and section).
   - **Copy Assignments** — Check to also copy subject/teacher assignments to the target year.
4. Click **Copy Classes**.

The selected class instances (and optionally assignments) are created in the target year.

---

## Class History Dialog

When you click **View History** on a base class, a dialog opens with a table of that class across academic years: Academic Year, Section, Teacher, Room, Student Count. Use this to see how the class was used in past years.

---

## Export Options

- **Base Classes tab** — Export button exports the filtered base classes (Name, Code, Grade Level, Default Capacity, Is Active) to PDF or Excel. Filter summary (e.g., search) is included when applicable.
- **Year Classes tab** — When an academic year is selected and the table has data, an Export button exports class name, section, room, capacity, and student count for that year to PDF or Excel.

---

## Tips & Best Practices

- Create base classes first (Base Classes tab), then assign them to academic years (Year Classes tab). Use sections (A, B, C) when you have multiple sections of the same grade.
- Use **Bulk Create Sections** to add several sections (e.g., A, B, C, D) in one step instead of assigning the same class multiple times.
- At the start of a new academic year, use **Copy Classes** from the previous year to replicate the structure, and optionally **Copy Assignments** to carry over subject assignments.
- Set **Default Capacity** on base classes so new instances inherit a sensible value; override per instance in Year Classes if needed.
- Use **View History** to see how a class was configured in past years before copying or reusing it.

---

## Related Pages

- [Academic Years](/help-center/s/academic/academic-years) — Create and manage academic years
- [Subjects](/help-center/s/academic/subjects) — Assign subjects to classes and teachers
- [Timetables](/help-center/s/academic/timetables) — Build timetables from class and subject assignments
- Settings > Schedule Slots — Define periods for timetables
- Settings > Teacher-Subject Assignments — Assign teachers to subjects for classes
- Settings > Rooms — Manage rooms for class assignment

---

*Category: `academic` | Language: `en`*
