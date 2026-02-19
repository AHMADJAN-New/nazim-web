# Mark Attendance

The Mark Attendance page is where you record student attendance for an existing session. You select an open session (by class and date), then use either **Manual** marking—choosing a status for each student in a roster—or **Barcode** marking—scanning or entering card number, admission number, or student code to mark one student at a time. Statuses include Present, Absent, Late, Excused, Sick, and Leave. You must save your changes; once a session is closed from the Attendance page, it can no longer be edited here.

---

## Page Overview

When you open the Mark Attendance page, you will see:

### Summary Cards

This page does not have summary cards. The main areas are: **Session selection** (collapsible card), then **Marking content** (Manual and Barcode tabs) when a session is selected.

### Session Selection

- **Select Session** — A collapsible card. When expanded, it shows a searchable dropdown listing **open** sessions (today’s sessions first, then yesterday, then others). Each option shows class badges, session date, method (Manual/Barcode), and a "Today" badge when applicable.
- After you choose a session, the **Current Session** summary appears (classes, date, status). If no session is selected, a message asks you to select a session to mark attendance.

---

## Selecting a Session

1. Expand the **Select Session** card if it is collapsed.
2. Click the session dropdown (combobox).
3. Optionally type in the search field to filter by class name, date, or method.
4. Click a session in the list. The dropdown closes and the selected session is shown as Current Session.
5. The roster (Manual tab) or scan area (Barcode tab) loads for that session.

Sessions are ordered with today first, then yesterday, then by date (most recent first). Only **open** sessions are listed; closed sessions do not appear.

---

## Manual Marking Tab

When a session is selected, the **Manual** tab shows a roster of students for the session’s class(es).

### Search

- **Search** — Text field: "Search by name, admission, card, or code..." Filters the roster list as you type.

### Buttons

- **Mark All Present** — Sets every student in the (filtered) roster to **Present**.
- **Mark All Absent** — Sets every student in the (filtered) roster to **Absent**.
- **Save** — Sends all current attendance records for this session to the server. Disabled when the session is closed or while save is in progress. A success message appears after save.

### Session Closed Notice

- If the session is **closed**, a "Session Closed" badge is shown and the status dropdowns and Save are disabled.

### Roster Table

| Column | Description |
|--------|-------------|
| Student | Full name. On small screens, admission number is shown below. |
| Admission | Admission number. Hidden on very small screens. |
| Card | Card number or "—" if none. Hidden on small/medium screens. |
| Status | Dropdown per student: Present, Absent, Late, Excused, Sick, Leave. Default is Present. Disabled when session is closed. |

### Status Options

- **Present** — Student was present.
- **Absent** — Student was absent.
- **Late** — Student was late.
- **Excused** — Absence/late excused.
- **Sick** — Student was sick.
- **Leave** — Student was on leave (رخصتي).

### Empty Roster

- If the roster is empty, the table shows a message: when search has no matches, "No students match your search"; otherwise "Empty roster" (or equivalent). Ensure the session’s classes have enrolled students for the academic year.

---

## Barcode Tab

When a session is selected, the **Barcode** tab lets you mark attendance by scanning or entering a student identifier.

### Card Number / Scan Field

- **Card Number** — Input that accepts:
  - Card number, or
  - Student code, or
  - Admission number.
- You can type and press **Enter**, or paste a value (e.g. from a barcode scanner). If the value contains a newline (common with scanners), the system trims it and submits automatically.
- If the student is not in the session’s roster, an error message appears (e.g. "Student not found") and the field is cleared so you can scan again.
- On success, the new record appears in the **Scan Feed** table and the input is cleared and focused for the next scan.

### Note (Optional)

- **Note** — Optional note for the current scan. Can be sent with the scan submission.

### Buttons

- **Focus Scanner** — Refocuses the card number input (useful after clicking elsewhere).
- **Record Scan** — Submits the current card number (and optional note). Disabled when no session is selected, session is closed, or a scan is in progress.
- When the session is closed, a "Session Closed" badge is shown and scanning is disabled.

### Scan Feed Table

- **Scan Feed** — Table of recent scans for this session (e.g. last 30). Columns: **Student** (name; on small screens card is below), **Card** (hidden on small screens), **Status**, **Time** (hidden on small screens).
- A **Search scans...** field above the table filters the feed by student name, admission, card, or ID.
- The most recently added scan may be briefly highlighted. Empty state: "No scans yet" or "Select a session for scan" / "No scans match your search" depending on context.

---

## Saving Attendance (Manual)

1. Set each student’s status in the Manual tab (or use Mark All Present / Mark All Absent).
2. Click **Save**.
3. Wait for the success message. The data is stored for the current session. You can continue editing and save again; the session remains editable until it is closed on the Attendance page.

---

## Closing a Session

Sessions are **closed** from the **Attendance** page (the session list), not from the Mark Attendance page. Once closed, the session no longer appears in the Select Session list here, and any open view of it would show "Session Closed" and disable editing and scanning.

---

## Tips & Best Practices

- **Select the correct session** — Confirm class and date in "Current Session" before marking. Use search in the session dropdown if you have many open sessions.
- **Save regularly in Manual** — Click **Save** after marking a batch of students so progress is not lost.
- **Use Barcode for fast entry** — For large classes, use the Barcode tab with a scanner; focus stays in the card field so you can scan one card after another.
- **Check Scan Feed** — In Barcode mode, use the Scan Feed to verify who was just marked and to search for a specific student’s scan.

---

## Related Pages

- [Attendance](/help-center/s/attendance/attendance) — Create attendance sessions (class, date, method, school) and close them; view recent sessions.
- [Attendance Reports](/help-center/s/attendance/attendance-reports) — View and export attendance records by filters.
- [Attendance Totals Reports](/help-center/s/attendance/attendance-reports-totals) — View totals, rates, and class/room breakdowns; export PDF/Excel.

---

*Category: `attendance` | Language: `en`*
