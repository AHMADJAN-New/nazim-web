# Academic Timetable Generation

The Timetable Generation page lets you automatically build class timetables from teacher–subject assignments. You choose an academic year, select which classes and time slots to include, optionally set teacher preferences (blocked periods), then run the solver. The system assigns each teacher–subject–class combination to a period and day without conflicts. Administrators and academic staff use this page to create and adjust timetables before saving or exporting them.

---

## Page Overview

When you open the Timetable Generation page, you will see:

### Summary Cards

This page does not have summary cards. The main content is a configuration card and, after generation, a results table.

### Filters & Options

- **Academic Year** — Required dropdown. Select the academic year for which you are building the timetable. The list of classes and schedule slots is filtered by this year. The current academic year is pre-selected when available.
- **Select Classes** — A scrollable list of checkboxes showing classes (and sections) for the selected academic year. You must select at least one class. A checkbox **"Show only classes with assignments"** filters the list to classes that already have teacher–subject assignments; use this to avoid empty classes.
- **Select Days** — Checkboxes for each day (Saturday through Friday). Select at least one day unless you use **"All Year"**. The **"All Year"** checkbox, when checked, uses a single generic day for the whole year and disables the day list.
- **Select Periods** — A scrollable list of schedule slots (periods) with name and time range (e.g., "Period 1 — 08:00 - 08:45"). Select at least one period. A **"Teacher Preferences"** button opens a dialog where you can block specific periods for specific teachers so the solver will not assign them in those slots.

---

## Generating a Timetable

1. Select an **Academic Year** (required).
2. Select one or more **Classes**.
3. Select one or more **Days** (or check **All Year**).
4. Select one or more **Periods**.
5. Optionally click **Teacher Preferences** and block periods for teachers who cannot teach in those slots.
6. Click **Generate**.

The system runs an automated solver that:
- Assigns each teacher–subject–class combination to a period and day.
- Avoids double-booking teachers (same teacher, same slot, same day).
- Avoids double-booking classes (same class, same slot, same day).
- Respects teacher blocked slots from preferences.

If some assignments cannot be placed (e.g., not enough slots), a warning appears with the count of unscheduled assignments, and the generated timetable shows only what could be scheduled. You can add more periods or days and generate again, or adjust teacher preferences.

After generation, a **Results** card appears with the timetable in two views (Teacher View and Class View), and you can **Save**, **Load**, **Print**, or **Export** (PDF/Excel).

---

## Teacher Preferences

Click **Teacher Preferences** next to "Select Periods" to open the preferences dialog. Here you can block specific schedule slots for specific teachers (e.g., a teacher who is not available in the first period). Blocked slots are excluded when generating the timetable for that teacher. Set preferences for the same academic year you use when generating.

---

## What Happens After Generation

- A success message shows how many entries were scheduled. If any assignments could not be scheduled, a warning shows the unscheduled count.
- The Results card appears with tabs: **Teacher View** (rows = teachers, cells = class and subject per slot/day) and **Class View** (rows = classes, cells = subject and teacher per slot/day).
- You can drag and drop entries to move them to another cell, provided the move does not create a conflict (same teacher or same class in the same slot/day).
- Buttons become available: **Save** (save timetable with a name), **Load Timetable** (load a previously saved timetable), **Print**, and **Export** (PDF/Excel).

---

## Tips & Best Practices

- Define **Academic Years**, **Classes**, **Schedule Slots**, and **Teacher–Subject Assignments** in Settings before generating timetables.
- Use **"Show only classes with assignments"** to keep the class list manageable and avoid generating empty timetables.
- Set **Teacher Preferences** for teachers with fixed unavailability to reduce unscheduled assignments.
- If many assignments remain unscheduled, add more periods or days, or split sections across more slots, then generate again.
- After generating, use **Save** to store the timetable with a clear name (e.g., including academic year and date) so you can **Load** it later.

---

## Related Pages

- [Timetables](/help-center/s/academic/timetables) — Load, save, and export timetables
- [Classes](/help-center/s/academic/classes) — Manage classes and assign them to academic years
- [Subjects](/help-center/s/academic/subjects) — Manage subjects and assign them to classes
- [Academic Years](/help-center/s/academic/academic-years) — Manage academic years
- Settings > Schedule Slots — Define periods (name, start time, end time)
- Settings > Teacher-Subject Assignments — Assign teachers to subjects for classes

---

*Category: `academic` | Language: `en`*
