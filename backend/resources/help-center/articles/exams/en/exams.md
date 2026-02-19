# Exams

The Exams page is the main hub for managing all exams in your school. School administrators and staff use this page to create exams for academic years, assign classes and subjects, change exam status (draft → scheduled → in progress → completed → archived), and open timetables, student enrollment, marks entry, and reports. Every exam is listed with its type, academic year, status, and date period.

---

## Page Overview

When you open the Exams page, you will see:

### Summary Cards

This page does not have summary cards at the top. When you expand a row (click the chevron or exam name), an expanded section shows **Statistics** for that exam: number of classes, subjects, enrolled students, results entered, and—if pass/fail is configured—passed and failed counts.

### Filters & Search

- **Search** — Search by exam name, academic year name, or exam type name. Type in the search box to filter the list.
- **Filter by status** — Filter by exam status: All, Draft, Scheduled, In Progress, Completed, or Archived.
- **Filter by exam type** — Dropdown listing all active exam types (e.g. Midterm, Final). Choose one or "All".

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|--------------|
| (Expand) | Chevron button to expand or collapse the row. Expanded row shows description, statistics, and classes assigned. |
| Name | Exam name. Clicking it toggles the expanded section. |
| Exam Type | Badge with exam type (e.g. Midterm, Final). Shows "—" if none. |
| Academic Year | Badge with academic year name. |
| Status | Badge with current status: Draft, Scheduled, In Progress, Completed, or Archived. |
| Period | Start date and end date badges. Shows "—" if not set. |
| Actions | Dropdown menu (⋮) with all row actions. |

### Expanded Row Content

When a row is expanded you see:

- **Description** — Exam description text (if any).
- **Statistics** — Classes count, Subjects count, Enrolled students, Results entered, and if applicable Passed/Failed counts.
- **Classes** — List of class names (and section) assigned to this exam.

### Row Actions

When you click the actions menu (⋮) on any exam row:

- **Classes & Subjects** — Opens the exam’s Classes & Subjects page where you assign which classes and subjects are part of this exam.
- **Timetable** — Opens the Exam Timetable page to view and manage exam sessions (date, time, class, subject, room, invigilator).
- **Student Enrollment** — Opens the Student Enrollment page to enroll students in the exam by class.
- **Marks Entry** — Opens the Marks Entry page to enter or edit marks for the exam.
- **Reports** — Opens the exam’s Reports page.
- **Mark Attendance** — Opens the exam attendance page (if you have attendance permission).
- **Change Status** — Submenu to move the exam to the next allowed status (e.g. Draft → Scheduled, Scheduled → In Progress, In Progress → Completed, Completed → Archived). Only allowed transitions are shown.
- **Edit** — Opens the edit exam dialog. Available only when the exam is in Draft or Scheduled status and you have update permission.
- **Delete** — Opens a confirmation dialog to delete the exam. Available only for exams in Draft status and only if you have delete permission.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Exam

To create a new exam, click the **"Create Exam"** button at the top of the page. A dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Exam name (e.g. Midterm Exam). |
| Academic Year | Select | Yes | The academic year this exam belongs to. Defaults to current academic year when available. |
| Exam Type | Select | No | Optional type (e.g. Midterm, Final). Option "None" if not needed. |
| Description | Textarea | No | Optional description for the exam. |
| Start Date | Date picker | No | Exam period start date. |
| End Date | Date picker | No | Exam period end date. |
| (Status) | — | — | New exams are created with status **Draft**. |

Click **"Create"** to save. On success, a success message appears, the dialog closes, and the table refreshes with the new exam.

### What Happens After Submission

- The exam is created with status **Draft**.
- You can then use **Classes & Subjects** to assign classes and subjects, then **Timetable**, **Student Enrollment**, and **Marks Entry** as needed.
- If required fields (Name, Academic Year) are missing, an error message asks you to fill them in.

---

## Editing an Exam

To edit an existing exam:

1. Find the exam in the table (only Draft or Scheduled exams can be edited).
2. Click the actions menu (⋮) → **Edit**.
3. The edit dialog opens with current name, academic year, exam type, description, start date, and end date. Status is not changed from the dialog.
4. Change any fields you need.
5. Click **"Update"**.
6. On success, a success message appears, the dialog closes, and the table refreshes.

---

## Changing Exam Status

Exam status follows a fixed flow: **Draft → Scheduled → In Progress → Completed → Archived**.

1. Click the actions menu (⋮) on the exam row.
2. Under **Change Status**, click the next status you want (e.g. **Scheduled** if the exam is Draft).
3. A confirmation dialog shows the exam name and the status change (e.g. Draft → Scheduled).
4. Click **"Confirm"** to apply the change.
5. The list refreshes and the new status is shown.

Only the next allowed statuses are shown in the menu.

---

## Deleting an Exam

To delete an exam:

1. The exam must be in **Draft** status. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears with the exam name.
3. Click **"Confirm"** (or the red Delete button) to permanently remove the exam.
4. The message states that the action cannot be undone. Deleting an exam can affect related data (timetable, enrollment, marks) depending on system configuration.

---

## Export Options

The main Exams list page does not provide PDF or Excel export. Use the **Reports** row action for the selected exam to generate or export report data.

---

## Tips & Best Practices

- **Create exams in Draft first** — Use Draft to set up classes, subjects, and timetable, then move to Scheduled when ready.
- **Set start and end dates** — Filling the exam period helps staff and students know when the exam runs.
- **Use status in order** — Move exams along the flow (Draft → Scheduled → In Progress → Completed → Archived) so reports and permissions stay consistent.
- **Expand a row to check setup** — Before opening Timetable or Student Enrollment, expand the exam row to see how many classes and subjects are assigned and how many students are enrolled.
- **Assign classes and subjects before enrollment** — Complete **Classes & Subjects** and **Timetable** before enrolling students and entering marks.

---

## Related Pages

- [Exam Timetables](/help-center/s/exams/exams-timetables) — Schedule exam sessions (date, time, class, subject, room, invigilator).
- [Exam Enrollment](/help-center/s/exams/exams-enrollment) — Overview of the exam enrollment flow.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students in exams by class.
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter and manage exam marks.
- [Exam Reports](/help-center/s/exams/exams-reports) — View and generate exam reports.

---

*Category: `exams` | Language: `en`*
