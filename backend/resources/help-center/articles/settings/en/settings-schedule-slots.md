# Schedule Slots

The Schedule Slots settings page lets you define time slots used when building class timetables (e.g. 08:00–08:45, Period 1). School administrators use this page to add slots with start/end time, duration, days of the week, optional academic year and school scope, sort order, and active status. Timetable generation uses these slots to place subjects into periods; each slot can be global (all years) or scoped to an academic year and/or school.

---

## Page Overview

When you open this page, you will see a **PageHeader** (title "Schedule Slots", description, and **Add Slot** button when permitted), then a **Card** with a filter panel and a table (or on mobile, card list) of slots.

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Academic Year** — Filter slots by academic year. "All Academic Years" shows every slot; choosing a year shows slots for that year plus global (unspecified year) slots.
- **School** — Filter by school: "All Schools", "Organization-wide Only" (slots with no school), or a specific school. Organization-wide slots apply to all schools.
- **Search** — Search by slot name or code. Type in the search box to filter the list.

---

## Data Table

**Desktop:** A table with these columns:

| Column | Description |
|--------|-------------|
| Code | Slot code (e.g. P1, PERIOD-1). Monospace. |
| Name | Slot name (e.g. Period 1, First Period). |
| Time Range | Start time – end time (HH:MM). |
| Duration | Default duration in minutes (e.g. 45 min). |
| Days | Badges for days of the week (Mon–Sun) when the slot applies, or "All" if none selected (any day). |
| Academic Year | Badge with academic year name if scoped, or "Global" if not tied to a year. |
| School | School name if scoped, or "Organization-wide" if not tied to a school. |
| Sort Order | Numeric order for ordering slots in timetables. |
| Is Active | Badge: Active or Inactive. |
| Actions | Edit (pencil), Delete (trash). |

**Mobile:** Each slot is shown as a card with code, name, time range, duration, days, status, academic year, school, and Edit/Delete buttons.

### Row Actions

- **Edit (pencil)** — Opens the create/edit dialog with the slot’s data so you can change all fields.
- **Delete (trash)** — Opens a confirmation dialog. Confirming removes the slot. If timetables reference it, they may be affected; check before deleting.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Schedule Slot

Click **"Add Slot"** in the page header (or the main add button). A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Code | Text | Yes | Short code (e.g. P1). Max 100 characters. |
| Name | Text | Yes | Display name. Max 100 characters. |
| Duration | Number | Yes | Default duration in minutes (1–480). Default 45. |
| Start Time | Time (HH:MM) | Yes | Slot start time. |
| End Time | Time (HH:MM) | Yes | Slot end time. Must be after start time. |
| Days | Checkboxes | No | Days of the week (Monday–Sunday). Leave all unchecked for "any day". |
| Academic Year | Select | No | Optional. "Global" = not tied to a year (used for all years). Or choose a specific academic year. |
| School | Select | No | Optional. Only shown if the organization has multiple schools. "All Schools" = organization-wide. Or choose a school to scope the slot. |
| Sort Order | Number | Yes | Integer ≥ 1. Lower numbers appear first. Default 1 (or next after existing slots). |
| Is Active | Switch | No | Default: On. |
| Description | Textarea | No | Optional. Max 500 characters. |

Click **Save**. The new slot appears in the list and is used when generating timetables (filtered by academic year and school as configured).

---

## Editing a Schedule Slot

1. Find the slot in the table (or card list on mobile).
2. Click **Edit (pencil)** on that row or card.
3. The dialog opens with current data filled in.
4. Change any fields (code, name, times, duration, days, academic year, school, sort order, active, description).
5. Click **Save**.
6. The list refreshes.

---

## Deleting a Schedule Slot

1. Click **Delete (trash)** on the slot row or card.
2. A confirmation dialog appears (e.g. "Are you sure you want to delete [name]?").
3. Click **Delete** to confirm.
4. The slot is removed. If timetables use this slot, ensure you no longer need it or update those timetables before deleting.

---

## Export Options

This page does not show Export (PDF/Excel) buttons in the described component. If export is added later, it would typically export the filtered slot list (e.g. Code, Name, Time Range, Duration, Days, Academic Year, School, Sort Order, Active).

---

## Tips & Best Practices

- Use **Code** for short, consistent labels (e.g. P1, P2) so they appear clearly in timetables.
- Set **Sort Order** so periods appear in the correct order (e.g. 1, 2, 3 for first, second, third period).
- Use **Days** when a slot applies only on certain days (e.g. weekend classes). Leave unchecked for "any day" if the slot is used every day.
- **Global** academic year means the slot is available for all academic years; use a specific year only when the slot is year-specific.
- **Organization-wide** school means the slot is available for all schools; use a specific school only when the slot is school-specific.
- Ensure **End time** is after **Start time**; the form validates this.

---

## Related Pages

- [Settings: Academic Years](/help-center/s/settings/settings-academic-years) — Define academic years; slots can be scoped by year.
- [Settings: Classes](/help-center/s/settings/settings-classes) — Classes assigned to years; timetables are built per class–year.
- [Settings: Subjects](/help-center/s/settings/settings-subjects) — Subjects assigned to class–years; timetables place them into slots.

---

*Category: `settings` | Language: `en`*
