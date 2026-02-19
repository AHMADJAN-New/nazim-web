# Fee Exceptions

The Fee Exceptions page is where you manage fee waivers, discounts, and custom adjustments applied to fee assignments. School administrators and finance staff use it to grant percentage or fixed discounts, full waivers, or custom exceptions for students, set validity periods (from / to date), and track active exceptions. Exceptions reduce the payable amount on an assignment; the exception view side panel shows a financial summary including total fee, exception amount, and amount after exception.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards. The main content is a filter panel and the exceptions table.

### Filters & Search

- **Academic Year** — Filter exceptions by academic year. The current academic year is auto-selected when the page loads. Changing it resets the Class filter to "All".
- **Class** — Filter by class. Options are "All Classes" or a specific class from the selected academic year.

---

## Data Table

The main table shows fee exceptions. Columns:

| Column | Description |
|--------|-------------|
| Student | Full name of the student (from the fee assignment). |
| Class | Class name from the assignment (badge). |
| Structure | Fee structure name from the assignment. |
| Exception Type | Badge: Discount (%), Fixed Discount (purple), Waiver (red), or Custom (gray). |
| Exception Amount | The exception amount (currency format). |
| Status | Active (green badge) or Inactive (gray badge). |
| Actions | View (eye), Edit (pencil), Delete (trash). |

### Row Actions

- **View (eye)** — Opens a side panel with: student and class, fee structure and exception type badge, financial summary (total fee for all assignments, other fees if more than one, current fee original, exception amount, after exception, total payable, total paid, total remaining; if the student has more than one assignment, list of all fees with assigned/paid/remaining and "current" badge for this exception), exception details (amount, status, from date, to date, reason, notes).
- **Edit (pencil)** — Opens the add/edit exception dialog with current values pre-filled.
- **Delete (trash)** — Opens a confirmation dialog. Confirming removes the exception.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Fee Exception

To create a new fee exception, click the **"Add Exception"** button at the top. A dialog opens. If there are no fee assignments for the selected filters, a message appears: "No fee assignments found. Create fee assignments first." and "Make sure you have selected an academic year and a class with fee assignments."

When assignments exist, the form includes (no tabs):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Class | Combobox (searchable) | Yes | Select the class. Options show class name and optional section. Required to load students and assignments. |
| Academic Year | Combobox (searchable) | Yes | Select the academic year. Options show "(Current)" for current year. Required to filter assignments. |
| Student | Combobox (searchable) | No (conditional) | Shown only when a class is selected. Search and select the student. Selecting filters the assignments list. |
| Assignment | Select | Yes | The fee assignment to apply the exception to. Disabled until class and academic year are selected. Options show structure name and class. List is filtered by selected class, academic year, and optional student. |
| Exception Type | Select | Yes | Discount Percentage, Fixed Discount, Waiver, or Custom. |
| Exception Amount | Number | Yes | Non-negative amount (e.g. discount value or waiver amount). |
| Valid From | Date Picker | Yes | Start date of the exception. |
| Valid To | Date Picker | No | End date. If set, must be after or equal to Valid From. |
| Exception Reason | Text | Yes | Reason for the exception (required, max length per validation). |
| Approved By | Text (read-only) | Yes | Current user is shown as approver; field is disabled and auto-filled. |
| Approval Date | Date Picker | No | Approval date. For new exceptions, today may be default. |
| Active | Switch | No | Whether the exception is currently active. Default: on. |
| Notes | Text area | No | Optional notes. |

### What Happens After Submission

- Validation: assignment, student (from backend), exception type, exception amount (non-negative), reason (required), valid from (required), valid to ≥ valid from if both set, approver, organization id.
- On success, the exception is created, the dialog closes, and the table refreshes.
- On error, a toast or inline error is shown.

---

## Editing a Fee Exception

To edit an existing exception:

1. Find the exception in the table.
2. Click **Edit (pencil)** in the row actions.
3. The same add/edit dialog opens with all current values pre-filled.
4. Change any fields as needed.
5. Click **"Save"** (or **"Update"**).
6. The dialog closes and the table refreshes.

---

## Deleting a Fee Exception

To delete a fee exception:

1. Click **Delete (trash)** on the row.
2. A confirmation dialog appears.
3. Click **"Delete"** to confirm or **"Cancel"** to close.
4. The exception is removed and the list refreshes.

---

## Viewing Exception Details (Side Panel)

When you click **View (eye)** or the row, the side panel shows:

- **Student** — Student name and class.
- **Fee Structure** — Structure name and exception type badge.
- **Financial Summary** — Card: total fee (all assignments), other fees (if more than one), current fee (original), exception amount (negative), amount after exception; then card: total payable, total paid, total remaining. If the student has more than one assignment, list of all assignments with assigned/paid/remaining and "current" badge for this exception.
- **Exception Details** — Exception amount, status (active/inactive), valid from, valid to, reason, notes.

---

## Export Options

Export buttons appear in the page header. You can export the current filtered exceptions list to PDF or Excel. Export columns typically include: Student, Class, Structure, Exception Type, Exception Amount, Exception Reason, Valid From, Valid To, Status. Export uses the active academic year and class filters. Export is disabled when filters or exceptions are loading or when there are no exceptions.

---

## Tips & Best Practices

- **Create assignments first** — Fee exceptions apply to fee assignments. Ensure the academic year and class have assignments before adding exceptions.
- **Set validity period** — Use Valid From and Valid To so exceptions apply only when intended (e.g. one semester or one year).
- **Use the Active switch** — Instead of deleting, deactivate an exception if you need to keep the record but stop it affecting the balance.
- **Record the reason** — Always fill the exception reason for accountability and transparency; it appears in the view panel and exports.

---

## Related Pages

- [Fee Assignments](/help-center/s/finance/finance-fees-assignments) — Create and manage the fee assignments that exceptions apply to.
- [Fee Payments](/help-center/s/finance/finance-fees-payments) — Record payments; the view panel shows exceptions on the assignment.
- [Fee Structures](/help-center/s/finance/finance-fees-structures) — Define fee types and base amounts.
- [Fee Reports](/help-center/s/finance/finance-fees-reports) — Collection and student summary reports; exceptions affect remaining amounts.

---

*Category: `finance` | Language: `en`*
