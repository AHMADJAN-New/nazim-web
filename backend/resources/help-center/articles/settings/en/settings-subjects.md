# Subjects

The Subjects settings page lets you manage base subjects (e.g. Mathematics, Quran) and assign them to classes in two steps: first to a class template (which subjects a class can offer), then to a specific class–academic-year instance (the actual subject offerings with room and notes). School administrators use this page to define subjects, control which subjects each class can have, and assign subjects to class instances for timetables, exams, and marks. Exams and timetables depend on subjects being assigned to the correct class–academic-year.

---

## Page Overview

When you open this page, you will see a **PageHeader** and two tabs: **Base Subjects** and **Class Subjects**.

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Base Subjects tab** — **Search** by subject name, code, or description inside a Filter panel. **Add Subject** button when you have permission.
- **Class Subjects tab** — **Step 1:** Select a **Class** to see and manage which subjects are in that class’s template. **Step 2:** Select **Academic Year** and **Class instance** (class–year) to see and manage subjects assigned to that instance. Buttons: Assign to class (Step 1), Bulk assign to class (Step 1), Assign to class year (Step 2), Bulk assign (Step 2), Copy between years (Step 2). Export when data is available.

---

## Data Table

### Base Subjects tab

| Column | Description |
|--------|-------------|
| Code | Subject code (e.g. MATH, QURAN). Shown in monospace. |
| Name | Subject name. |
| Description | Optional description. Truncated; "—" if empty. |
| Is Active | Badge: Active or Inactive. |
| Actions | Edit (pencil), Delete (trash). |

The table is paginated; use the pagination controls below the table.

### Class Subjects tab — Step 1 (Class subject template)

After selecting a class, a table or list shows which subjects are assigned to that class’s template (subjects the class can offer). You can add one subject or bulk-add multiple subjects to the class template. Each row can have a remove action.

### Class Subjects tab — Step 2 (Class academic year subjects)

After selecting an academic year and a class instance (class–year), a table shows subjects assigned to that instance: subject name/code, room, notes, teacher if applicable, and actions (Edit, Remove). You can assign one subject or bulk-assign multiple subjects to this class instance. Assignments here are used for timetables and exams.

### Row Actions

- **Base Subjects:** **Edit** — Opens the subject form to change name, code, description, or active. **Delete** — Opens delete confirmation for the base subject.
- **Class Subjects (Step 1):** Remove subject from class template.
- **Class Subjects (Step 2):** Edit assignment (e.g. room, notes) or Remove subject from this class instance.

### Bulk Actions

No table-level bulk select; use **Bulk assign to class** (Step 1) or **Bulk assign** (Step 2) to add multiple subjects at once.

---

## Adding a New Subject

Click **"Add Subject"** on the Base Subjects tab. A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Subject name. Max 100 characters. |
| Code | Text | Yes | Short code. Max 50 characters. |
| Description | Textarea | No | Max 500 characters. |
| Is Active | Switch | No | Default: On. |

Click **Save**. The new subject appears in the Base Subjects table. You can then add it to class templates (Step 1) and to class–year instances (Step 2).

---

## Editing a Subject

1. On the Base Subjects tab, find the subject and click **Edit (pencil)**.
2. Change name, code, description, or is active.
3. Click **Save**. The table refreshes.

---

## Deleting a Subject

1. On the Base Subjects tab, click **Delete (trash)** on the row.
2. Confirm in the dialog. The base subject is removed. If it is assigned to class templates or class–year instances, those assignments may be affected; check before deleting.

---

## Step 1: Assigning Subjects to a Class (Template)

This defines which subjects a class can offer (template). It does not assign to a specific academic year.

1. Open the **Class Subjects** tab.
2. Select a **Class** (Step 1).
3. Click **Assign to class** (or similar) to add one subject: choose **Class** and **Subject**, then Save.
4. To add many at once: click **Bulk assign to class**, choose **Class** and **Subject(s)** (multiple), then submit. All selected subjects are added to that class’s template.
5. To remove a subject from the template, use the remove action on the row.

Only subjects in the class template can be assigned in Step 2 to class–academic-year instances.

---

## Step 2: Assigning Subjects to a Class–Academic-Year Instance

This assigns subjects to a specific class in a specific academic year (used for timetables and exams).

1. On the **Class Subjects** tab, select **Academic Year** and then the **Class instance** (class–year) in Step 2.
2. Click **Assign to class year** (or similar): choose **Class instance** (class–academic-year), **Subject**, optional **Room**, optional **Notes**. Save.
3. To add many at once: click **Bulk assign**, choose **Class instance** and **Subject(s)**, optional **Default room**. Submit.
4. To edit an assignment (room, notes), use Edit on the row. To remove a subject from this instance, use Remove.

---

## Copying Subjects Between Class–Year Instances

1. On the **Class Subjects** tab, in Step 2 select the **source** class–academic-year (from year and class instance).
2. Click **Copy between years** (or similar).
3. In the dialog: choose **From** class–academic-year and **To** class–academic-year. Option: **Copy assignments** (e.g. teacher/room) to the target.
4. Submit. Subject assignments are copied to the target class–year; optionally with assignment details.

---

## Export Options

- **Base Subjects:** No export in the read portion; if Export exists on this tab, it would export the filtered subject list (e.g. Code, Name, Description, Is Active).
- **Class Subjects Step 1:** When a class is selected and has template subjects, Export can export that list (e.g. Code, Name).
- **Class Subjects Step 2:** When a class instance is selected and has subjects, Export can export that instance’s subject list (e.g. subject, room, teacher).

---

## Tips & Best Practices

- Define all **base subjects** first, then use **Step 1** to set which subjects each class can offer (template).
- Use **Step 2** to assign subjects to each class–academic-year so timetables and exams have the correct offerings.
- Use **Bulk assign** in both steps to save time when many subjects are added to one class or one class instance.
- When starting a new academic year, use **Copy between years** to copy last year’s subject assignments and optionally copy assignment details.
- Removing a subject from a class template (Step 1) does not remove it from existing class–year instances; remove from Step 2 where needed.

---

## Related Pages

- [Settings: Academic Years](/help-center/s/settings/settings-academic-years) — Define academic years used in Class Subjects Step 2.
- [Settings: Classes](/help-center/s/settings/settings-classes) — Define classes and assign them to academic years before assigning subjects.
- [Settings: Schedule Slots](/help-center/s/settings/settings-schedule-slots) — Build timetables using subjects and slots.

---

*Category: `settings` | Language: `en`*
