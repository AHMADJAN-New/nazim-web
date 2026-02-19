# Library Distribution

The Library Distribution page is for managing book loans and returns: assign books to students or staff, view all active loans with filters, and record returns. School administrators and librarians use this page to issue one or multiple copies of a book in one go, filter by borrower type or category, and return books. You need the appropriate permissions to assign books or process returns.

---

## Page Overview

When you open the Library Distribution page, you will see:

### Summary

- **PageHeader** — Title "Library Distribution" (or "Manage book loans and returns"). Primary action: **Assign Book** (if you have create permission).
- **Card** — Title "Active Loans", description with active loan count. Filters and table below.

### Filters & Search

- **Search** — Search by book title or copy code. Placeholder: e.g. "Search by book title or copy code...".
- **Category** — Combobox: All Categories or a specific category. Filters the list of books in the Assign form and can affect which loans are shown if used in combination.
- **Borrower** — Dropdown: All Borrowers, Students Only, Staff Only. Filters the active loans table.
- **Reset** — Button to clear search, category, and borrower. Shown when any filter is active.

---

## Assign Book (Loan) Dialog

Opened by **Assign Book**:

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| Book | Combobox/Select | Yes | Only books with at least one available copy. Shows title, author, category, and available count. |
| Copies to issue | Stepper (optional) | — | If supported, number of copies to issue in one go (1 to available count). |
| Borrower Type | Select | Yes | Student or Staff. |
| Borrower | Select | Yes | Student or staff member from dropdown. |
| Loan Date | Date | Yes | Default today. |
| Due Date | Date | No | Optional. |
| Deposit Amount | Number | No | Can auto-fill from book price × copies. |

On submit, one loan is created per selected copy (or one loan if single copy). Success message; dialog closes and active loans list refreshes. If multiple copies are issued, a message like "Successfully issued X copies" may appear.

---

## Data Table (Active Loans)

| Column | Description |
|--------|-------------|
| Book | Book title (and possibly author). |
| Copy | Copy code or ID. |
| Borrower | Borrower name (student or staff). |
| Loan Date | Date loan was issued. |
| Due Date | Due date. |
| Deposit | Deposit amount. |
| Actions | **Return** button to record return. |

Empty state: "No active loans" or "No loans found matching your filters" when filters are applied.

### Row Actions

- **Return** — Opens a return confirmation dialog. Confirm marks the loan as returned and frees the copy.

---

## Return Confirmation Dialog

When you click **Return** on a loan:

- The dialog shows loan details (book, copy, borrower, dates).
- Click **Confirm** (or equivalent) to record the return. The loan is removed from active loans and the copy becomes available.

---

## Tips & Best Practices

- Use **Borrower** filter to see only student or only staff loans.
- Use **Category** to narrow the book list when assigning.
- If the form supports issuing multiple copies, use it for bulk issue to one borrower.

---

## Related Pages

- [Library](/help-center/s/library/library) — Quick assign and return on the Loans tab.
- [Library Books](/help-center/s/library/library-books) — View book details and loan history.
- [Library Reports](/help-center/s/library/library-reports) — Overdue, due soon, loan history.

---

*Category: `library` | Language: `en`*
