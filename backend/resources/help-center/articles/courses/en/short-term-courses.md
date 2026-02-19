# Short-Term Courses

The Short-Term Courses page is where you create and manage short-term training courses (e.g., Quran memorization, language courses, workshops). School staff use this page to add courses, set dates and fees, close or reopen courses, and view enrolled students. All courses appear in a filterable list with status and date filters.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

- **Open** — Number of courses currently open for enrollment.
- **Draft** — Number of courses in draft status (not yet open).
- **Closed** — Number of courses that have been closed (no new enrollments).
- **Completed** — Number of courses marked as completed.

### Filters & Search

- **Status** — Filter by: All, Open, Draft, Closed, or Completed.
- **Start From** — Date picker: show only courses that start on or after this date.
- **Start To** — Date picker: show only courses that start on or before this date.
- **Clear Filters** — Button to reset status and both date filters to default.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Course Name | Course name; location shown below in smaller text if set. |
| Instructor Name | Name of the instructor. Hidden on mobile. |
| Dates | Start date → End date; duration in days shown below if set. Hidden on mobile. |
| Status | Badge: Draft, Open, Closed, or Completed. |
| Actions | Dropdown menu (⋮) with row-level actions. |

### Row Actions

When you click the actions menu (⋮) on any course row:

- **View Students** — Opens a side panel showing all students enrolled in that course, with counts (Total, Enrolled, Completed, Certificates) and a list of student cards with details (admission no, registration date, completion date, guardian, fee paid).
- **Edit** — Opens the course edit form with current data pre-filled.
- **Close Course** — Available only when status is not Closed or Completed. Marks the course as closed (no new enrollments).
- **Reopen Course** — Available only when status is Closed. Reopens the course.
- **Delete** — Opens a confirmation dialog. Deleting removes the course; enrollments are also affected (see warning in dialog).

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Course

To create a new course, click the **"Create Course"** button at the top of the page. A form dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Course Name | Text | Yes | Name of the course. |
| Description | Textarea | No | Optional description. |
| Instructor Name | Text | No | Name of the instructor. |
| Location | Text | No | Where the course is held. |
| Start Date | Date Picker | No | Course start date. |
| End Date | Date Picker | No | Course end date. |
| Duration (Days) | Number | No | Duration in days. |
| Max Students | Number | No | Maximum number of students. |
| Fee Amount | Number | No | Course fee (e.g. AFN). |
| Status | Select | Yes | Draft, Open, Closed, or Completed. New courses default to Draft. |

### What Happens After Submission

- On success, a success message is shown, the dialog closes, and the course list refreshes. If you created a new course, the table may reset to page 1 so the new course is visible.

---

## Editing a Course

To edit an existing course:

1. Find the course in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The edit form opens with the current data pre-filled (name, description, instructor, location, start/end dates, duration, max students, fee, status).
4. Make your changes.
5. Click **"Create Course"** (button label stays the same; it acts as Save in edit mode).
6. On success, the dialog closes and the table refreshes.

---

## Deleting a Course

To delete a course:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog will appear with the course name and a warning that the action cannot be undone and that enrollments are affected.
3. Click **"Delete"** to confirm, or **Cancel** to close.
4. Deleting a course removes it permanently; associated enrollments are affected as described in the dialog.

---

## View Students (Side Panel)

- From the row actions, choose **View Students**.
- A side sheet opens with the course name and a short description.
- Summary stats: Total Students, Enrolled, Completed, Certificates (counts).
- Course period (start → end date) is shown if set.
- Below, a list of student cards shows: full name, father name, completion status badge, certificate badge if issued, admission no, registration date, completion date, grade, guardian info, and fee payment details (if paid).
- If there are no enrolled students, a message explains that you can add students from the Course Students page.

---

## Export Options

This page does not provide PDF or Excel export. Use **Course Students Reports** or **Course Dashboard** for report exports.

---

## Tips & Best Practices

- Set status to **Draft** when setting up a course, then change to **Open** when you are ready to accept enrollments.
- Use **Close Course** when enrollment should stop but the course is not yet completed; use **Completed** when the course has finished.
- Fill **Start Date** and **End Date** (and optionally **Duration (Days)**) so filters and student view show correct periods.
- Use **View Students** from the row menu to quickly check enrollments and completion counts without leaving the page.

---

## Related Pages

- [Course Students](/help-center/s/courses/course-students) — Enroll and manage students in courses
- [Course Dashboard](/help-center/s/courses/course-dashboard) — Overview and course reports
- [Course Attendance](/help-center/s/courses/course-attendance) — Mark and view attendance by session
- [Course Certificates](/help-center/s/courses/course-certificates) — View and download issued certificates
- [Course Students Reports](/help-center/s/courses/course-students-reports) — Reports and bulk status updates
- [Course Documents](/help-center/s/courses/course-documents) — Upload and manage course documents

---

*Category: `courses` | Language: `en`*
