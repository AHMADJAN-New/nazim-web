# Course Attendance

The Course Attendance page is used to create attendance sessions for a short-term course and to mark attendance either manually (per student) or via barcode/card scan. You can view session-level and course-level attendance reports. Staff use this page daily to record who attended each session and to review attendance history.

---

## Page Overview

When you open this page, you will see:

### Course Selection

- A **Select Course** dropdown at the top. You must select a course before you can create sessions or mark attendance.

### Main Tabs

After selecting a course, three tabs appear:

1. **Mark Attendance** — Create sessions, select a session, and mark attendance (manual or barcode).
2. **Session Report** — Select a session and view its attendance report (who was present, absent, late, etc.).
3. **Course Report** — View course-level attendance report; filter by completion status (Enrolled, Completed, Dropped, Failed, or All).

---

## Mark Attendance Tab

### Sessions List (left side)

- Lists all **open** attendance sessions for the selected course (today’s sessions first, then yesterday, then others by date).
- Each session shows: date, method (Manual / Barcode / Mixed), optional title, total students, and counts for Present, Absent, Late, Excused, Sick, Leave. Status badge: Open or Closed.
- **Add** button opens the **Create Session** dialog.
- Only **open** sessions can be selected for marking or deleted. **Closed** sessions are read-only.
- Click a session to select it; the right side then shows the marking area for that session.
- Delete icon (trash) on an open session opens a confirmation dialog to delete the session.

### Create Session Dialog

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Date | Date Picker | Yes | Session date. |
| Title (Optional) | Text | No | Short title for the session. |
| Method | Select | Yes | Manual, Barcode, or Mixed. |

Click **Create Session** to create; you are switched to the Mark Attendance tab with the new session selected.

### Marking Attendance (right side)

When an **open** session is selected, two sub-modes are available:

**Manual:**

- **Search** — Filter students by name, admission number, or card number.
- **Mark All Present** / **Mark All Absent** — Quick buttons to set all roster students to Present or Absent.
- A table (desktop) or cards (mobile) lists each enrolled student with a status dropdown. Options: **Present**, **Absent**, **Late**, **Excused**, **Sick**, **Leave**.
- Change any student’s status via the dropdown.
- **Save Attendance** — Sends all current statuses to the server. Success message is shown.

**Barcode:**

- **Scan Barcode or Card** — Input field for card number or barcode. You can type and press Enter or use a barcode scanner (which often sends Enter after the code). On success, a green message appears; on error (e.g. student not found), a red message is shown.
- Optional note can be entered for the scan.
- **Recent Scans** — List of recent scans for this session; search box to filter by name/admission/card.
- Instructions explain that you can scan a student’s card or enter the number manually.

**Close Session** — Button visible when an open session is selected. Closes the session so no more changes can be made. Success message is shown.

---

## Session Report Tab

- **Select Session** — Dropdown of all sessions for the course (date and optional title).
- After selecting a session, a **Session Report** table appears with attendance data for that session (student, status, etc.).

---

## Course Report Tab

- **Course Report** table shows attendance summary at the course level.
- A filter (e.g. completion status: Enrolled, Completed, Dropped, Failed, All) controls which students are included.
- The table shows each student’s attendance summary (e.g. rates, counts) for the course.

---

## Delete Session

- From the sessions list, click the trash icon on an **open** session.
- Confirm in the dialog. The session is deleted. If it was the selected session, selection is cleared.

---

## Export Options

This page does not provide its own export buttons. Use **Course Dashboard** with report type **Attendance** for PDF/Excel export of attendance data.

---

## Tips & Best Practices

- Create one session per day (or per class) and use a clear **Title** (e.g. "Morning Session") so Session Report is easy to interpret.
- Use **Manual** when you mark from a printed list; use **Barcode** when students scan their cards for speed.
- **Close Session** when the period is over to prevent accidental changes.
- Use **Session Report** to verify a single day; use **Course Report** to see overall attendance for the course.

---

## Related Pages

- [Short-Term Courses](/help-center/s/courses/short-term-courses) — Manage courses
- [Course Students](/help-center/s/courses/course-students) — Enrolled students (roster comes from here)
- [Course Dashboard](/help-center/s/courses/course-dashboard) — Overview and attendance export

---

*Category: `courses` | Language: `en`*
