# Rooms

The Rooms page lets you manage rooms that belong to buildings in your organization's schools. School administrators and staff use it to add rooms (e.g. room numbers or names), assign each room to a building, and optionally assign a staff member as room warden or supervisor. Rooms are used in hostel management, timetabling, and other features that need a physical space. Setting up rooms correctly depends on having buildings configured first.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by room number, building name, or staff/warden name. Type in the filter panel to filter the list (client-side filter on the current page).

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Room Number | Room identifier (e.g. 101, Block-A-1). |
| Building | Building the room belongs to. Shows "N/A" if not set. |
| Staff/Warden | Name of the staff member assigned as warden or supervisor; if a duty is set, it appears below the name (e.g. "Warden"). Shows "No staff assigned" when empty. |
| Created At | Date the room was created. |
| Actions | Edit and Delete buttons. |

### Row Actions

When you click the actions on any row:

- **Edit** — Opens the create/edit dialog with the room's current number, building, and staff so you can update them.
- **Delete** — Opens a confirmation dialog. Confirm to remove the room.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Room

To add a room, click the **"Add Room"** button in the page header. A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Room Number | Text | Yes | Room identifier (e.g. 101, A-1). Max 100 characters. |
| Building | Select | Yes | Building this room belongs to. Choose from the list of buildings (buildings are loaded from your organization). |
| Staff/Warden (Optional) | Select | No | Staff member to assign as warden or supervisor. Choose "No staff assigned" to leave unassigned, or pick a staff member (name or "Staff Warden" + employee ID is shown). |

Click **"Create"** to save. On success, the dialog closes and the table refreshes.

---

## Editing a Room

To edit a room:

1. Find the room in the table.
2. Click the Edit (pencil) button on that row.
3. Change Room Number, Building, and/or Staff/Warden.
4. Click **"Update"**.
5. On success, the dialog closes and the table refreshes.

---

## Deleting a Room

To delete a room:

1. Click the Delete (trash) button on the row.
2. A confirmation dialog appears with the room number and a note about the action.
3. Click **"Delete"** to confirm or **"Cancel"** to keep it.
4. The room is removed from the list.

---

## Export Options

PDF and Excel export are available via the report export buttons in the page header. Exports include: Room Number, Building Name, Staff/Warden name (and duty if present), and Created At. Dates are formatted according to your calendar preference. The export uses the current search filter so only matching rooms are included.

---

## Tips & Best Practices

- **Building first** — Ensure buildings exist (Settings → Buildings) before adding rooms; each room must belong to a building.
- **Room numbers** — Use a consistent scheme (e.g. floor-room: 101, 102) so rooms are easy to find in hostel and timetable features.
- **Staff/Warden** — Assigning a warden helps with hostel and room-level responsibility; you can leave it unassigned and set it later.

---

## Related Pages

- [Buildings](/help-center/s/settings/settings-buildings) — Manage buildings; rooms require a building.
- [Organizations](/help-center/s/settings/settings-organizations) — View organization information.
- [Profile](/help-center/s/settings/settings-profile) — Manage your profile.

---

*Category: `settings` | Language: `en`*
