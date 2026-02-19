# Attendance Totals Report

The Attendance Totals Report page gives you summarized attendance data: total sessions analyzed, students marked, attendance rate, absences, a status breakdown (Present, Absent, Late, Excused, Sick, Leave), and class-wise or room-wise breakdowns with recent sessions. You can filter by school, class, academic year, status, and date range (with presets: 1 week, 1 month, 4 months, or custom). Export options include **Totals**, **Class-wise**, and **Room-wise** reports in PDF or Excel.

---

## Page Overview

When you open the Attendance Totals Report page, you will see:

### Summary Cards (after data loads)

- **Sessions analyzed** — Total number of sessions in the filtered range.
- **Students marked** — Total number of student attendance records (marks) in the range.
- **Attendance rate** — Percentage (Present vs total records). Helper text: "Present vs total records."
- **Absences** — Total count of Absent status. Helper: "Across selected filters."

### Filters

The **Report filters** (or "Filters") panel includes:

- **School** — Searchable combobox. "All schools" or a specific school.
- **Class / Room** — Searchable combobox. "All classes" or a specific class.
- **Academic year** — Dropdown. "All years" or a specific academic year.
- **Status** — Dropdown. "All" or a specific status (Present, Absent, Late, Excused, Sick, Leave).
- **Date Range** — Tabs: **1 week**, **1 month**, **4 months**, **Custom**. Selecting a preset sets From/To dates. For **Custom**, two date pickers appear: **From date** and **To date**.

**Footer:** **Reset** button clears all filters (school, class, academic year, status, dates).

### Invalid Date Range

- If From date is after To date, a destructive alert is shown: "Invalid date range" and "Start date must be before the end date." The report may not load until the range is fixed.

### Page Actions

- **Refresh** — Secondary action to refetch the report with current filters.
- **Export** dropdown — Opens a menu with three sub-menus: **Totals**, **Class-wise**, **Room-wise**. Each sub-menu has **PDF** and **Excel**. Choosing an option generates that report variant with the current filters and opens the file when ready. Disabled when loading, when there is no report data, or while generating.

---

## Status Breakdown Card

A card titled **Status breakdown** shows a grid of all six statuses:

- **Present**, **Absent**, **Late**, **Excused**, **Sick**, **Leave**
- Each shows an icon, label, total count, and "records" (or equivalent). Totals reflect the current filters.

---

## Tabs: Class Sessions and Room Sessions

Two tabs switch the view between **Class** and **Room** sessions.

### Tab: Class Sessions

- **Class performance (Class breakdown)** — Table: Class, School, Attendance rate (%), Present, Absent, Records. One row per class. Empty state: "No class data available for this range."
- **School breakdown** — Table: School, Attendance rate (%), Present, Absent, Records. One row per school. Empty state: "No school data available."
- **Recent class attendance sessions** — Table: Date, Class, School, Attendance rate (%), Present, Absent, Records. One row per session that has a class. Empty state: "No class sessions found for this range."

### Tab: Room Sessions

- **Room performance (Room breakdown)** — Description text explaining that room-based sessions (not tied to a specific class) are shown here. Placeholder content may indicate "Room-based attendance sessions will be displayed here."
- **Recent room attendance sessions** — Table: Date, Room, School, Attendance rate (%), Present, Absent, Records. Sessions without a class assignment. Empty state: "No room sessions found for this range."

---

## Export Options

- **Totals** — PDF or Excel: summarized totals for the filtered range (e.g. sessions, students marked, rate, status counts).
- **Class-wise** — PDF or Excel: class-level breakdown (and related totals) for the filtered range.
- **Room-wise** — PDF or Excel: room-level breakdown (and related totals) for the filtered range.

All exports use the current filters (school, class, academic year, status, date range). Default school must be set; otherwise an error is shown. Calendar preference and language are applied. A progress dialog appears when the report is generated asynchronously.

---

## Tips & Best Practices

- **Use date presets** — Start with "1 month" or "4 months" to get a useful range, then switch to Custom if you need exact dates.
- **Filter by school or class** — Narrow by school or class to see performance for a specific campus or grade.
- **Check status breakdown** — Use the status breakdown card to see how many Late, Excused, Sick, and Leave records you have alongside Present and Absent.
- **Export after filtering** — Set filters first, then use Export > Totals / Class-wise / Room-wise and PDF or Excel as needed.

---

## Related Pages

- [Attendance](/help-center/s/attendance/attendance) — Create and close attendance sessions.
- [Mark Attendance](/help-center/s/attendance/attendance-marking) — Record attendance for a session.
- [Attendance Reports](/help-center/s/attendance/attendance-reports) — View and export individual attendance records with filters.

---

*Category: `attendance` | Language: `en`*
