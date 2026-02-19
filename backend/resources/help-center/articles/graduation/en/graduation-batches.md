# Graduation Batches

The Graduation Batches page is where you create and manage graduation batches for final-year graduation, promotion, and transfer. School administrators and staff use this page to define batches (academic year, class, exams, attendance rules, graduation date), generate eligible students, approve batches, and then issue certificates from the batch detail page. You can also filter, search, sort, export to PDF/Excel, and switch between card and table view.

---

## Page Overview

When you open the Graduation Batches page, you will see:

### Summary Cards

- **Total Batches** — Total number of batches matching the current filters.
- **Draft** — Number of batches in draft status (yellow).
- **Approved** — Number of batches that are approved and ready for certificate issuance (blue).
- **Issued** — Number of batches for which certificates have been issued (green).

### Filters & Search

- **School** — Filter batches by school. You must select a school to see any data; if none is selected, a message asks you to select a school.
- **Academic Year** — Filter by academic year.
- **Class** — Filter by class.
- **Exam** — Filter by exam (exams are filtered by the selected academic year and class).
- **Status** — Buttons: All, Draft, Approved, Issued (each shows count in parentheses).
- **Search** — Search by academic year name, class name, or exam name. A clear (X) button appears when there is text.
- **From Date** — Filter batches with graduation date on or after this date.
- **To Date** — Filter batches with graduation date on or before this date.

### View Mode

Two buttons at the top right switch between **Card view** (grid of batch cards) and **Table view** (sortable table). Export buttons (PDF/Excel) are next to them and use the same filtered and sorted data.

---

## Data Display

Batches are **grouped by academic year** (most recent first). Each group is a card with a title (year name) and a badge showing how many batches are in that group. Within each group, batches are shown either as cards or as table rows.

### Card View (per batch)

Each batch card shows:

- Class name and status badge (Draft / Approved / Issued); for promotion/transfer, an extra badge for type
- Workflow stepper (e.g. Students generated → Approved → Certificates issued)
- Students count and exams count
- Academic year, graduation date, and for promotion/transfer: "From class → To class"
- **Actions:**  
  - **Draft:** "Generate" (generate eligible students), "Approve"  
  - **Approved:** "Issue Certificates" (navigates to batch detail)  
  - An eye icon opens a side panel with batch details and Edit/Delete/View Details

### Table View (columns)

| Column | Description |
|--------|-------------|
| Academic Year | Academic year name (column is sortable). |
| Class | Class name. |
| Class Transfer | For transfer: "From class → To class". For promotion: "Class → To class". Otherwise "—". |
| Exams | Exam names as badges (or single exam name). |
| Graduation Date | Graduation date (column is sortable). |
| Status | Status badge and, if applicable, type badge (Transfer/Promotion). |
| Students | Student count. |
| Actions | View (eye) link to batch detail page. |

Sorting: Click the column header for Academic Year, Graduation Date, or Status to sort; click again to toggle ascending/descending.

### Row / Card Actions

- **Click card or row** — Opens a **side panel** with batch summary, academic year, class, graduation date, student count, exams, and for draft batches: "Generate Students" and "Approve" buttons. From the panel you can also **Edit**, **Delete**, or **View Details** (batch detail page).
- **Edit** — Opens the edit dialog (same fields as create). Available only for draft batches. Some fields (e.g. graduation type) may be locked if the batch already has students.
- **Delete** — Opens a confirmation dialog. Deleting removes the batch permanently. Only for draft batches from the side panel.
- **View Details** — Goes to the batch detail page where you can generate students, approve, select a certificate template, configure certificate numbers, and issue certificates.

---

## Creating a New Batch

Click the **"Create Batch"** button (or "Create" in the page header). A dialog opens with the following fields.

### Graduation Type

- **Final Year Graduation** — Students completing their final year. You select one **Class**.
- **Promotion** — Moving students to the next class. You select **From Class** and **To Class**.
- **Transfer** — Moving students between classes. You select **From Class** and **To Class** (must be different).

A tooltip (?) explains the three types.

