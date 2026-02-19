# Fee Reports

The Fee Reports page is a dashboard for tracking fee collection and student payment status. School administrators and finance staff use this page to see summary cards (total fees, collected, remaining, overdue count), collection progress bar, status distribution chart, collection-by-class chart, student-wise fee status table with search, and class-wise summary table. You can filter by academic year, class, and status; click a student or class row to open a details side panel with summary, assignments, and payments (for students) or summary and students list (for classes). Exports are available for student-wise and class-wise data.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

Four summary cards at the top:

- **Total Fees (Total Assigned)** — Total amount of fees assigned across all students for the selected filters. Subtitle shows the number of students.
- **Collected (Total Paid)** — Total amount collected (paid). Subtitle shows collection rate as a percentage (e.g., "75.2% collected") with a checkmark icon.
- **Remaining** — Total amount still due. Subtitle shows count of pending (e.g., "X pending") with a clock icon.
- **Overdue** — Number of overdue assignments (count, not amount). Subtitle shows total outstanding amount for defaulters (e.g., "$X outstanding").

### Filters & Search

- **Academic Year** — Filter all data by academic year. The current academic year is auto-selected when the page loads. Changing this resets the Class filter and goes to page 1.
- **Class** — Filter by class. Options are "All Classes" or a specific class. Changing this goes to page 1.
- **Status** — Filter the student-wise table by payment status: All Statuses, Paid, Partial, Pending, or Overdue.

---

## Collection Progress

Below the filters and summary cards, a **Collection Progress** card shows a horizontal progress bar: "X of Y" (collected of total) and the collection rate percentage. The bar fills according to how much has been collected versus total assigned.

---

## Charts

Two charts appear in a row:

### Status Distribution

A **pie chart** showing the count of assignments (or students) in each status: Paid (green), Partial (yellow), Pending (orange), Overdue (red), Waived (gray). Only segments with value > 0 are shown. Below the chart, a legend lists each status and its count.

### Collection by Class

A **bar chart** showing up to 8 classes. For each class: two stacked bars—Collected (green) and Remaining (orange). The X-axis is class name; the Y-axis is amount (formatted, e.g. $1K, $2K). Tooltip shows values on hover.

---

## Data Tables (Tabs)

The page has two main tabs: **Student-wise Summary** and **Class-wise Summary**.

### Tab: Student-wise Summary

**Title:** Student Fee Status. **Description:** View fee status for all students with detailed breakdown.

- **Search** — A search input (e.g., "Search students...") filters the student list. Typing resets to page 1.
- **Table columns:**

| Column | Description |
|--------|-------------|
| Student | Student first and last name; below it, registration number. |
| Class | Class name as badge; if the student has fee exceptions, a purple badge shows count (e.g., "1 Exception" / "2 Exceptions"). |
| Assigned | Total amount assigned to the student. |
| Paid | Total paid (green). |
| Remaining | Total remaining (orange). |
| Status | Badge: Paid (green), Partial (yellow), Pending (orange), Overdue (red). |
| (Arrow) | Button that navigates to the student's fee page (`/students/{id}/fees`). |

- **Row click** — Clicking a row opens the details side panel for that student (Summary, Assignments, Payments tabs).
- **Pagination** — When there is more than one page, "Showing X to Y of Z students" and Previous/Next buttons appear below the table.

### Tab: Class-wise Summary

**Title:** Class-wise Summary. **Description:** View fee collection statistics grouped by class.

- **Table columns:**

| Column | Description |
|--------|-------------|
| Class | Class name. |
| Students | Number of students (badge). |
| Total Assigned | Total fees assigned for the class. |
| Collected | Total collected (green). |
| Remaining | Total remaining (orange). |
| Collection Rate | Progress bar and percentage (e.g., 80.5%). Color: green if ≥80%, yellow if ≥50%, orange otherwise. |

- **Row click** — Clicking a row opens the details side panel for that class (Summary and Students tabs).
- **Summary stats below table** — Three small cards: Total Classes (count), Average Collection Rate (percentage), Total Students (sum across classes).
- **Export** — A report export button for class-wise data (PDF/Excel) with columns: Class, Students, Total Assigned, Collected, Remaining, Collection Rate. Uses current academic year in filter summary.

---

## Details Side Panel — Student

When you click a student row (Student-wise tab), a side panel opens.

**Header:** Student first and last name. **Description:** Student • Registration number • Class name.

**Tabs:**

### Summary

- Three cards: Total Assigned, Paid, Remaining.
- If the student has fee exceptions: a card "Fee Exceptions" listing active exceptions (type badge, reason, amount).
- Status card: overall status badge and short text (Fully Paid / Partially Paid / Not Paid). If total assigned > 0, a collection rate progress bar and percentage.

### Assignments

Scrollable list of fee assignments for this student. Each card shows: fee structure name, Assigned / Paid / Remaining amounts, Due Date, status badge. If the assignment has exceptions, they are listed (type, amount, reason, Active badge).

### Payments

Scrollable list of payments. Each card shows: amount, Payment Date, Method, Reference (if any), and a "Paid" badge.

---

## Details Side Panel — Class

When you click a class row (Class-wise tab), a side panel opens.

**Header:** Class name. **Description:** Class • X students.

**Tabs:**

### Summary

- Three cards: Total Assigned, Collected, Remaining.
- Collection Rate card: "X of Y" and percentage, progress bar, and counts for Students and Assignments.

### Students

Scrollable list of students in the class. Each card shows: name, registration number, Paid amount, Remaining amount, status badge. Clicking a student card switches the panel to that student's view (student panel content).

---

## Export Options

- **Page header (right)** — Export for **Student-wise Summary**: current filtered student list. Columns: First Name, Last Name, Registration Number, Class, Assigned, Paid, Remaining, Overall Status. Template type: fee_student_summary. Filter summary includes Academic Year, Class, and Status when set. Disabled when dashboard is loading or no student data.
- **Class-wise tab** — Export for **Class-wise Summary**: class table data. Columns: Class, Students, Total Assigned, Collected, Remaining, Collection Rate. Template type: fee_class_summary. Filter summary includes Academic Year. Disabled when loading or no class data.

Both exports support PDF and Excel via the report export component; data is transformed (e.g., currency formatted, status capitalized) before export.

---

## Tips & Best Practices

- **Use status filter** — On the Student-wise tab, filter by Pending or Overdue to focus on students who still need to pay.
- **Check collection rate** — The progress bar and percentage help you see how much of the year's fees have been collected; use Class-wise summary to compare classes.
- **Open student panel for details** — Click a student row to see all assignments and payments and any exceptions before following up with parents or sending reminders.
- **Export after filtering** — Set academic year and class (and status for students) so your PDF/Excel export matches what you see on screen.

---

## Related Pages

- [Fee Assignments](/help-center/s/finance/finance-fees-assignments) — Create and manage fee assignments that feed into these reports.
- [Fee Payments](/help-center/s/finance/finance-fees-payments) — Record payments that appear in the reports and student panel.
- [Fee Exceptions](/help-center/s/finance/finance-fees-exceptions) — Manage waivers and discounts; exceptions appear in student summary and assignment cards.
- [Fee Structures](/help-center/s/finance/finance-fees-structures) — Define fee types and amounts used in assignments.

---

*Category: `finance` | Language: `en`*
