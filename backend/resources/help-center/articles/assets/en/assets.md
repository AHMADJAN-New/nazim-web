# Assets

The Assets module helps your school track and manage physical assets such as equipment, furniture, and devices. School administrators and staff use it to register assets, assign them to staff or students or rooms, log maintenance, and run reports on value and status. All data is scoped to your organization and school.

---

## Page Overview

The Assets area is made up of several pages and tabs:

### Main Entry Points

- **Assets Dashboard** (`/assets/dashboard`) — Overview with summary cards, status breakdown, assets by category, recent assignments, and quick links to other asset pages.
- **Assets** (`/assets`) — Main list of assets with two tabs: **Assets** (inventory list, create/edit/delete, view details, print labels, export) and **Maintenance** (log and manage maintenance records).
- **Asset Assignments** (`/assets/assignments`) — List of all assignments (asset assigned to staff, student, or room) with create, edit, return/remove, and export.
- **Asset Categories** (`/assets/categories`) — Manage categories used to group assets (e.g. Electronics, Furniture). Create, edit, delete, search, and export.
- **Asset Reports** (`/assets/reports`) — Analytics: summary stats, status breakdown, category breakdown, assets needing maintenance, and value analysis (top valued assets, maintenance cost leaders).

### Typical Flow

1. **Define categories** — In Asset Categories, create categories (e.g. Laptops, Furniture) so you can filter and report by category.
2. **Register assets** — On the Assets page (Assets tab), click **New Asset** and fill in name, tag, category, purchase price/date, location (school, building, room), finance account, and optional details. You can set total copies for items that have multiple units.
3. **Assign assets** — Use the Asset Assignments page to assign an asset (or a specific copy) to a staff member, student, or room. You can set assigned date and expected return date.
4. **Log maintenance** — On the Assets page, open the **Maintenance** tab to log maintenance (type, status, performed on, next due, cost, vendor). You can also view and edit maintenance from the main Assets list when combined with assignment/history features.
5. **Review reports** — Use the Assets Dashboard for a quick overview and Asset Reports for status breakdown, category breakdown, assets needing attention, and value/maintenance cost analysis.

---

## Summary Cards (Assets List Page)

On the **Assets** tab of the Assets page you will see:

- **Total Assets** — Count of asset types (not total copies).
- **Purchase Value** — Sum of purchase prices (one unit per asset type).
- **Maintenance Spend** — Total maintenance cost recorded.
- **Available** — Count of assets (or copies) with status Available.

---

## Filters & Search (Assets List)

- **Search** — Search by asset name, asset tag, or serial number.
- **Status** — Filter by: All Statuses, Available, Assigned, Maintenance, Retired, Lost, Disposed.

---

## Data Table (Assets List)

| Column | Description |
|--------|-------------|
| Name | Asset name with asset tag below. |
| Status | Badge: Available (green), Assigned (blue), Maintenance (yellow), Retired/Lost/Disposed (gray/red). |
| Purchase Price | Purchase price or N/A. |
| Copies | Available copies, total copies, and assigned count (badges). |
| Location | Room number, or building name, or school name, or "Unassigned". |
| Actions | View details, Print label, Edit, Delete. |

### Row Actions

- **View Details** — Opens a side panel with asset information and an Assignment History tab.
- **Print Label** — Opens a print preview of a 3"×2" label with asset name, tag, label number, and QR code for scanning.
- **Edit** — Opens the create/edit asset form with current data.
- **Delete** — Opens a confirmation dialog; confirming permanently deletes the asset.

---

## Creating a New Asset

1. On the **Assets** page, open the **Assets** tab.
2. Click **New Asset**.
3. In the dialog, fill in:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Asset name. |
| Asset Tag | Text | Yes | Unique tag for identification (e.g. AST-001). |
| Status | Select | No | Available, Assigned, Maintenance, Retired, Lost, Disposed. Default: Available. |
| Category | Select | No | From existing asset categories. |
| Serial Number | Text | No | Manufacturer serial number. |
| Purchase Price | Number | Yes | Must be greater than 0. |
| Total Copies | Number | No | Number of identical units (default 1). |
| Purchase Date | Date | Yes | Date of purchase. |
| Warranty Expiry | Date | No | Warranty end date. |
| Vendor | Text | No | Supplier or vendor name. |
| School | Select | No | School location. |
| Building | Select | No | Building; filters rooms when selected. |
| Room | Select | No | Room; list filtered by building if selected. |
| Finance Account | Select | Yes | Finance account to link asset value to. |
| Currency | Select | No | Currency for price; can auto-fill from account. |
| Notes | Textarea | No | Free-text notes. |

4. Click **Create** (or **Update** when editing).

### What Happens After Submission

- The asset is saved and the table refreshes. Success and error messages appear via toast notifications. Duplicate asset tags are not allowed by the system.

---

## Editing an Asset

1. Find the asset in the table.
2. Click the **Edit** (pencil) action.
3. Change any fields in the dialog.
4. Click **Update**.

---

## Deleting an Asset

1. Click the **Delete** (trash) action on the row.
2. In the confirmation dialog, confirm. The asset is permanently removed. Ensure the asset is not required in reports or assignments before deleting.

---

## Asset Assignments (Dedicated Page)

From **Asset Assignments** you can:

- **Filter** by assignment status: All, Active, Returned, Transferred.
- **Create** a new assignment: choose asset, assignee type (Staff, Student, Room, Other), assignee, assigned on date, expected return date, notes.
- **Edit** an assignment to update dates or notes.
- **Remove** an assignment (return or cancel).
- **Export** the assignments list (PDF/Excel) via the report export buttons.

---

## Maintenance Tab (Assets Page)

On the **Assets** page, **Maintenance** tab:

- **Filter** by maintenance status: All, Scheduled, In Progress, Completed.
- **Log maintenance** — Select asset (searchable), maintenance type, status, performed on, next due date, cost, vendor, notes.
- **Edit** or **Delete** a maintenance record; **Mark as Completed** for scheduled/in-progress records.
- **Export** maintenance records via the report export buttons.

---

## Export Options

- **Assets list** — On the Assets tab, use the export (PDF/Excel) controls in the card header. Exports respect current search and status filter and include columns such as name, tag, status, category, serial number, purchase price, copies, dates, vendor, location.
- **Assignments** — On the Asset Assignments page, use the export buttons to generate PDF or Excel of the current assignment list.
- **Maintenance** — On the Maintenance tab, use the export buttons to generate PDF or Excel of maintenance records.
- **Categories** — On the Asset Categories page, use the export buttons to export the category list (name, code, description, order, status).

---

## Tips & Best Practices

- **Use unique asset tags** — Each asset should have a unique tag for quick identification and scanning (e.g. QR labels).
- **Set a finance account** — Linking each asset to a finance account keeps asset value aligned with your chart of accounts.
- **Use categories** — Create categories first (e.g. IT, Furniture, Vehicles) so you can filter and report by category.
- **Log maintenance** — Record maintenance and next due dates so the "Needs Maintenance" report stays useful.
- **Print labels** — Use **Print Label** for physical tagging; the QR code can encode asset ID and tag for future scanning.

---

## Related Pages

- [Assets Dashboard](/help-center/s/assets/assets-dashboard) — Overview, charts, and quick links.
- [Asset Assignments](/help-center/s/assets/assets-assignments) — Assign assets to staff, students, or rooms.
- [Asset Categories](/help-center/s/assets/assets-categories) — Manage asset categories.
- [Asset Reports](/help-center/s/assets/assets-reports) — Status, category, maintenance, and value reports.

---

*Category: `assets` | Language: `en`*
