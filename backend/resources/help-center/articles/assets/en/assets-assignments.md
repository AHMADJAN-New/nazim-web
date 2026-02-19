# Asset Assignments

The Asset Assignments page lists every assignment of an asset (or asset copy) to a staff member, student, or room. You can create new assignments, edit dates and notes, remove (return) assignments, and export the list to PDF or Excel. Assignments can be active, returned, or transferred.

---

## Page Overview

When you open the Asset Assignments page you will see a title and short description, a status filter and **New Assignment** button, and a table of all assignments with export buttons in the card header.

### Filters & Actions

- **Status** — Filter by: All Statuses, Active, Returned, Transferred.
- **New Assignment** — Opens a dialog to create a new assignment (only if you have update permission).

---

## Data Table

The main table shows:

| Column | Description |
|--------|-------------|
| Asset (Name) | Asset name, tag below, and badges for available copies, total copies, and assigned copies. |
| Assigned To | Assignee name (staff, student, or room) and type (staff/student/room). |
| Assigned On | Date the asset was assigned. |
| Expected Return | Expected return date (or N/A). |
| Status | Badge: Active (green), Returned (blue), Transferred (yellow). |
| Actions | Edit, Delete (if you have update permission). |

### Row Actions

- **Edit** — Opens the edit-assignment dialog so you can change assigned on date, expected return date, and notes. The asset and assignee type/assignee are fixed when editing.
- **Delete** — Removes (returns) the assignment after confirmation.

---

## Creating a New Assignment

1. Click **New Assignment**.
2. In the dialog:
   - **Asset** * (required) — Select the asset from the dropdown (name and tag shown). Only available when creating (not when editing).
   - **Type** * — Choose: Staff, Student, Room, or Other.
   - **Assignee** — Select the person or room. Options depend on Type (staff list, student list, or room list). "Unspecified" if you leave it blank.
   - **Assigned On** — Date assigned (optional but recommended).
   - **Expected Return Date** — When the asset should be returned (optional).
   - **Notes** — Free text (optional).
3. Click **Create**.

The table refreshes and the new assignment appears with status Active (or as configured by the system).

---

## Editing an Assignment

1. Find the assignment in the table.
2. Click **Edit** (pencil).
3. Update **Assigned On**, **Expected Return Date**, and **Notes**. Asset and assignee cannot be changed in edit mode.
4. Click **Update**.

---

## Removing (Returning) an Assignment

1. Click **Delete** (trash) on the row.
2. Confirm. The assignment is removed (treated as returned). The asset or copy becomes available again depending on your setup.

---

## Export Options

Use the **PDF** and **Excel** buttons in the card header to export the current assignment list. The export respects the current status filter and typically includes: asset name, asset tag, assigned to, assigned to type, assigned on, expected return, status, notes.

---

## Tips & Best Practices

- Set **Expected Return Date** for temporary assignments (e.g. loaned devices) so you can follow up when overdue.
- Use **Notes** to record reason for assignment or condition at handover.
- Filter by **Active** to see only current assignments when doing physical verification.
- Use **Returned** to review history of who had which asset and when.

---

## Related Pages

- [Assets](/help-center/s/assets/assets) — Register and edit assets; view copies.
- [Assets Dashboard](/help-center/s/assets/assets-dashboard) — Overview and recent assignments.
- [Asset Reports](/help-center/s/assets/assets-reports) — Reports on status and value.

---

*Category: `assets` | Language: `en`*
