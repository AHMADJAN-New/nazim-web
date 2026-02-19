# ID Card Assignment

The ID Card Assignment page is where you assign ID card templates to students and manage those assignments. You can assign cards to regular (academic) students or to course students, track card fees and payment, mark cards as printed, and preview or edit individual assignments. School administrators and staff use this page to ensure every student has an ID card record before exporting for printing.

---

## Page Overview

When you open the ID Card Assignment page, you will see:

### Summary Cards

This page does not have summary cards at the top. The main content is organized in two tabs: **Assignment** and **Assigned Cards**, with counts shown on the Assigned Cards tab.

### Filters & Search

On the **Assignment** tab, the following filters and search are available:

- **Academic Year** — Select the academic year. Required for assignment; often defaults to the current academic year.
- **School** — Filter by school (or "All Schools").
- **Class** — For regular students only. Filter by class (or "All").
- **Course** — For course students only. Filter by course (or "All").
- **Enrollment Status** — All, Active, or Inactive.
- **Template** — Filter by ID card template (or "All").
- **Search** — Search students by name, admission number, or student code. Applies to the student list and the assigned-cards table.

---

## Tabs

The page has two main tabs:

1. **Assignment** — Select students (regular or course), choose a template, optionally set card fee and fee-paid status, and assign cards in bulk. Includes a preview section.
2. **Assigned Cards** — View all assigned ID cards in a table with filters (All, Unprinted, Printed). You can export a report (PDF/Excel), preview cards, mark as printed, mark fee paid, edit, or delete.

---

## Assignment Tab: Student List and Assign Panel

### Student Type

At the top you choose:

- **Regular Students** — Students enrolled in classes (academic year, school, class).
- **Course Students** — Students enrolled in short-term courses.

Switching type clears your selection and resets class/course filters as appropriate.

### Student List (Left)

- Lists students (or course students) matching the current filters and search.
- Each row shows: checkbox, student name, admission number, and badges: **Assigned**, **Not Assigned**, **Printed**, **Fee Paid**.
- **Select All** / **Deselect All** — Toggle selection of all listed students.
- You select one or more students, then use the right-hand panel to assign a template to them.

### Assign Template Panel (Right)

| Field / Control | Type | Required | Description |
|-----------------|------|----------|-------------|
| Template | Dropdown | Yes | Choose the ID card template to assign. |
| Card Fee | Number | No | Optional fee amount for the card. |
| Fee Paid | Checkbox | No | If checked, the card fee is recorded as paid. When checked, Account and Income Category become required. |
| Account | Dropdown | Yes if Fee Paid | Finance account for recording the income. |
| Income Category | Dropdown | Yes if Fee Paid | Income category for the card fee. |
| Selected count | Text | — | Shows how many students are selected. |
| **Assign Cards** button | Button | — | Disabled until Academic Year, Template, and at least one student are selected. Opens a confirmation dialog. |

After confirming in the dialog, the selected students receive an ID card assignment with the chosen template and optional fee data. The list and Assigned Cards tab refresh.

### Preview (Assignment Tab)

- **Select student** — Dropdown of students who already have an assigned card (for preview).
- **Front / Back** — Choose which side to preview.
- **Preview** button — Opens a dialog showing the ID card as it would look for that student (front or back).

---

## Assigned Cards Tab: Data Table

The table shows assigned ID cards (optionally filtered by the same Academic Year, School, Class/Course, Template, Enrollment Status, and Search). Sub-tabs:

- **All** — All assigned cards.
- **Unprinted** — Cards not yet marked as printed.
- **Printed** — Cards marked as printed.

### Table Columns

| Column | Description |
|--------|-------------|
| Student | Full name (regular or course student). |
| Admission No | Admission number (or course admission number). |
| Class / Course | Class name for regular students, or course name for course students. |
| Template | Name of the assigned ID card template. |
| Fee Status | Badge: Paid or Unpaid. |
| Printed Status | Badge: Printed or Unprinted. |
| Actions | Preview (eye), Mark as Printed (printer), Mark Fee Paid (dollar), Edit (pencil), Delete (trash). |

### Row Actions

- **Preview (Eye)** — Opens a dialog with the ID card preview (front/back, download as PNG).
- **Mark as Printed (Printer)** — Marks the card as printed. Only shown when the card is not yet printed.
- **Mark Fee Paid (Dollar)** — Records the card fee as paid. Only shown when fee is not yet paid. You may need to set Account and Income Category in Edit if required.
- **Edit (Pencil)** — Opens the Edit ID Card dialog (fee amount, Fee Paid, Account, Income Category).
- **Delete (Trash)** — Opens a confirmation dialog. Confirming removes the ID card assignment.

### Bulk Actions

No bulk row selection for the Assigned Cards table. Bulk assignment is done from the Assignment tab by selecting multiple students and clicking **Assign Cards**.

---

## Report Export (Assigned Cards Tab)

At the top of the Assigned Cards card, **Report Export** buttons (e.g. PDF, Excel) are available. The report includes the filtered list of assigned cards with columns such as: Student name, Admission No, Class/Course, Template, Card Number, Fee Status, Fee Amount, Printed Status, Printed At, Assigned At. The export respects the current filters (academic year, school, class/course, template, enrollment status, search).

---

## Editing an ID Card Assignment

To edit an existing assignment (fee and payment details):

1. Open the **Assigned Cards** tab and find the card in the table.
2. Click the **Edit** (pencil) button on that row.
3. In the **Edit ID Card** dialog you can change:
   - **Card Fee** — Amount.
   - **Fee Paid** — Checkbox. If checked, **Account** and **Income Category** are required.
4. Click **Save**. The table refreshes.

---

## Deleting an ID Card Assignment

To delete an assignment:

1. Click the **Delete** (trash) button on the card row.
2. A confirmation dialog appears (e.g. "Are you sure you want to delete this ID card assignment?").
3. Click **Confirm** (or **Delete**) to remove the assignment, or **Cancel** to keep it.
4. The student will no longer have an ID card record until you assign a card again.

---

## Tips & Best Practices

- Ensure at least one ID card template exists (from ID Card Templates) before assigning. Set a default template to speed up assignment.
- Use filters (Academic Year, School, Class/Course) to narrow the list before selecting students for bulk assignment.
- If you charge a card fee, fill Card Fee and check Fee Paid only after payment; select Account and Income Category so the income is recorded correctly in Finance.
- Use **Mark as Printed** after cards are physically printed to track which ones are done.
- Use the **Preview** to verify layout and data before exporting from the ID Card Export page.
- Use the report export (PDF/Excel) from Assigned Cards for records or printing lists.

---

## Related Pages

- [ID Card Templates](/help-center/s/id-cards/id-cards-templates) — Create and manage ID card templates and layout.
- [ID Card Export](/help-center/s/id-cards/id-cards-export) — Export ID cards as ZIP or PDF for printing.

---

*Category: `id-cards` | Language: `en`*
