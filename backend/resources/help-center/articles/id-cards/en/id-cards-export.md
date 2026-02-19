# ID Card Export

The ID Card Export page lets you export assigned student ID cards as files for printing. You can choose between regular (academic) students and course students, apply filters (academic year, school, class/course, template, enrollment status, printed status, fee status), select specific cards or export all filtered cards, and download either a ZIP of images/PDFs or a single multi-page PDF. Staff with export permission use this page to prepare ID cards for the printer.

---

## Page Overview

When you open the ID Card Export page, you will see:

### Summary Cards

Four summary cards at the top:

- **Total Cards** — Number of ID cards matching the current filters.
- **Printed** — Count of cards marked as printed (and percentage of total).
- **Fee Paid** — Count of cards with fee paid (and percentage).
- **Fee Collected** — Total amount of fee collected (sum of fees for cards marked as paid).

### Filters & Search

- **Student type** — Tabs: **Regular Students** or **Course Students**.
- **Academic Year** — Select academic year (often defaults to current).
- **School** — All or a specific school.
- **Class** — For regular students: All or a specific class.
- **Course** — For course students: All or a specific course.
- **Template** — All or a specific ID card template.
- **Enrollment Status** — All, Active, or Inactive.
- **Printed Status** — All, Printed, or Unprinted.
- **Fee Status** — All, Paid, or Unpaid.
- **Search** — Search by student name or admission number.

Your filter and export choices are saved in the browser (e.g. for the next visit).

---

## Export Options (Left Panel)

| Option | Type | Description |
|--------|------|-------------|
| Export Format | Dropdown | **ZIP (PNG/PDF)** — Download a ZIP file containing each card as PNG or PDF. **Single PDF** — One PDF with multiple cards (one card per page, no A4 background). |
| Card Sides | Dropdown | **Front Only**, **Back Only**, or **Both Sides**. |
| Cards Per Page | Dropdown | Shown only for PDF format. Currently fixed so each card is on its own page (no A4 background). |
| Quality | Dropdown | **Standard (96 DPI)** or **High (300 DPI)**. Higher DPI is better for printing. |
| Include Unprinted Cards | Switch | If on, cards not marked as printed are included in the export. Default on. |
| Include Unpaid Cards | Switch | If on, cards with fee unpaid are included. Default on. |

---

## Student Selection Table (Center)

A table lists all ID cards that match the current filters and the two "Include" switches (unprinted, unpaid). Columns:

| Column | Description |
|--------|-------------|
| Checkbox | Select/deselect the row for export. |
| Student | Full name. |
| Admission No | Admission number (or course admission number). |
| Class / Course | Class name or course name. |
| Template | ID card template name. |
| Fee Status | Paid or Unpaid badge. |
| Printed Status | Printed or Unprinted badge. |

### Selection Actions

- **Select All** / **Deselect All** — Toggle all rows in the table.
- **Select Printed** — Select only rows where Printed Status is Printed.
- **Select Unprinted** — Select only rows where Printed Status is Unprinted.

Below the table, the number of selected cards is shown (e.g. "X card(s) selected").

---

## Export Actions (Bottom)

- **Export All Filtered** — Exports all cards in the current filtered list (respecting Include Unprinted and Include Unpaid). Disabled if the list is empty or export is in progress.
- **Export Selected (X)** — Exports only the checked rows. Disabled if no rows are selected or export is in progress.

Clicking either button starts the export. When ready, the browser downloads the file (ZIP or PDF). Format, sides, quality, and include options apply to both export actions.

---

## What Gets Exported

- **ZIP**: Contains one or more files (e.g. PNG or PDF per card/side) depending on format and "Card Sides" (front only, back only, or both).
- **Single PDF**: One PDF with one page per card (or per side, depending on options). Cards use the template layout and current student data; no A4 background is added.

Exports use the selected **Quality** (96 or 300 DPI). Filters (academic year, school, class/course, template, enrollment, printed status, fee status, search) and the two "Include" switches determine which cards appear in the list and thus what "Export All Filtered" includes.

---

## Tips & Best Practices

- Use **High (300 DPI)** for printing; use Standard for quick previews or screen use.
- Use filters to export only one class, one course, or one template at a time for easier handling at the printer.
- Use **Select Printed** or **Select Unprinted** to export only the batch you need (e.g. only unprinted cards for a new print run).
- If you turn off "Include Unprinted Cards" or "Include Unpaid Cards", the table and "Export All Filtered" reflect that; "Export Selected" still exports only the rows you checked.
- Your settings (student type, filters, format, sides, quality, include switches) are saved in the browser for the next time you open the page.

---

## Related Pages

- [ID Card Templates](/help-center/s/id-cards/id-cards-templates) — Create and manage ID card templates.
- [ID Card Assignment](/help-center/s/id-cards/id-cards-assignment) — Assign templates to students and manage fee/printed status before exporting.

---

*Category: `id-cards` | Language: `en`*
