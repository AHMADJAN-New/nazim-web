# Library

The Library page is the main hub for managing your school’s book collection and loans in one place. It has three tabs: **Books** (add books, view inventory, add copies), **Loans** (assign books to students or staff, view active loans, return books), and **Overview** (totals, active loans, due soon). School administrators and librarians use this page for quick add/loan/return workflows. For full book management with search, filters, and edit/delete, use **Library Books**. For dedicated loan management and filters, use **Library Distribution**. For analytics and reports, use **Library Dashboard** and **Library Reports**.

---

## Page Overview

When you open the Library page, you will see a **PageHeader** with title "Library" and description, and three tabs: **Books**, **Loans**, and **Overview**.

### Tab 1: Books

- **Add Book (left card)** — Form to add a new book: Book Title (required), Author, ISBN, Category (text), Volume, Initial Copies (number), Default Loan Days (number), Deposit Amount (number), Finance Account (dropdown), Currency (dropdown). Button: **Save Book**.
- **Inventory (right, table)** — Columns: Book Title (with author below), Copies (Available X, Total Y badges), Deposit Amount (displayed), Add Copy (button per row to add one copy). Pagination not shown in this simplified table; it lists all books from the API.

### Tab 2: Loans

- **Assign Book (left card)** — Form: Book (dropdown of books with available copies), Copy (dropdown of available copies for selected book), Borrower Type (Student / Staff), Borrower (dropdown of students or staff), Loan Date (date picker), Due Date (date picker), Deposit Amount (number). Button: **Assign Book**. Badge shows count of available books.
- **Active Loans (right card)** — List of open loans. Each item shows: book title, due date, copy code, deposit amount, and **Return Loan** button. Refresh button in header.

### Tab 3: Overview

- **Summary cards** — Total Books (count; description: total copies), Active Loans (count; description: on loan), Due Soon (count; description: due in next 7 days).
- **Due Soon Books** — Grid of loans due in the next 7 days: book title, due date, copy code, author.

---

## Creating a New Book

1. Open the **Books** tab.
2. In the **Add Book** card, fill: **Book Title** (required), **Author**, **ISBN**, **Category**, **Volume**, **Initial Copies**, **Default Loan Days**, **Deposit Amount**, **Finance Account** (optional), **Currency** (optional).
3. Click **Save Book**. Form resets on success; the new book appears in the Inventory table.

---

## Adding a Copy to a Book

1. In the **Books** tab, find the book in the **Inventory** table.
2. Click **Copy** (or Add Copy) for that row. A new physical copy is created for that book; available and total copies update.

---

## Assigning a Book (Loan)

1. Open the **Loans** tab.
2. In **Assign Book**, select **Book** (only books with at least one available copy appear).
3. Select **Copy** (available copies for that book).
4. Choose **Borrower Type**: Student or Staff, then select **Borrower**.
5. Set **Loan Date** and **Due Date**, and **Deposit Amount** if needed.
6. Click **Assign Book**. Form resets on success; the loan appears in Active Loans.

---

## Returning a Loan

1. In the **Loans** tab, find the loan in **Active Loans**.
2. Click **Return Loan**. The copy becomes available again; the loan is removed from the active list.

---

## Tips & Best Practices

- Set **Default Loan Days** and **Deposit Amount** when adding a book so they apply when assigning.
- Use **Overview** to see how many loans are active and how many are due soon.
- For editing or deleting books, or for search and category filters, use **Library Books**.
- For filtering active loans by borrower or category and for multi-copy issue, use **Library Distribution**.

---

## Related Pages

- [Library Dashboard](/help-center/s/library/library-dashboard) — Charts, total value, books by category, monthly loan trends, most borrowed.
- [Library Books](/help-center/s/library/library-books) — Full book list with search, category filter, create/edit/delete, view details and loan history.
- [Library Categories](/help-center/s/library/library-categories) — Manage book categories used when adding/editing books.
- [Library Distribution](/help-center/s/library/library-distribution) — Assign and return loans with filters and optional multi-copy issue.
- [Library Reports](/help-center/s/library/library-reports) — Books report, overdue, due soon, loan history, most borrowed, and CSV export.

---

*Category: `library` | Language: `en`*
