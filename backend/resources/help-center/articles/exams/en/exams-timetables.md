# Exam Timetables

The Exam Timetable page lets you view and manage the schedule of exam sessions for a selected exam. You can add time slots (date, time, class, subject, room, invigilator), edit or delete them, lock or unlock slots, and export the timetable. Staff with timetable permission use this page after assigning classes and subjects to an exam.

---

## Page Overview

When you open the Exam Timetable page (from the Exams list row action **Timetable** or from the sidebar), you will see:

### Summary Cards

This page does not have summary cards. The header shows the selected exam name, academic year badge, and exam date range (start–end) when available.

### Filters & Search

- **Select Exam** — If you opened the page without an exam (e.g. from the sidebar), a dropdown or card lets you choose which exam to view. Once an exam is selected, its timetable is shown.
- **Filter by class** — Dropdown: "All Classes" or a specific exam class. Limits the timetable table to that class.
- **Date** — Date picker to show only sessions on a specific date. A **Clear** button resets the date filter.

---

## Data Table

The timetable is grouped by date. For each date, a table shows:

| Column | Description |
|--------|--------------|
| Time | Start time – end time (e.g. 09:00 - 11:00). A lock icon appears if the slot is locked. |
| Class | Class name (and section if any) for that session. |
| Subject | Subject name for that session. |
| Room | Room name for the session. Hidden on small screens (md and below). Shows "—" if not set. |
| Invigilator | Invigilator full name. Hidden on smaller screens (lg and below). Shows "—" if not set. |
| Actions | Lock/Unlock, Edit, and Delete buttons (only when you have permission and the exam status allows changes; Edit and Delete only for unlocked slots). |

Sessions are sorted by date and then by start time. Each date section shows a date heading and a badge with the number of sessions that day.

### Row Actions (per time slot)

- **Lock / Unlock** — Toggle whether the time slot is locked. Locked slots cannot be edited or deleted until unlocked.
- **Edit** — Open the edit dialog to change date, start/end time, room, invigilator, and notes. Shown only for unlocked slots when you have manage permission.
- **Delete** — Open a confirmation dialog to delete the time slot. Shown only for unlocked slots when you have manage permission.

### Bulk Actions

No bulk actions on this page.

---

## Adding a New Time Slot

To add a time slot, click the **"Add Time Slot"** button (shown when the exam is in Draft, Scheduled, or In Progress and you have timetable permission). A dialog opens with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Class | Select | Yes | Exam class (from classes assigned to this exam). |
| Subject | Select | Yes | Subject for this session. Options depend on the selected class. |
| Date | Date picker | Yes | Date of the exam session. |
| Start Time | Time input | Yes | Session start time (e.g. 09:00). |
| End Time | Time input | Yes | Session end time. Must be after start time. |
| Room | Select | No | Room for the session. Option "None" if not needed. |
| Invigilator | Select | No | Staff member as invigilator. Option "None" if not needed. |
| Notes | Textarea | No | Optional notes for the session. |

Click **"Create"** to save. The system checks that required fields are filled and that end time is after start time. On success, a success message appears, the dialog closes, and the timetable refreshes.

### What Happens After Submission

- A new exam time/session is created for the selected exam.
- If required fields are missing or the time range is invalid (end ≤ start), an error message is shown.
- The timetable list and any export reflect the new slot.

---

## Editing a Time Slot

To edit a time slot:

1. Ensure the slot is **unlocked**. If it is locked, click **Unlock** first.
2. Click the **Edit** (pencil) button on that row.
3. The edit dialog opens. Class and subject are shown as read-only; you can change Date, Start Time, End Time, Room, Invigilator, and Notes.
4. Make your changes and click **"Update"**.
5. On success, the dialog closes and the timetable refreshes.

---

## Deleting a Time Slot

To delete a time slot:

1. Ensure the slot is **unlocked**.
2. Click the **Delete** (trash) button on that row.
3. A confirmation dialog shows the class, subject, date, and time.
4. Click **"Delete"** to confirm. The time slot is removed permanently.

---

## Lock and Unlock

- **Lock** — Prevents editing and deleting the slot. Use when the schedule is final or to avoid accidental changes.
- **Unlock** — Restores the ability to edit and delete. Lock/Unlock is available when you have timetable permission and the exam status is Draft, Scheduled, or In Progress.

---

## Export Options

When there is at least one time slot, **Report Export** (PDF/Excel) is available. The export includes columns such as Date, Time, Class, Subject, Room, Invigilator, and Status (Locked/Unlocked). The exported data respects the current class and date filters. Use the export buttons in the filters/actions area above the timetable table.

---

## Tips & Best Practices

- **Add classes and subjects first** — On the exam’s Classes & Subjects page, assign classes and subjects before creating time slots; otherwise the Add Time Slot button may be disabled or the class/subject lists empty.
- **Use Lock when the schedule is final** — Lock time slots to avoid accidental edits before or during the exam period.
- **Set room and invigilator** — Filling room and invigilator helps staff and students know where and who is supervising each session.
- **Check time ranges** — Ensure end time is after start time; the system will show an error if not.
- **Filter by class or date** — Use the class filter and date picker to focus on a specific class or day when the timetable is long.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Create and manage exams; open Timetable from the row action.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students in the exam by class.
- [Exam Marks](/help-center/s/exams/exams-marks) — Enter marks for the exam.

---

*Category: `exams` | Language: `en`*
