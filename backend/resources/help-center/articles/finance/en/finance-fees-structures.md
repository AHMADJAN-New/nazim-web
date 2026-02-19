# Fee Structures

The Fee Structures page is where you define the types of fees your school charges (e.g. tuition, transport, one-time admission fee) and set the amount, due date, fee type (one-time, monthly, quarterly, semester, annual, custom), academic year, and optional class. These structures are then used when assigning fees to students. Administrators and finance staff use this page to create, edit, view, and delete fee structures and to export the list to PDF or Excel. The page is under **Finance → Fees → Fee Structures**.

---

## Page Overview

When you open Fee Structures, you will see a page header with an **Add Structure** button and export (PDF/Excel) controls, then a card with a table of all fee structures. Clicking a row opens a side panel with full details. The actions menu (⋮) on each row gives View, Edit, and Delete.

### Summary Cards

This page does not have summary cards at the top; the main content is the structures table.

### Filters & Search

There is no filter panel or search box on the Fee Structures page. The table shows paginated structures. Use export and then filter in Excel if you need to search offline.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Fee structure name (e.g. Annual Tuition, Transport). |
| Amount | Fee amount (e.g. 5000.00). |
| Fee Type | Badge: One Time, Monthly, Quarterly, Semester, Annual, or Custom. |
| Class | Class name if the structure is limited to a class; otherwise "—". |
| Academic Year | Academic year name for this structure. |
| Required | Yes/No badge — whether the fee is required for the class/group. |
| Active | Yes/No badge — whether the structure is active and available for assignment. |
| Actions | Dropdown menu (⋮) with View, Edit, Delete. |

Clicking anywhere on the row (except the actions cell) opens the **View** side panel with full details. The table supports pagination (page size and page number) at the bottom.

### Row Actions

When you click the actions menu (⋮) on any row, you can:

- **View** — Opens a side panel (sheet) with full structure details: basic info (name, code, fee type, amount, description), academic info (class, academic year, section), dates (start, end, due), status (active, required, display order), and metadata (created at, updated at).
- **Edit** — Opens the same form as Create, with current data pre-filled. Change any field and click **Save** to update.
- **Delete** — Deletes the fee structure after confirmation. Only delete if the structure is not assigned to students, or assignments may be affected.

### Bulk Actions

No bulk actions available on this page. Delete or edit one structure at a time.

---

## Creating a New Fee Structure

To create a new fee structure, click the **Add Structure** button at the top of the page. A dialog opens with the following form. All fields are in a single form (no tabs).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Academic Year | Select | Yes | Academic year this fee applies to. |
| School | Select | No | School (if your organization has multiple schools). May default to your profile school. |
| Name | Text | Yes | Fee structure name (e.g. Annual Tuition). |
| Code | Text | No | Short code for reference. |
| Fee Type | Select | Yes | One Time, Monthly, Quarterly, Semester, Annual, or Custom. |
| Amount | Number | Yes | Fee amount; must be greater than 0. If currency is not base, a converted amount in base currency may be shown. |
| Currency | Select | No | Currency for the amount. Optional; base currency used if not set. |
| Due Date | Date Picker | Yes | Due date for this fee. |
| Start Date | Date Picker | No | Optional start date of the fee period. |
| End Date | Date Picker | No | Optional end date of the fee period. |
| Class | Select | No | Class (class academic year) to limit this fee to a specific class. Selecting class can auto-fill the class id field. |
| Structure Id | Text / Display | No | Often shows the selected class name; may be read-only or synced from Class selection. |
| Display Order | Number | No | Order in which this structure appears in lists (integer). |
| Description | Text | No | Optional description of the fee. |
| Active | Switch | No | Whether the structure is active (default usually true). |
| Required | Switch | No | Whether the fee is required (default usually true). |

### What Happens After Submission

- The form is validated (required fields, amount > 0, dates). If validation fails, errors are shown.
- On success, the new structure is saved and the table refreshes. The dialog closes. A success message may appear.
- The new structure can be used immediately when creating fee assignments.

---

## Editing a Fee Structure

To edit an existing fee structure:

1. Find the structure in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit dialog opens with the same form and current data pre-filled.
4. Change any fields (academic year, name, amount, dates, class, active, required, etc.).
5. Click **Save**.
6. On success, the dialog closes and the table refreshes. Assignments that already use this structure keep the old amount until you change them or re-assign; new assignments use the updated structure.

---

## Deleting a Fee Structure

To delete a fee structure:

1. Click the actions menu (⋮) → **Delete**.
2. Confirm in the dialog (if shown). Deleting removes the structure from the list.
3. If the structure is already assigned to students, those assignments may become invalid or need to be updated elsewhere (e.g. Fee Assignments page). Avoid deleting structures that are in use.

---

## Viewing Structure Details

- Click a row (or actions → **View**) to open the side panel.
- The panel shows: **Basic Information** (name, code, fee type, amount, description), **Academic Information** (class, academic year, section), **Dates** (start date, end date, due date), **Status** (active, required, display order), **Metadata** (created at, updated at).
- Use this to check all settings without editing.

---

## Export Options

Use the export (PDF/Excel) control in the page header. The export includes the current page or full list (depending on implementation) with columns: Name, Code, Amount, Fee Type, Class, Academic Year, Due Date, Required, Active. Data is formatted (e.g. amount with 2 decimals, Yes/No for required and active). Filters on the page (if any) do not apply; export typically includes all structures or the current page.

---

## Tips & Best Practices

- Create structures before the academic year starts so they are ready for assignments.
- Use clear names (e.g. "Annual Tuition Grade 10") so staff can easily pick the right structure when assigning.
- Set a due date that matches your school’s fee schedule (e.g. start of term).
- Use **Class** only when the fee applies to one class; leave blank for school-wide fees.
- Do not delete a structure that is already assigned; deactivate it (Active = No) instead if you want to hide it from new assignments.

---

## Related Pages

- [Fees (overview)](/help-center/s/finance/fees) — Overview of the Fees module.
- [Fee Dashboard](/help-center/s/finance/finance-fees-dashboard) — Overview of collection and quick links.
- [Fee Assignments](/help-center/s/finance/finance-fees-assignments) — Assign these structures to students or classes.
- [Fee Payments](/help-center/s/finance/finance-fees-payments) — Record payments against assignments.
- [Finance Settings](/help-center/s/finance/finance-settings) — Currencies used for fee amounts.

---

*Category: `finance` | Language: `en`*
