# Fee Payments

The Fee Payments page is where you record and view all fee payments made by students. Finance staff and administrators use this page to record payments against fee assignments, choose payment method (cash, bank transfer, cheque, other) and account, add reference numbers, and export payment history. You can filter payments by academic year and class, and open a payment in a side panel to see full details including student, assignment, account, and any fee exceptions applied to that assignment.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards. The main content is a filter panel and a payments table.

### Filters & Search

- **Academic Year** — Filter payments by academic year. The current academic year is auto-selected when the page loads. Changing this resets the Class filter.
- **Class** — Filter by class. Options are "All Classes" or a specific class. Payments are filtered to those whose fee assignment belongs to the selected class (when class filter is set).

---

## Data Table

The main table lists fee payments. Columns:

| Column | Description |
|--------|-------------|
| Class | Class name from the fee assignment (badge). Shows "Not available" if assignment/class is missing. |
| Structure | Fee structure name from the assignment (badge). |
| Payment Date | Date the payment was made (formatted). |
| Amount | Payment amount (numeric). |
| Method | Payment method: Cash (green), Bank Transfer (blue), Cheque (purple), or Other (gray) as a badge. |
| Reference | Reference number, or "—" if none. |
| Account | Finance account name where the payment was recorded (badge), or "—" if missing. |
| Actions | Dropdown menu (⋮) with **View**. |

### Row Actions

When you click the actions menu (⋮) on any row:

- **View** — Opens a side panel with full payment details: payment information (amount, date, method, reference), student information (name, admission number), fee assignment information (class, structure, assigned amount, paid amount, remaining, status), any fee exceptions for that assignment, account information (name, type), notes, and metadata (created at, updated at).

Clicking a table row (not the menu) also opens the same View panel.

### Bulk Actions

No bulk actions available on this page.

### Pagination

Pagination controls appear below the table when there are multiple pages. You can change page size and navigate pages; total count is shown.

---

## Recording a New Payment

To record a new fee payment, click the **"Record Payment"** button at the top of the page. A dialog opens. At the top of the dialog, two filters help you narrow the list of assignments:

- **Academic Year** — Select the academic year. Optional "(Current)" label appears for the current year.
- **Class** — Select "All Classes" or a specific class. Disabled until academic year is selected.

Below the filters, the **Record Payment** form appears with these fields (single section, no tabs):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Assignment | Select | Yes | Choose the fee assignment. Options show structure name, class, student name, and remaining amount. List is filtered by the academic year and class selected above. Selecting an assignment auto-fills Student ID and Student Admission ID, and can auto-fill Amount with the assignment's remaining amount. |
| Payment Date | Date picker | Yes | Date of payment. Defaults to today. |
| Payment Method | Select | Yes | Cash, Bank Transfer, Cheque, or Other. |
| Amount | Number | Yes | Payment amount. Must be greater than 0. Can be auto-filled from assignment remaining. |
| Account | Select | Yes | Finance account where the payment is recorded. Options from your organization's accounts. |
| Reference | Text | No | Reference number (e.g., cheque number, transaction ID). |
| Notes | Text | No | Optional notes. |

When an assignment is selected, a small summary box shows: Assigned Amount, Paid Amount, Remaining, and Status for that assignment.

### What Happens After Submission

- The system validates: assignment required, account required, payment date required, amount > 0.
- If validation fails, a toast shows the error (e.g., "Fee assignment is required", "Amount must be greater than 0").
- On success, the payment is created, the dialog closes, and the payments list updates. Filters in the dialog may reset when the dialog closes (e.g., back to current academic year).
- Errors from the server are shown via toast.

---

## Editing a Payment

This page does not provide an Edit action for payments. Row actions only include **View**. To correct a payment, you may need to use backend or admin tools, or contact support depending on your system's design.

---

## Deleting a Payment

This page does not provide a Delete action for payments. Row actions only include **View**.

---

## Viewing Payment Details (Side Panel)

When you click **View** or click a payment row, a side panel opens with:

- **Payment Information** — Amount, Payment Date, Method, Reference (if any).
- **Student** — Full name, admission number (if student data is available).
- **Assignment Information** — Class, Structure, Assigned Amount, Paid Amount, Remaining, Status for the linked fee assignment.
- **Fee Exceptions** — Any exceptions (waiver, discount percentage, discount fixed, custom) for this assignment, with amount, reason, valid from/to, active status, and notes.
- **Account** — Account name and type.
- **Notes** — If any.
- **Metadata** — Created at, Updated at.

---

## Export Options

Export buttons appear in the page header. You can export the current filtered list of payments as PDF or Excel. Export columns: Student, Class, Structure, Payment Date, Amount, Method, Reference, Account. The export uses the active Academic Year and Class filters in the filter summary. Export is disabled when loading or when there are no payments.

---

## Tips & Best Practices

- **Select academic year and class in the dialog** — Before choosing an assignment, set the dialog filters so the assignment dropdown shows only relevant assignments.
- **Use reference numbers** — For bank transfers and cheques, enter a reference so you can match payments to bank statements later.
- **Pick the correct account** — Recording to the right finance account keeps your books accurate and reports correct.
- **Check remaining before recording** — The form shows remaining amount for the selected assignment; avoid overpaying by entering an amount not greater than remaining (unless your process allows overpayment).

---

## Related Pages

- [Fee Assignments](/help-center/s/finance/finance-fees-assignments) — Create and manage fee assignments by class and structure.
- [Fee Structures](/help-center/s/finance/finance-fees-structures) — Define fee types and amounts.
- [Fee Exceptions](/help-center/s/finance/finance-fees-exceptions) — Apply waivers and discounts to assignments.
- [Fee Reports](/help-center/s/finance/finance-fees-reports) — Track collection and view student/class summaries.

---

*Category: `finance` | Language: `en`*
