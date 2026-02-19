# Library Books

The Library Books page is where you manage your full book catalog: add, edit, and delete books, add copies, and view book details and loan history. School administrators and librarians use this page with search and category filters to find books, edit prices and loan settings, and see which copies are available or on loan. Row actions include View, Add Copy, Edit, and Delete (depending on permissions).

---

## Page Overview

When you open the Library Books page, you will see:

### Summary

- **PageHeader** — Title "Books", description (subtitle). Primary action: **Add Book** (if you have create permission).
- **Card** — Title "Books", description with total count. Filters and data table below.

### Filters & Search

- **Search** — Search by book title, author, ISBN, or book number (server-side). Placeholder: search books.
- **Category** — Dropdown: All Categories or a specific category. Filters the table.
- **Reset** — Button to clear search and set category back to "All". Shown when any filter is active.

---

## Data Table

| Column | Description |
|--------|-------------|
| Title | Book title; below it Book # and ISBN if present. |
| Author | Author name or "—". |
| Category | Category name as a badge, or "—". |
| Copies | Badges: "Available: X", "Total: Y". |
| Price | Book price (formatted). |
| Actions | View (eye), Add Copy, Edit (pencil), Delete (trash). Edit/Delete only if you have update/delete permission. |

Clicking a row opens the **View** panel (sheet). Pagination below the table.

### Row Actions

- **View** — Opens a side panel with book details and two tabs: **Book Information** (details + copies list) and **History** (loan history for this book).
- **Add Copy** — Creates one new physical copy for that book. Success toast; table refreshes.
- **Edit** — Opens the create/edit dialog with current data. Submit updates the book.
- **Delete** — Opens a confirmation dialog. Confirm permanently deletes the book (with "cannot undo" warning).

### Bulk Actions

No bulk actions on this page.

---

## Adding a New Book

1. Click **Add Book** (top right).
2. In the dialog, fill the form:

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| Book Title | Text | Yes | Max 255 characters. |
| Author | Text | No | Max 255 characters. |
| ISBN | Text | No | Max 100 characters. |
| Book Number | Text | Yes | Max 100 characters. |
| Category | Select | Yes | Choose from existing categories. |
| Volume | Text | No | Max 50 characters. |
| Description | Textarea | No | Optional. |
| Price | Number | Yes | Min 0.01. |
| Default Loan Days | Number | No | Default 30, min 1. |
| Initial Copies | Number | No | Default 1, min 0 (only for create). |
| Finance Account | Select | Yes | From finance accounts. |
| Currency | Select | Yes | From currencies. Selecting account can auto-fill currency. |

3. Click **Create** (or **Update** when editing). Dialog closes and the table refreshes.

---

## Editing a Book

1. Find the book in the table and click **Edit** (pencil).
2. The same form opens with current data. **Initial Copies** is not shown when editing.
3. Change fields as needed and click **Update**. Dialog closes and the table refreshes.

---

## Deleting a Book

1. Click **Delete** (trash) on the row.
2. Confirmation dialog: "Are you sure?" and message that the book will be deleted and this cannot be undone.
3. Click **Delete** to confirm. The book is removed from the list.

---

## View Panel (Book Details & History)

When you click **View** or a row:

- **Book Information** tab — Details: Title, Author, ISBN, Book Number, Category, Volume, Price, Default Loan Days, Total Copies, Available Copies, Description. If the book has copies, a **Copies** section lists each copy with code and status (available/secondary).
- **History** tab — Loan history for this book: each loan with status (Returned / Overdue / Active), copy code, loan date, borrower name and type (Student/Staff), due date, returned date (if returned), deposit amount, and notes.

---

## Tips & Best Practices

- Set **Category** and **Book Number** for every book so filtering and reporting are accurate.
- Use **Add Copy** when you receive additional physical copies of the same title.
- Use **View** → **History** to see who borrowed a book and when it was returned.

---

## Related Pages

- [Library](/help-center/s/library/library) — Quick add and inventory.
- [Library Categories](/help-center/s/library/library-categories) — Create and manage categories used here.
- [Library Distribution](/help-center/s/library/library-distribution) — Assign and return loans.
- [Library Reports](/help-center/s/library/library-reports) — Books report and export.

---

*Category: `library` | Language: `en`*
