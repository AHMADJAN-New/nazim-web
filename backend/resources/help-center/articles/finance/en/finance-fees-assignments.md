# Fee Assignments

The Fee Assignments page is where you assign fee structures to students by class and academic year. School administrators and finance staff use this page to create and manage fee assignments, set due dates and payment periods, view assignment status (paid, partial, pending, overdue, waived), and export assignment data. Assignments can be viewed by class or by student, and each row can be viewed in detail, edited, or deleted.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards at the top. The main content is a filter panel and two tabs: **Assigned Classes** and **Students**.

### Filters & Search

- **Academic Year** — Filter assignments by academic year. The current academic year is auto-selected when the page loads. Changing this resets the Class filter and refetches assignments.
- **Class** — Filter by class. Options are "All Classes" or a specific class from the selected academic year. Changing this refetches assignments.

---

## Data Table

The page has two tabs with different table views.

### Tab: Assigned Classes

The table shows assignments grouped by class. Each row is one assignment. Columns:

| Column | Description |
|--------|-------------|
| Class | Class name for the assignment. |
| Structure | Fee structure name and type (e.g., Monthly, One Time, Semester, Annual) as a badge. |
| Amount Assigned | Total amount assigned for this assignment. |
| Paid | Amount already paid (shown in green). |
| Remaining | Amount still due (shown in red if greater than zero). |
| Status | Badge: Paid (green), Partial (yellow), Pending (orange), Overdue (red), or Waived (gray). |
| Actions | View (eye), Edit (pencil), Delete (trash). |

### Tab: Students

The table shows one row per assignment with student information. Columns:

| Column | Description |
|--------|-------------|
| Student | Student full name (from assignment). |
| Class | Class name as a badge. |
| Structure | Fee structure name and type as a badge. |
| Amount Assigned | Total amount assigned. |
| Paid | Amount paid (green). |
| Remaining | Amount remaining (red if > 0). |
| Status | Paid, Partial, Pending, Overdue, or Waived. |
| Actions | View, Edit, Delete. |

### Row Actions

- **View (eye)** — Opens a side panel with full assignment details: student info, fee structure, class, financial details (original amount, assigned amount, paid, remaining), status and dates (due date, payment period start/end), notes, and actions to Edit or Delete. A button **"View Student Fee Statement"** navigates to the student's fee page.
- **Edit (pencil)** — Opens the Add/Edit Assignment dialog with current data pre-filled. Academic year, class, and fee structure are disabled when editing.
- **Delete (trash)** — Opens a confirmation dialog. Confirming removes the fee assignment permanently.

### Bulk Actions

No bulk actions available on this page. You can use **Bulk Assign** via the create flow (one assignment per submission; the form supports creating a single assignment per submission for a chosen class and structure).

### Pagination

Below the table, pagination controls allow you to change page size and navigate pages. Total count is shown.

---

## Adding a New Fee Assignment

To create a new fee assignment, click the **"Add Assignment"** button at the top of the page. A dialog opens with the following fields (no tabs):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Academic Year | Select | Yes | Choose the academic year. Options come from your organization's academic years. |
| Class | Select | Yes | Choose the class (class academic year). Depends on selected academic year. |
| Structure | Select | Yes | Choose the fee structure. List is filtered by academic year and class. Selecting a structure can auto-fill Assigned Amount from the structure's amount. |
| Amount Assigned | Number | No | Amount assigned. Can be pre-filled from structure. |
| Due Date | Date picker | Yes | Due date for the fee. |
| Payment Period Start | Date picker | No | Start of the payment period. |
| Payment Period End | Date picker | No | End of the payment period. Must be after or equal to start if both are set. |
| Notes | Text | No | Optional notes. |

### What Happens After Submission

- The system creates a fee assignment for the selected class and structure (bulk assignment creates one per submission with the same structure and class).
- Validation: due date required; payment period end must be ≥ payment period start if both are set.
- On success, the dialog closes, the form resets, and the assignments list refetches.
- On error, a toast message shows the error (e.g., validation or server error).

---

## Editing a Fee Assignment

To edit an existing assignment:

1. Find the assignment in either the **Assigned Classes** or **Students** tab.
2. Click **Edit** (pencil) in the row actions.
3. The dialog opens with the same form; Academic Year, Class, and Structure are disabled and cannot be changed.
4. Update **Assigned Amount**, **Due Date**, **Payment Period Start**, **Payment Period End**, or **Notes** as needed.
5. Click **"Save"** (or **"Update"**).
6. The dialog closes, and the table refreshes with updated data.

---

## Deleting a Fee Assignment

To delete a fee assignment:

1. Click **Delete** (trash) on the row.
2. A confirmation dialog appears: "Are you sure you want to delete this fee assignment? This action cannot be undone."
3. Click **"Delete"** to confirm or **"Cancel"** to close.
4. The assignment is removed and the list refetches. Related payments or exceptions may be affected depending on backend rules.

---

## Viewing Assignment Details (Side Panel)

When you click **View** (eye) on a row (or click the row itself in some layouts), a side panel opens showing:

- **Student** — Name, Student ID, and a button to open the student's fee statement page.
- **Fee Structure** — Structure name and type.
- **Class** — Class name.
- **Financial Details** — Original Amount, Assigned Amount, Paid, Remaining.
- **Status & Dates** — Status, Due Date, Payment Period Start, Payment Period End (if set).
- **Notes** — If any.
- **Actions** — Edit and Delete buttons that close the panel and open the edit dialog or delete confirmation.

---

## Export Options

Export buttons appear in the page header (right side). You can export the current list of assignments (respecting filters) as PDF or Excel. Export columns include: Student, Class, Structure, Amount Assigned, Paid, Remaining, Due Date, Status. The export uses the active Academic Year and Class filters in the filter summary. Export is disabled when loading or when there are no assignments.

---

## Tips & Best Practices

- **Set filters first** — Choose Academic Year and Class before adding assignments so the correct fee structures appear in the Structure dropdown.
- **Use payment periods** — For recurring fees, set Payment Period Start and End so reports and statements show the correct period.
- **Check remaining amount** — Before editing an assignment, open View to see paid vs remaining; changing assigned amount can affect how much is still due.
- **Use View before delete** — Open the side panel to confirm the assignment and any linked student/class/structure before deleting.

---

## Related Pages

- [Fee Structures](/help-center/s/finance/finance-fees-structures) — Define fee types and amounts by academic year and class.
- [Fee Payments](/help-center/s/finance/finance-fees-payments) — Record payments against fee assignments.
- [Fee Exceptions](/help-center/s/finance/finance-fees-exceptions) — Apply waivers and discounts to assignments.
- [Fee Reports](/help-center/s/finance/finance-fees-reports) — View collection progress and student-wise or class-wise summaries.

---

*Category: `finance` | Language: `en`*
