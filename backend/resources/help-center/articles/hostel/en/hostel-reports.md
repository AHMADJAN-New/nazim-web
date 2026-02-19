# Hostel Reports

The Hostel Reports page gives you detailed analytics on hostel utilization: how many boarders you have, how many are assigned to rooms versus waiting for placement, how buildings and rooms are used, and which wardens cover which rooms. School administrators and hostel staff use this page to monitor capacity, plan room assignments, and export data for records or audits. Each report section can be exported to PDF or Excel.

---

## Page Overview

When you open the Hostel Reports page, you will see:

### Summary Cards

- **Boarders** — Total number of boarders (students with boarder residency). The description shows how many are already assigned to rooms.
- **Unassigned Boarders** — Number of students marked as boarders who do not yet have a room. The description says they are waiting for room placement.
- **Buildings Tracked** — Total number of buildings that have hostel rooms. The description shows how many rooms exist across those buildings.
- **Wardens with Assignments** — Number of unique wardens (staff) who have at least one room assigned. The description indicates rooms currently supervised.

### Tabs

The page has five tabs. Each tab shows a different report or list.

1. **Buildings** — Building utilization: rooms per building, occupied rooms, boarders assigned, wardens covering.
2. **Wardens** — Warden coverage: which wardens cover which buildings and rooms, and how many students each supervises.
3. **Rooms** — Room & Buildings report: a hierarchical view of buildings → rooms → students in each room.
4. **Assigned** — Table of all boarders currently assigned to a room, with search and filters; supports PDF/Excel export.
5. **Unassigned** — Table of boarders who do not yet have a room; supports PDF/Excel export.

---

## Tab 1: Building Utilization

This tab shows one row per building.

### Table Columns

| Column | Description |
|--------|-------------|
| Building | Building name. |
| Rooms | Total number of rooms in that building. |
| Occupied | Number of rooms that have at least one student (e.g. “3 of 10”). |
| Boarders | Number of students assigned to rooms in that building. |
| Rooms with wardens | Number of rooms that have a warden assigned. |
| Utilization | Progress bar and percentage of rooms that are occupied (occupied ÷ total rooms). |

If there are no buildings with rooms, the table shows: “No building data available.”

### Export

Use the **Report export** buttons (PDF and Excel) next to the tab content. The export includes: building name, total rooms, occupied rooms, boarders assigned, wardens covering, and utilization rate. Exports reflect the current data (no extra filters on this tab).

---

## Tab 2: Warden Coverage

This tab shows one row per warden (staff member who has at least one room assigned).

### Table Columns

| Column | Description |
|--------|-------------|
| Warden | Warden name, or “Not assigned” for rooms without a warden. |
| Buildings | Number of different buildings this warden has rooms in. |
| Rooms | Number of rooms this warden is responsible for. |
| Boarders | Number of students in those rooms. |
| Coverage | Badge with the student count (e.g. “X students”). |

If no wardens are assigned to any room, the table shows: “No wardens assigned to rooms yet.”

### Export

Use the **Report export** buttons (PDF and Excel). The export includes: warden name, buildings count, rooms count, and students (boarders) count.

---

## Tab 3: Room & Buildings Report

This tab shows a **hierarchical view**: each building is a section; under it are its rooms; under each room are the students (boarders) in that room.

- For each **building**: you see the building name, number of rooms and boarders, and a badge like “X/Y occupied” (occupied rooms / total rooms).
- For each **room**: you see room number, warden name (if any), and number of boarders. Clicking or expanding shows a grid of students in that room with name and admission number.

If there are no buildings, the message is: “No buildings available.”

This tab is for on-screen reading only; it does not have its own export. For exported room-level data, use the **Assigned** tab export.

---

## Tab 4: Assigned Boarders

This tab lists all students who are boarders and **are** assigned to a room.

### Filters & Search

- **Search** — Search by student name, admission number, room number, or building name. Use the clear (X) button to reset search.
- **Building** — Filter by building. Options: “All buildings” or a specific building. Changing building resets the Room filter to “All rooms”.
- **Room** — Filter by room. Options: “All rooms” or rooms from the selected building (or all rooms if building is “All buildings”).

### Table Columns

| Column | Description |
|--------|-------------|
| Student | Student full name. |
| Admission # | Admission number. |
| Building | Building name for the room. |
| Room | Room number (shown as a badge). |
| Admission Year | Admission year for the student. |

If no boarders are assigned yet, the message is: “No boarders assigned to rooms yet.” If filters return no rows: “No boarders found matching your search criteria.”

### Pagination

You can choose **per page**: 10, 25, 50, or 100. The footer shows “Showing X to Y of Z boarders” and previous/next page controls.

### Export

Use the **Report export** buttons (PDF and Excel). The export uses the **current filters** (search, building, room). Columns exported: student name, admission number, building name, room number, admission year.

---

## Tab 5: Unassigned Boarders

This tab lists boarders who **do not** have a room assignment yet.

### Filters & Search

- **Search** — Search by student name, admission number, or class. Use the clear (X) button to reset.

### Table Columns

| Column | Description |
|--------|-------------|
| Student | Student full name. |
| Admission # | Admission number. |
| Class | Class name. |
| Residency Type | Residency type (e.g. Boarder). Shown as a badge. |

If all boarders are placed, the message is: “All boarders have been placed in rooms.” If search returns no rows: “No boarders found matching your search criteria.”

### Pagination

Same as Assigned: per page (10, 25, 50, 100) and “Showing X to Y of Z boarders” with previous/next.

### Export

Use the **Report export** buttons (PDF and Excel). The export uses the **current search**. Columns exported: student name, admission number, class, residency type.

---

## Export Options (All Tabs)

- **PDF** — Generates a PDF report with title, optional filter summary, and the table data for the active tab. Use the export buttons next to each tab’s title (Buildings, Wardens, Assigned, Unassigned).
- **Excel** — Generates an Excel file with the same data. Filters (search, building, room) on Assigned and Unassigned tabs are applied to the exported data.

Exports are based on the data currently shown (and filtered) in that tab. The **Room & Buildings** tab is view-only; for room/student lists in PDF or Excel, use the **Assigned Boarders** export.

---

## Tips & Best Practices

- Check **Unassigned Boarders** regularly and assign rooms via your student/admission flow so the count stays low.
- Use **Building Utilization** to see which buildings are underused or full and to plan room assignments.
- Use **Warden Coverage** to balance workload and ensure every room has a warden where required.
- Export **Assigned Boarders** or **Unassigned Boarders** to Excel when you need to share lists with hostel staff or for offline planning.
- Use search and building/room filters on the Assigned tab to export lists for a single building or room (e.g. for a warden).

---

## Related Pages

- [Hostel Management](/help-center/s/hostel/hostel) — Overview of room occupancy, students per room, and warden coverage with CSV export.
- **Settings → Buildings** — Manage buildings used for hostel.
- **Settings → Rooms** — Manage rooms and assign wardens.

---

*Category: `hostel` | Language: `en`*