### Academic Year and Class(es)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Academic Year | Select | Yes | Academic year for the batch. |
| Class | Select | Yes (Final Year) | Class for final-year graduation. |
| From Class | Select | Yes (Promotion/Transfer) | Source class. |
| To Class | Select | Yes (Promotion/Transfer) | Target class. To Class options exclude the selected From Class. |

### Exams

- **Exams** — A scrollable list of checkboxes. Only exams that belong to the selected academic year and class (via exam classes) are shown. At least one exam must be selected.
- **Exam Weights** — If you select **two or more exams**, an Exam Weights section appears. You must assign a percentage to each selected exam; the total must sum to 100%.

### Attendance Requirements

- **Require Attendance** — Checkbox. If checked, students must meet the minimum attendance to be eligible.
- **Minimum Attendance %** — Number (0–100). Shown only when "Require Attendance" is checked. Default 75. Students must have at least this percentage to be included.
- **Exclude Approved Leaves** — Checkbox. When checked, approved leaves (sick, personal, etc.) do not count as absences when calculating attendance.

### Graduation Date

- **Graduation Date** — Date picker. Required. The official date of graduation for the batch.

### What Happens After Submission

1. The system validates all required fields (including class/from class/to class and at least one exam).
2. On success, a "Batch created" message appears, the dialog closes, and the batches list refreshes.
3. The new batch appears in **Draft** status. Next steps: open the batch (View Details), run **Generate Students**, then **Approve**, then from the batch detail page choose a template and **Issue Certificates**.

---

## Editing a Batch

1. Find the batch in the list (card or table).
2. Click the batch to open the side panel, then click **Edit** (or use the eye icon first, then Edit in the panel). Edit is only available for draft batches.
3. The edit dialog opens with the same fields as create, pre-filled. Change any allowed fields (e.g. graduation date, attendance settings, exams/weights). If the batch already has students, graduation type and possibly class may be locked.
4. Click **Save**.
5. A "Batch updated" message appears, the dialog and panel close, and the list refreshes.

---

## Deleting a Batch

1. Open the batch in the side panel (click the batch card or row, then the eye icon if needed).
2. Click **Delete**.
3. A confirmation dialog asks you to confirm. The action cannot be undone.
4. Click **Confirm** (or the delete button in the dialog) to permanently remove the batch.

Only draft batches can be deleted.

---

## Batch Detail Page (View Details)

From the side panel or the "View Details" / "Issue Certificates" link you go to the batch detail page. There you can:

- **Generate Students** — For draft batches, compute the list of eligible students based on class, exams, attendance, and pass/fail rules.
- **Approve** — For draft batches, after students are generated, approve the batch so it moves to "Approved" and certificates can be issued.
- **Issue Certificates** — For approved batches, select a certificate template, optionally set certificate number prefix/type/starting number/padding, then issue certificates. Success messages and navigation are shown after issuance.

The detail page also shows student list, pass/fail counts, and workflow stepper.

---

## Export Options

- **PDF** and **Excel** export buttons are in the page header. They export the **current filtered and sorted** list of batches.
- Columns in the export include: Academic Year, Class, Graduation Type, Class Transfer, Exams, Graduation Date, Status, Students count, Created At. A filter summary can be included. Exports respect the same filters (school, academic year, class, exam, status, date range, search) and sort order as the current view.

---

## Tips & Best Practices

- **Select school first** — You must choose a school before any batches are shown.
- **Choose the right graduation type** — Final Year for completion; Promotion/Transfer for moving students between classes. From/To class must be different for Transfer.
- **Set exam weights** — When using multiple exams, assign weights that sum to 100% so the system can compute a combined result correctly.
- **Use filters** — Use status, date range, and search to find specific batches quickly.
- **Export for records** — Use PDF or Excel export to keep a record of batches and their status for reporting or audits.

---

## Related Pages

- [Graduation Dashboard](/help-center/s/graduation/graduation) — Overview, summary cards, recent batches, pending approvals, quick actions
- [Graduation Certificate Templates](/help-center/s/graduation/graduation-certificate-templates) — Create and edit certificate templates used when issuing certificates from a batch

---

*Category: `graduation` | Language: `en`*
