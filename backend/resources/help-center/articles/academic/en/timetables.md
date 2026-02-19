# Timetables

The Timetables page is where you generate, view, edit, save, and load class timetables. It is the same page as Timetable Generation: after you generate a timetable, you see results in Teacher View or Class View, can drag entries to different slots, save the timetable with a name, load a previously saved timetable, and export to PDF or Excel. School administrators and academic staff use this page to manage weekly (or full-year) teaching schedules for all classes.

---

## Page Overview

When you open the Timetables page, you will see:

### Summary Cards

This page does not have summary cards. The main content is the generation configuration and, after generation or load, the results table.

### Main Controls

- **Academic Year** — Dropdown to select the academic year. Required for generation and for saving; also used when loading to show which timetables apply.
- **Load Timetable** — Button (top right) that opens a dialog to select and load a previously saved timetable. You can load any saved timetable for your organization; the loaded entries replace the current view and selected classes/days/periods are updated to match.
- After generation or load: **Results** card with **Teacher View** and **Class View** tabs, and buttons for **Export** (PDF/Excel), **Print**, and **Save**.

---

## Results Table (Teacher View and Class View)

After you generate a timetable or load a saved one, a results card appears.

### Teacher View

- Rows: one per teacher who has at least one assignment in the current timetable.
- Columns: first column is the teacher name; then for each day and each period there is a cell showing **Class** and **Subject** (or empty if no assignment).
- You can drag an entry (class + subject) from one cell and drop it into another. The move is allowed only if it does not create a conflict (same teacher or same class in the same slot and day). A success message appears when the move is applied.

### Class View

- Rows: one per class that has at least one assignment in the current timetable.
- Columns: first column is the class name; then for each day and each period there is a cell showing **Subject** and **Teacher** (or empty).
- Entries can be dragged and dropped in the same way as in Teacher View to reschedule without conflicts.

---

## Saving a Timetable

1. Generate a timetable (or load one and optionally edit it by dragging).
2. Click **Save**.
3. In the Save dialog, enter a **Name** (required) and optionally a **Description** and **Timetable type** (e.g., teaching).
4. Click the save/submit button in the dialog.

The timetable and all its entries are stored for your organization and academic year. You can load it later from **Load Timetable**.

---

## Loading a Timetable

1. Click **Load Timetable** at the top right.
2. In the dialog, a list of saved timetables is shown (e.g., by name and creation date).
3. Select one timetable and click the load button.

The page updates: the selected academic year, classes, days, and periods are set from the loaded timetable, and the results table shows the loaded entries. You can then edit (drag and drop), save again, or export.

---

## Export and Print

- **Export** — Use the export buttons (PDF and Excel) in the Results card header. The export includes the current timetable data (day, period, time, teacher, class, subject) and respects the current filters (academic year, days, classes). Export is disabled when there are no entries.
- **Print** — Click **Print** to open the browser print dialog. Print styles hide the rest of the page and show only the timetable section so you can print or save as PDF from the browser.

---

## Row and Cell Actions

- **Drag and drop** — In both Teacher View and Class View, you can drag an entry (grip icon or the cell content) and drop it in another cell. The system checks that the move does not double-book a teacher or a class in the same slot and day. If valid, the entry moves and a success message appears; if invalid, an error message is shown.

---

## Tips & Best Practices

- Save timetables with clear names (e.g., "2024-25 Term 1" or "1403 – All Classes") so you can find them when loading.
- Use **Load Timetable** to reopen a previous timetable before making small edits, then save again with a new name if you want to keep both versions.
- Export to PDF or Excel for sharing with teachers or for printing; the export reflects the current on-screen data and filters.
- Use Teacher View to check that no teacher has overlapping classes; use Class View to check that each class has a balanced weekly schedule.

---

## Related Pages

- [Academic Timetable Generation](/help-center/s/academic/academic-timetable-generation) — How to generate a timetable
- [Classes](/help-center/s/academic/classes) — Manage classes and assign to academic years
- [Subjects](/help-center/s/academic/subjects) — Manage subjects and teacher assignments
- [Academic Years](/help-center/s/academic/academic-years) — Manage academic years
- Settings > Schedule Slots — Define periods
- Settings > Teacher-Subject Assignments — Assign teachers to subjects for classes

---

*Category: `academic` | Language: `en`*
