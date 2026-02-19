# Hostel Management

The Hostel Management page is the central view for monitoring your school’s hostel (boarding) setup. It shows room occupancy, which students are in which rooms, which staff are assigned as wardens, and how many boarders are still waiting for a room. School administrators and hostel staff use this page to track capacity, spot empty beds, and see warden coverage across buildings. Room and building setup is done in **Settings** (Buildings and Rooms); student room assignment is tied to admissions (boarder residency). This page is read-only and does not create or edit rooms or assignments.

---

## Page Overview

When you open the Hostel Management page, you will see:

### Summary Cards

- **Rooms Occupied** — Number of rooms that have at least one student assigned. The description under the card shows total rooms (e.g. “X total rooms”).
- **Students in Hostel** — Total number of students currently assigned to rooms. The description shows how many boarders are still waiting for a room assignment.
- **Buildings** — Total number of buildings that have hostel rooms. The description indicates these are across your hostel network.
- **Warden Coverage** — Number of unique wardens (staff) assigned to rooms. The description shows how many rooms have an assigned warden.

### Filters & Search

- **Building** — Filter rooms by building. Options: “All buildings” or one building at a time. Use this to focus on a single building.
- **Search** — Search by room number, building name, warden (staff) name, or student name/admission number. Type in the search box to narrow the list.

---

## Data Table

The main table is **Room Occupancy**. It lists one row per room with the following columns:

| Column | Description |
|--------|-------------|
| Room | Room number (e.g. 101, A-2). |
| Building | Building name the room belongs to, or “Unassigned” if the room is not linked to a building. |
| Warden | Name of the staff member assigned as warden for that room, or “Not assigned” if none. |
| Occupancy | Badge showing how many students are in the room (e.g. “3 students”). |
| Students | List of student names in that room as badges. If none, shows “No students assigned”. |

The table is paginated. You can change page size (e.g. 25, 50) and move between pages using the controls below the table.

### Row Actions

This page does not have row actions (no Edit or Delete per room). It is a monitoring view. To add or edit rooms, buildings, or warden assignments, use **Settings → Buildings** and **Settings → Rooms**. To assign or change which room a student is in, use the student admission or residency flow where the student is marked as a boarder and assigned a room.

### Bulk Actions

No bulk actions are available on this page.

---

## Export Options

- **Export occupancy CSV** — A button at the top-right (next to the page title) exports the **currently filtered** room list to a CSV file named `hostel-occupancy-report.csv`. The CSV includes: Room number, Building, Warden, Occupancy (count), and Students (names separated by “ | ”). If you filter by building or search, only the visible (filtered) rooms are exported. The button is disabled when there are no rooms to export.

---

## How Room and Warden Data Is Set Up

Hostel Management only **displays** data; it does not create or edit it.

- **Buildings and rooms** — Created and managed under **Settings → Buildings** and **Settings → Rooms**. Each room can be linked to a building.
- **Wardens** — Assigned to rooms in **Settings → Rooms** (or equivalent room configuration). The same staff member can be warden for more than one room.
- **Students in rooms** — Students who are boarders and assigned to a room (e.g. during admission or in student residency/class assignment) appear here. Unassigned boarders are those marked as boarders but not yet assigned to any room; they are summarized on this page and listed in detail on **Hostel Reports**.

---

## Tips & Best Practices

- Use the **Building** filter to focus on one building when checking capacity or warden coverage.
- Use **Search** by student name or admission number to quickly see which room a student is in.
- Export CSV regularly if you need paper or offline lists for hostel checks or audits.
- Check the “boarders waiting for rooms” count on the Students card and use **Hostel Reports → Unassigned Boarders** to assign them to rooms.
- Ensure every room that should have supervision has a warden assigned in Settings so “Warden Coverage” reflects reality.

---

## Related Pages

- [Hostel Reports](/help-center/s/hostel/hostel-reports) — Building utilization, warden coverage, assigned and unassigned boarders, and PDF/Excel exports.
- **Settings → Buildings** — Add and manage buildings used for hostel.
- **Settings → Rooms** — Add rooms, link them to buildings, and assign wardens.

---

*Category: `hostel` | Language: `en`*
