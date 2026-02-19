# Grades

The Grades page lets you define grade bands used for exam results and assessments (e.g. A+, A, B, C, Fail). Each grade has a percentage range (min–max), an order for sorting, and a flag for pass/fail. Grades are used when entering or displaying marks and in reports. They are organization-scoped.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

There is no separate filter panel. The page shows all grades for your organization in a single table.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name (English) | Grade name in English (e.g. A+, Fail). |
| Name (Arabic) | Grade name in Arabic. Right-aligned (RTL). |
| Name (Pashto) | Grade name in Pashto. Right-aligned (RTL). |
| Name (Farsi) | Grade name in Farsi. Right-aligned (RTL). |
| Percentage Range | Min% – Max% (e.g. 90% - 100%). |
| Order | Numeric order used for sorting grades (higher order often shown first in lists). |
| Is Pass | Badge: Passing Grade (green with check) or Failing Grade (red with X). |
| Actions | Edit (pencil) and Delete (trash) buttons. |

### Row Actions

When you use the actions on any row:

- **Edit** — Opens the grade create/edit dialog with the current data. Change any field and click **Update** (or **Create** in create mode).
- **Delete** — Opens a confirmation dialog. Click **Delete** to remove the grade. If the grade is in use (e.g. in exam marks), deletion may be blocked or you may need to update those records first.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Grade

To create a new grade, click the **"Create"** button at the top. A dialog opens with the following fields:

### Name fields (multi-language)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name (English) | Text | Yes | Grade name in English. |
| Name (Arabic) | Text | Yes | Grade name in Arabic. RTL input. |
| Name (Pashto) | Text | Yes | Grade name in Pashto. RTL input. |
| Name (Farsi) | Text | Yes | Grade name in Farsi. RTL input. |

### Percentage and behaviour

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Min Percentage | Number | Yes | Minimum percentage for this grade (0–100). |
| Max Percentage | Number | Yes | Maximum percentage for this grade (0–100). Must be greater than Min. |
| Order | Number | Yes | Integer ≥ 0. Used to sort grades (e.g. A+ first, Fail last). |
| Is Pass | Switch | Yes | On = Passing Grade, Off = Failing Grade. Affects reports and badges. |

Click **Create** to save. The dialog closes and the table refreshes.

### What Happens After Submission

- The system validates that Min Percentage < Max Percentage.
- A success message (e.g. "Grade created successfully") appears.
- The dialog closes and the grades list refreshes.

---

## Editing a Grade

To edit an existing grade:

1. Find the grade in the table.
2. Click the **Edit** (pencil) button.
3. Change any of the name, percentage, order, or pass/fail fields.
4. Click **Update**.
5. The dialog closes and the table refreshes.

---

## Deleting a Grade

To delete a grade:

1. Click the **Delete** (trash) button on the row.
2. A confirmation dialog appears (e.g. "Are you sure you want to delete?").
3. Click **Delete** to confirm.
4. If the grade is referenced by exam marks or other data, the system may prevent deletion. Reassign or remove those references first if needed.

---

## Export Options

When grades exist, **Export** (PDF/Excel) buttons appear in the card header. The export includes all columns: Name (En, Ar, Ps, Fa), Percentage Range, Order, and Is Pass (as Passing/Failing Grade text).

---

## What This Setting Controls and What Depends on It

- **Controls:** The list of grade bands available when entering or displaying exam marks and in grade-based reports. Pass/fail affects how results are interpreted.
- **Depends on:** Nothing (grades are organization-scoped and standalone).
- **Used by:** Exam marks entry, result cards, and any report or screen that shows grades (e.g. by percentage range or pass/fail).

---

## Tips & Best Practices

- Define percentage ranges so they do not overlap (e.g. A+ 90–100, A 80–89, B 70–79). Overlapping ranges can cause ambiguous results.
- Use Order to control how grades appear in dropdowns (e.g. best grade first or worst first).
- Mark failing grades with Is Pass = Off so reports and dashboards can filter or highlight failures correctly.
- Keep names consistent across all four languages so reports and transcripts look correct in every language.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Enter and view marks; grades are used to display or compute results
- [Settings – Subjects](/help-center/s/settings/settings-subjects) — Subjects and class subjects (grades apply to subject marks)

---

*Category: `settings` | Language: `en`*
