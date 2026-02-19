# Classes

The Classes settings page lets you manage base classes (e.g. Grade 10, Class 10A) and assign them to academic years with sections, rooms, and capacity. School administrators use this page to define classes, assign classes to an academic year (with optional section name and room), bulk-create sections (e.g. A, B, C, D), copy class assignments between years, and view class history. Timetables, subject assignments, admissions, and student enrollment depend on classes and their year assignments.

---

## Page Overview

When you open this page, you will see a card with three tabs: **Base Classes**, **Year Classes**, and **Copy Classes**.

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Base Classes tab** — **Search** by class name, code, or description. An **Export** (PDF/Excel) button and **Add Class** button appear when you have permission.
- **Year Classes tab** — **Academic Year** dropdown to choose which year’s class list to show. Buttons: **Assign to Year**, **Bulk Create Sections**, and **Export** (when a year is selected and has data).
- **Copy Classes tab** — **Academic Year** dropdown; then **Copy Classes** button to open the copy dialog.

---

## Data Table

### Base Classes tab

| Column | Description |
|--------|-------------|
| Name | Base class name (e.g. Grade 10A). |
| Code | Short code (e.g. 10A). |
| Grade Level | Grade 0–12 if set, or "—". |
| Default Capacity | Default student capacity (1–200). |
| Is Active | Badge: Active or Inactive. |
| Actions | View History (clock icon), Edit (pencil), Delete (trash). |

### Year Classes tab (after selecting an academic year)

| Column | Description |
|--------|-------------|
| Name | Class name (from base class). |
| Section | Section name (e.g. A, B) or "—". |
| Room | Assigned room number or "—". |
| Capacity | Capacity for this instance or class default. |
| Student Count | Current number of students in this class instance. |
| Actions | Edit instance (pencil), Remove from year (trash). |

### Row Actions

- **Base Classes:** **View History** — Opens a dialog with a table of this class across academic years (year, section, teacher, room, student count). **Edit** — Opens create/edit class dialog. **Delete** — Opens delete confirmation for the base class.
- **Year Classes:** **Edit** — Opens assign dialog to change section, room, capacity, or notes for this instance. **Remove** — Opens confirmation to remove this class instance from the academic year (does not delete the base class).

### Bulk Actions

No bulk actions on the table; use **Bulk Create Sections** to add multiple sections at once (see below).

---

## Adding a New Base Class

Click **"Add Class"** on the Base Classes tab. A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Class name. Max 100 characters. |
| Code | Text | Yes | Short code. Max 50 characters. |
| Grade Level | Number | No | 0–12. Optional. |
| Description | Textarea | No | Max 500 characters. |
| Default Capacity | Number | No | 1–200. Default 30. |
| Is Active | Switch | No | Default: On. |

Click **Save**. The new base class appears in the Base Classes table. You can then assign it to an academic year on the Year Classes tab.

---

## Editing a Base Class

1. On the Base Classes tab, find the class and click **Edit (pencil)**.
2. Change name, code, grade level, description, default capacity, or is active.
3. Click **Save**. The table refreshes.

---

## Deleting a Base Class

1. On the Base Classes tab, click **Delete (trash)** on the row.
2. Confirm in the dialog. The base class is removed. Class instances (year assignments) linked to it may be affected; ensure you no longer need them before deleting.

---

## Assigning a Class to an Academic Year

1. Open the **Year Classes** tab and select an **Academic Year**.
2. Click **"Assign to Year"**.
3. In the dialog: select **Class** (required), **Academic Year** (required), **Section name** (optional, e.g. A), **Room** (optional), **Capacity** (optional override), **Notes** (optional).
4. Click **Save**. The class appears in the Year Classes table for that year.

To edit an existing assignment (section, room, capacity, notes), click **Edit (pencil)** on the row in Year Classes; the same form opens in update mode. Click **Save** to apply.

---

## Bulk Create Sections

1. On the **Year Classes** tab, select an **Academic Year**.
2. Click **"Bulk Create Sections"**.
3. Select **Class** (required), **Academic Year** (required), **Sections** (required): comma-separated list, e.g. `A, B, C, D`. Optional: **Default room**, **Default capacity**.
4. Click **Create Sections**. One class instance per section is created for that year.

---

## Copying Classes Between Academic Years

1. Open the **Copy Classes** tab and select the **Academic Year** you want to copy from (source).
2. Click **"Copy Classes"**.
3. In the dialog: **From year** (source), **To year** (target), then select which **class instances** to copy (checkboxes). Option: **Copy assignments** (e.g. subject/teacher assignments) to the target year.
4. Click **Copy Classes**. The selected class instances are created in the target year; optionally with assignments copied.

---

## Class History

Click **View History** (clock icon) on a base class row to open a dialog. It shows a table of that class across academic years: Academic Year name, Section, Teacher, Room, Student count. Use this to see how the class was used in past years.

---

## Export Options

- **Base Classes tab:** Export (PDF/Excel) exports the filtered base classes list (Name, Code, Grade Level, Default Capacity, Is Active). Filters summary (e.g. search) is included when set.
- **Year Classes tab:** When an academic year is selected and has data, Export exports the year’s class instances (Class name, Section, Room, Capacity, Student count). Summary includes the selected academic year.

---

## Tips & Best Practices

- Create **base classes** first (e.g. 10A, 10B, 11A), then assign them to each **academic year** and add section names if needed.
- Use **Bulk Create Sections** when you have many sections (e.g. A–D) for one class in a year.
- Set **Default capacity** on the base class so new year assignments inherit it; override per instance only when needed.
- When starting a new academic year, use **Copy Classes** to copy last year’s structure and optionally copy assignments.
- **Remove** from year only removes the instance for that year; the base class stays. **Delete** on the Base Classes tab removes the class entirely.

---

## Related Pages

- [Settings: Academic Years](/help-center/s/settings/settings-academic-years) — Define academic years before assigning classes.
- [Settings: Subjects](/help-center/s/settings/settings-subjects) — Assign subjects to class-year instances.
- [Settings: Schedule Slots](/help-center/s/settings/settings-schedule-slots) — Build timetables using classes and slots.

---

*Category: `settings` | Language: `en`*
