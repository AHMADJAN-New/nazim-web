# Attendance

The Attendance page is where you create attendance sessions before marking. You choose one or more classes, a date, a method (manual or barcode), and optionally a school and notes, then create a session. Open sessions appear in the recent sessions list; you can select one to work with it, or close it. After creating a session, go to **Mark Attendance** (via the sidebar or **Attendance > Mark Attendance**) to record which students were present, absent, late, excused, sick, or on leave.

---

## Page Overview

When you open the Attendance page, you will see:

### Summary Cards

This page does not have summary cards at the top. The main content is split into two areas: **Create Session** (left/top) and **Recent Sessions** (right/bottom).

### Layout

- **Left/Top card** — "Attendance" with description "Mark attendance for your classes." Contains the form to create a new session and the **Create** button.
- **Right/Bottom card** — "Recent Sessions" with a list of existing sessions (open and closed), pagination, and per-page selector.

---

## Creating an Attendance Session

To create a new attendance session, fill in the form in the first card and click **Create**.

### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Class | Checkbox grid | Yes | Select at least one class. Multiple classes can be selected. The grid shows all classes; click a class to toggle selection. A label shows "(N selected)" when more than one is selected. |
| Date | Date picker | Yes | The session date for which attendance will be recorded. |
| Method | Select | No (default: Manual) | **Manual** — mark attendance by selecting status per student in the marking page. **Barcode** — use card/admission/code scan to record attendance. |
| School | Select | No | **All** or a specific school. If your organization has only one school, it may be auto-selected. |
| Notes | Textarea | No | Optional remarks for the session. |

### Create Button

- **Create** — Validates that at least one class and a date are selected, then creates the session. On success, the new session is selected in the recent sessions list, and the form resets (classes and date cleared; method and school keep their values). You can then go to the Mark Attendance page to record attendance for this session.

### What Happens After Submission

- The system creates an **open** attendance session for the chosen classes and date.
- The new session appears in the Recent Sessions list and is auto-selected.
- The form clears class selection and date; you can create another session or navigate to **Mark Attendance** to fill in records for the selected session.

---

## Recent Sessions List

The **Recent Sessions** card shows a paginated list of attendance sessions.

### What Each Row Shows

- **Classes** — Badges for each class in the session (or a single class name if one class).
- **Date** — Session date (formatted, e.g. "Jan 15, 2025").
- **Method** — Badge: "Manual" or "Barcode."
- **Status** — Badge: "open" or "closed."
- **Close (X) button** — Shown only for **open** sessions. Click to close the session; closed sessions can no longer be edited.

### Row Click

- Clicking a row **selects** that session (highlighted with a border). The selected session can be used when you open the **Mark Attendance** page (e.g. via URL with `?session=<id>` or by selecting the same session there).

### Pagination

- **Per page** — Dropdown (e.g. 10, 25, 50, 100) to set how many sessions are shown per page.
- **First / Previous / Next / Last** — Navigate between pages. A text line shows "Showing X to Y of Z sessions" and "Page N of M."

### Empty State

- If there are no sessions, the message "No sessions" (or equivalent) is shown.

---

## Closing a Session

1. In the Recent Sessions list, find an **open** session.
2. Click the **X** (Close) button on the right of that row.
3. The session status changes to **closed**. Attendance records for that session can no longer be added or edited on the Mark Attendance page.

---

## Tips & Best Practices

- **Create a session before marking** — Always create a session for the correct date and classes on this page, then go to Mark Attendance to record who was present, absent, late, etc.
- **Use Manual for classroom marking** — If you are marking from a roster on screen, choose **Manual** when creating the session.
- **Use Barcode for scan-based marking** — If you will use a barcode/card scanner, choose **Barcode** when creating the session so the marking page shows the scan input and scan feed.
- **Close sessions when done** — Close a session after you finish marking to prevent accidental changes.

---

## Related Pages

- [Attendance Marking](/help-center/s/attendance/attendance-marking) — Select an open session and mark students as Present, Absent, Late, Excused, Sick, or Leave; use manual roster or barcode scan.
- [Attendance Reports](/help-center/s/attendance/attendance-reports) — View and filter attendance records by student, class, school, status, and date; export PDF or Excel.
- [Attendance Totals Reports](/help-center/s/attendance/attendance-reports-totals) — View totals, attendance rate, status breakdown, class-wise and room-wise breakdowns; export Totals, Class-wise, or Room-wise reports as PDF or Excel.

---

*Category: `attendance` | Language: `en`*
