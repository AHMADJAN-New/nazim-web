# Grades

The Grades page is where you define grading scales used for exams and assessments. Each grade has names in multiple languages (English, Arabic, Pashto, Farsi), a percentage range (min–max), an order for display, and a pass/fail flag. School administrators use this page to set up the grade definitions (e.g., A, B, C, D, F or Pass/Fail) that are then used when entering marks and generating report cards.

---

## Page Overview

When you open the Grades page (Settings > Grades), you will see a card with a table of all grades and buttons for Create and Export.

### Summary Cards

This page does not have summary cards.

### Filters & Search

This page does not have a search or filter bar. All grades are shown in the table.

---

## Data Table

| Column | Description |
|--------|-------------|
| Name (En) | Grade name in English. |
| Name (Ar) | Grade name in Arabic (right-aligned). |
| Name (Ps) | Grade name in Pashto (right-aligned). |
| Name (Fa) | Grade name in Farsi (right-aligned). |
| Percentage Range | Min% – Max% (e.g., 90% - 100%). |
| Order | Numeric order used for sorting grades (e.g., 1, 2, 3). |
| Is Pass | Badge: Passing Grade (green) or Failing Grade (red). |
| Actions | Edit (pencil), Delete (trash). |

### Row Actions

- **Edit** — Opens the create/edit grade dialog with the grade’s data pre-filled so you can change names, percentage range, order, or pass/fail.
- **Delete** — Opens a confirmation dialog. Confirming deletes the grade. If the grade is in use (e.g., in exam marks), the system may prevent deletion or show a warning.

---

## Creating a New Grade

1. Click **Create**.
2. In the dialog:
   - **Name (En)** * — Grade name in English (e.g., A, B, Pass).
   - **Name (Ar)** * — Grade name in Arabic.
   - **Name (Ps)** * — Grade name in Pashto.
   - **Name (Fa)** * — Grade name in Farsi.
   - **Min Percentage** * — Lower bound of the percentage range (0–100). Must be less than max.
   - **Max Percentage** * — Upper bound (0–100). Must be greater than min.
   - **Order** * — Number used to sort grades (e.g., 1 for highest, 2 for next).
   - **Is Pass** — Toggle: Passing Grade (checked) or Failing Grade (unchecked).
3. Click **Create** (or **Save**).

The new grade appears in the table. Ranges should not overlap if you want a single grade per percentage; typically you define non-overlapping ranges (e.g., 90–100 = A, 80–89 = B).

---

## Editing a Grade

1. Click Edit (pencil) for the row.
2. Change any of the name fields, min/max percentage, order, or pass/fail. Ensure min < max.
3. Click **Update** (or **Save**).

---

## Deleting a Grade

1. Click Delete (trash) for the row.
2. Read the confirmation message (deleting may affect marks or reports that reference this grade).
3. Click **Delete** to confirm.

---

## Export Options

When the table has at least one grade, an **Export** button is available. It exports the list (all name columns, percentage range, order, pass/fail) to PDF or Excel.

---

## Tips & Best Practices

- Define grades with **non-overlapping percentage ranges** so that each score maps to exactly one grade (e.g., 90–100 = A, 80–89 = B, 70–79 = C, etc.).
- Use **Order** to control how grades appear in dropdowns and reports (e.g., 1 = A, 2 = B, 3 = C so A appears first).
- Set **Is Pass** correctly for each grade so reports and report cards can show pass/fail or highlight failing grades.
- Fill all four language names so that report cards and transcripts display correctly for English, Arabic, Pashto, and Farsi users.
- Avoid deleting a grade that is already used in exam marks; consider archiving or renaming instead if you need to change the scale later.

---

## Related Pages

- Exams — Enter marks and assign grades based on percentage; uses the grade definitions from this page
- Report cards and transcripts — Display grade letters or labels using the names and pass/fail flag defined here
- [Academic Years](/help-center/s/academic/academic-years) — Organize exams and assessments by year
- [Subjects](/help-center/s/academic/subjects) — Subjects and classes for which grades are used

---

*Category: `academic` | Language: `en`*
