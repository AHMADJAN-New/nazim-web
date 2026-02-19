# Buildings

The Buildings page lets you manage buildings that belong to your organization's schools. School administrators and staff use it to add buildings (e.g. main block, hostel block), assign them to a school, and see how many rooms each building has. Buildings are used when defining rooms; rooms belong to a building, and buildings belong to a school. Setting up buildings correctly ensures room and hostel management work as expected.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by building name. Type in the filter panel to narrow the list.
- **School** — (When your organization has more than one school.) Filter buildings by school. The list and exports respect the selected school when multiple schools exist.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Building Name | Name of the building (e.g. Main Block, Hostel A). |
| School | School the building belongs to. Shows "N/A" if not set. |
| Rooms | Number of rooms in the building (e.g. "3 rooms"). |
| Created At | Date the building was created. |
| Actions | Edit and Delete buttons. |

### Row Actions

When you click the actions on any row:

- **Edit** — Opens the create/edit dialog with the building's current name and school so you can update it.
- **Delete** — Opens a confirmation dialog. If the building has rooms assigned, deletion will fail; remove or reassign rooms first.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Building

To add a building, click the **"Add Building"** button in the page header. A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| School | Select or read-only | Yes | School this building belongs to. If you have only one school, it is auto-selected and shown as read-only. If multiple, choose from the dropdown. |
| Building Name | Text | Yes | Name of the building (max 100 characters). |

Click **"Create"** to save. On success, the dialog closes and the table refreshes. If school is missing, an error message appears.

---

## Editing a Building

To edit a building:

1. Find the building in the table.
2. Click the Edit (pencil) button on that row.
3. Change Building Name and/or School (if the dropdown is shown).
4. Click **"Update"**.
5. On success, the dialog closes and the table refreshes.

---

## Deleting a Building

To delete a building:

1. Click the Delete (trash) button on the row.
2. A confirmation dialog appears, showing the building name and a note that if the building has rooms assigned, deletion will fail.
3. Click **"Delete"** to confirm or **"Cancel"** to keep it.
4. If the building has any rooms, the system will not delete it; remove or reassign rooms first.

---

## Export Options

PDF and Excel export are available via the report export buttons in the page header. Exports include: Building Name, School Name, Organization Name (if applicable), Rooms Count, and Created At. Dates are formatted according to your calendar preference. The export uses the current filter (e.g. search and selected school) so only matching buildings are included.

---

## Tips & Best Practices

- **Naming** — Use clear, consistent names (e.g. "Main Block", "Hostel Block A") so staff can find buildings quickly when assigning rooms.
- **School** — Ensure each building is assigned to the correct school so rooms and reports are scoped correctly.
- **Before delete** — Check the Rooms column; if it is not zero, remove or move rooms to another building before deleting.

---

## Related Pages

- [Rooms](/help-center/s/settings/settings-rooms) — Add and manage rooms inside buildings; rooms require a building.
- [Organizations](/help-center/s/settings/settings-organizations) — View and edit organization information.
- [Profile](/help-center/s/settings/settings-profile) — Manage your profile and default school.

---

*Category: `settings` | Language: `en`*
