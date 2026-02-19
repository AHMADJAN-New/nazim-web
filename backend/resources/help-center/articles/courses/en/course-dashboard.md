# Course Dashboard

The Course Dashboard gives you an overview of short-term courses and their students. You can see total courses, total students, completion and drop counts, and a course-specific report table (enrollment, attendance, or completion). You can export data as CSV or PDF (enrollment/completion) or use the report export buttons for attendance. Quick links take you to Short-Term Courses and Course Attendance.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

- **Total Courses** — Total number of short-term courses. Subtext shows how many are active (open) and how many are closed.
- **Total Students** — Total number of course students across all courses. Subtext shows how many are currently enrolled.
- **Completed** — Number of students who have completed a course. A progress bar and percentage show completion rate.
- **Dropped** — Number of students marked as dropped. Subtext shows drop rate percentage.

### Filters

- **Select Course** — Dropdown: "All Courses" or a specific course. This filters the report table and the data used for exports.
- **Report Type** — Dropdown: **Enrollment**, **Attendance**, or **Completion**. This changes which columns and data are shown in the table (and which export is available for attendance).

---

## Course Reports Table

Below the filters, a table lists course students (for the selected course or all courses). Columns depend on **Report Type**:

**For Enrollment and Completion:**

| Column | Description |
|--------|-------------|
| Student | Full name and father name. |
| Course | Course name. |
| Status | Enrolled, Completed, or Dropped (badge). |
| Registration | Registration date. |
| Completion Date | Date completed (when applicable). |

**For Attendance:**

Same columns plus **Attendance Rate** (progress bar and percentage). Data comes from course attendance sessions.

If no students match, a message indicates that no students were found.

---

## Export Options

- **Enrollment / Completion report type:** Buttons to export **CSV** and **PDF**. The export uses the current course filter and includes student name, father name, course, status, registration date, and (for completion) completion date. File names include the date.
- **Attendance report type:** **Report Export** buttons (PDF/Excel) for the Short-term Course Attendance Report. Export uses the current course filter and includes attendance rate. Filter summary can be included.

---

## Course Performance Cards

Below the table, up to six courses are shown as cards. Each card shows:

- Course name and status badge (Open/Closed).
- Total students, Completed count, Dropped count.
- A progress bar for completion percentage.

Clicking a card navigates to **Course Students** with that course pre-selected (`courseId` in the URL).

---

## Tips & Best Practices

- Use **Select Course** to focus on one course for the table and exports.
- Switch **Report Type** to **Attendance** when you need attendance rates and the attendance export.
- Use the course cards to jump quickly to manage students for a specific course.

---

## Related Pages

- [Short-Term Courses](/help-center/s/courses/short-term-courses) — Create and manage courses
- [Course Students](/help-center/s/courses/course-students) — Enroll and edit students
- [Course Attendance](/help-center/s/courses/course-attendance) — Mark and view attendance
- [Course Students Reports](/help-center/s/courses/course-students-reports) — Reports and bulk status updates

---

*Category: `courses` | Language: `en`*
