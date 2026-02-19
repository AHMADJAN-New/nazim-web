# Fees

The Fees module covers student fee management from defining fee structures and assigning them to students or classes through recording payments and applying exceptions (discounts, waivers) to viewing reports and dashboards. School administrators and finance staff use it to keep fee types consistent, track who has paid, and manage waivers or discounts. All fee pages are under **Finance → Fees** in the menu.

---

## Page Overview

The Fees module does not have a single “Fees” landing page; instead you use these sub-pages:

### Fee Dashboard

- **Path:** Finance → Fees → Dashboard (or `/finance/fees/dashboard`).
- **Summary cards:** Total Assigned, Total Paid, Total Remaining, Exceptions count, Collection Rate.
- **Charts:** Status distribution (paid, partial, pending, overdue, waived), collection by class, exception breakdown.
- **Filters:** Academic Year, Class (optional).
- **Quick actions:** Links to Fee Structures, Assignments, Payments, Exceptions, and Fee Reports.
- **Recent payments:** Last payments list and link to Fee Payments.

Use the dashboard for a quick overview of fee collection and to jump to other fee pages.

### Fee Structures

- **Path:** Finance → Fees → Fee Structures (or `/finance/fees/structures`).
- Define fee types (e.g. tuition, one-time, monthly) with amount, due date, academic year, optional class, and currency.
- Create, edit, view, and delete structures; export list to PDF/Excel.
- Structures are used when assigning fees to students.

### Fee Assignments

- **Path:** Finance → Fees → Assignments (or `/finance/fees/assignments`).
- Assign fee structures to students or classes for an academic year.
- Manage due dates, payment periods, and notes per assignment.
- View and edit assignments; bulk or single.

### Fee Payments

- **Path:** Finance → Fees → Payments (or `/finance/fees/payments`).
- Record payments against fee assignments (amount, date, method, account, reference).
- Filter by academic year, student, status, date range.
- Payments reduce the remaining balance on assignments.

### Fee Exceptions

- **Path:** Finance → Fees → Exceptions (or `/finance/fees/exceptions`).
- Apply discounts (percentage or fixed), waivers, or custom exceptions to a student’s fee assignment.
- Exceptions require reason and approval; they reduce the amount due.
- View and manage active exceptions.

### Fee Reports

- **Path:** Finance → Fees → Reports (or `/finance/fees/reports`).
- Student-wise and class-wise fee summaries, collection progress, status distribution.
- Filter by academic year and status; export to PDF/Excel.
- Use for collection tracking and defaulters.

### Student Fee Statement

- **Path:** From a student’s profile or Students list: open a student → **Fee Assignments** (or route like `/students/:id/fees`).
- View that student’s fee assignments, payments, and balance in one place.

---

## Typical Flow

1. **Set up fee structures** — In Fee Structures, create fee types (e.g. Annual Tuition, Monthly Transport) with amount, due date, academic year, and optional class. Use the same currency as your finance accounts if needed.
2. **Assign fees** — In Fee Assignments, assign structures to students or classes for the academic year. Set due dates and payment periods.
3. **Record payments** — In Fee Payments, record each payment (cash, bank transfer, etc.) against the correct assignment. Remaining balance updates automatically.
4. **Apply exceptions when needed** — In Fee Exceptions, add discounts or waivers for eligible students; add reason and approval.
5. **Monitor and report** — Use the Fee Dashboard and Fee Reports to see collection rate, overdue amounts, and student-wise or class-wise summaries. Export for records or auditors.

---

## Filters & Search

Filters depend on the page:

- **Dashboard:** Academic Year, Class.
- **Structures:** Often list all; pagination and export.
- **Assignments:** Academic Year, class, student, status.
- **Payments:** Academic Year, student, status, date range.
- **Exceptions:** Academic year, student, type, status.
- **Reports:** Academic Year, status; sometimes class.

Search (where available) usually applies to student name, admission number, or structure name.

---

## Export Options

- **Fee Structures** — Export structure list (name, code, amount, fee type, class, academic year, due date, required, active) to PDF or Excel.
- **Fee Reports** — Export student-wise or class-wise summary to PDF or Excel; data matches current filters.
- Other fee pages may have export where implemented (e.g. payments list, exceptions list).

---

## Tips & Best Practices

- Create fee structures before the start of the academic year so assignments can be done early.
- Use one-time fees for admission or exam fees and recurring (monthly/semester/annual) for tuition.
- Record payments promptly and choose the correct account so cashbook and fee reports stay in sync.
- Review the Fee Dashboard regularly to spot overdue amounts and follow up with parents or guardians.
- Use exceptions only for approved cases and always fill in the reason for audits.

---

## Related Pages

- [Fee Dashboard](/help-center/s/finance/finance-fees-dashboard) — Overview of fee collection and quick links.
- [Fee Structures](/help-center/s/finance/finance-fees-structures) — Define fee types and amounts.
- [Fee Assignments](/help-center/s/finance/finance-fees-assignments) — Assign fees to students or classes.
- [Fee Payments](/help-center/s/finance/finance-fees-payments) — Record payments.
- [Fee Exceptions](/help-center/s/finance/finance-fees-exceptions) — Discounts and waivers.
- [Fee Reports](/help-center/s/finance/finance-fees-reports) — Collection and status reports.
- [Finance Reports](/help-center/s/finance/finance-reports) — General finance reports (accounts, income, expenses).
- [Finance Settings](/help-center/s/finance/finance-settings) — Currencies and categories used in finance and fees.

---

*Category: `finance` | Language: `en`*
