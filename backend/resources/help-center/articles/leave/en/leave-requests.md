# Leave Requests

The Leave Requests page is where school staff create and manage student leave requests. You can submit new leave requests for students, view a history of requests by month, approve or reject pending requests, print QR-enabled leave slips for verification, and view a student’s full leave history. All leave data is scoped to the current academic year and supports full-day, partial-day, and time-bound leave types.

---

## Page Overview

When you open the Leave Requests page, you will see:

### Summary Cards

- **Leave Governance (QR-Ready Slips)** — An informational card explaining that leave slips are QR-ready for verification.
- **Current Month** — The number of leave requests that start in the current calendar month (based on the filtered or displayed data).
- **Approved This Year** — The number of leave requests with status "Approved" whose start date falls in the current calendar year.

### Tabs

The page has two main tabs:

1. **New Request** — Form to create a new leave request (class, student, dates, reason, etc.).
2. **History** — Table of leave requests for the selected month and year, with filters and row actions.

---

## Creating a New Leave Request

To create a new leave request, stay on the **"New Request"** tab and fill in the form.

### Fast Search (Scan / Card)

- **Fast Search (Scan / Card)** — Text field where you can type a student’s card number, student code, or admission number and press **Enter** to find the student. If found and enrolled in the current academic year, the system sets the class and student automatically. Useful for quick entry when using a card scanner or manual code entry.

### Create Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Class | Dropdown (searchable) | Yes | Select the class. Options are from the current academic year. You must select a class before choosing a student. |
| Student | Dropdown (searchable) | Yes | Select the student. Lists students (from admissions) for the selected context. Disabled until a class is selected. |
| Leave Type | Select | No (default: Full day) | **Full day** — entire day(s); **Partial day** — part of the day; **Time bound** — specific start and end time. |
| Leave Duration | Quick buttons + Date pickers | — | Quick buttons: **1 day**, **2 days**, **3 days**, **1 week**, **2 weeks**, **1 month** set start and end dates. **Start Date** and **End Date** are required; use the date pickers or quick buttons. |
| Start Time | Time input | No | Shown only when leave type is **Partial day** or **Time bound**. |
| End Time | Time input | No | Shown only when leave type is **Partial day** or **Time bound**. |
| Reason | Quick reason buttons + Textarea | Yes | Use the quick buttons (e.g. Sick, Getting outside, Family emergency, Medical appointment, Personal, Family event, Travel, Religious) to fill the reason, or type in the text area. Reason is required. |
| Approval Note | Textarea | No | Optional note (e.g. for the approving authority) stored with the request. |

Buttons at the bottom:

- **Clear Form** — Resets student, dates, times, reason, and approval note; keeps the selected class and leave type.
- **Create Request** — Submits the leave request. Disabled until Student, Start Date, and End Date are filled.

### What Happens After Submission

- The system creates the leave request with status **Pending**.
- A success message (e.g. "Leave request created") is shown.
- The form is reset (student cleared; dates, times, reason, approval note cleared) while the selected class is kept.
- The leave requests list (History tab) refreshes so the new request appears after you switch to History or change the month/year filter.

---

## History Tab — Data Table

On the **History** tab you can filter by month and year and see all leave requests for that period.

### Filters

- **Month & Year** — A date picker. Pick any day in the desired month; the table shows requests for that month and year. The picker is limited to the current academic year (start and end dates).

### Table Columns

| Column | Description |
|--------|-------------|
| Student | Student full name and, below, student code or admission number. |
| Dates | Start date → End date (formatted). Below: class name and school name. |
| Reason | Leave reason text (clamped to two lines). |
| Status | Badge: **Pending**, **Approved**, **Rejected**, or **Cancelled**. |
| Actions | Dropdown menu with row actions. |

### Row Actions

When you click the actions menu (⋮) on a row:

- **View** — Opens the request detail panel (sheet) on the right with full request details. For **Pending** requests you can add an approval note and **Approve** or **Reject**.
- **History** — Opens the **Student Leave History** sheet for that student, showing total leaves, approved count, pending/rejected/cancelled counts, monthly volume, and a list of all leave entries for that student.
- **Print** — Generates a printable A6 leave slip with student name, code, class, dates, optional start/end time, reason, approval note (if any), status, and a QR code for verification. Opens the browser print dialog.

You can also **click the row** (anywhere except the actions menu) to open the same detail panel as **View**.

### Bulk Actions

No bulk actions are available on this page. Approve or reject requests one by one from the detail panel.

---

## Viewing and Approving or Rejecting a Request

1. Go to the **History** tab and set **Month & Year** if needed.
2. Find the request in the table and click the row or the actions menu (⋮) → **View**.
3. The **Leave Request** detail panel opens on the right showing:
   - **Student** — Name, code, guardian name, guardian phone (if available).
   - **Dates & Leave Type** — Start date, end date, optional start/end time, leave type badge, status badge.
   - **Class & School** — Class name and school name.
   - **Reason** — Full reason text.
   - **Approval Note** — Shown if present.
4. For requests with status **Pending**:
   - Optionally enter or edit **Approval Note** in the text area.
   - Click **Approved** to approve or **Rejected** to reject. A success message is shown and the panel can close; the table refreshes.
5. From the panel you can also click **Print** to print the leave slip or **History** to open the student’s leave history sheet.

---

## Printing a Leave Slip

1. From the History table, use the actions menu (⋮) → **Print**, or open the request detail panel and click **Print**.
2. A printable A6 slip is generated in a new print layout with student name, code, class, start and end dates, optional start/end time, reason, approval note (if any), status, and a QR code.
3. The browser print dialog opens; choose your printer or "Save as PDF" and confirm. The slip is designed for verification by scanning the QR code.

---

## Student Leave History

1. From the History table, click the actions menu (⋮) → **History** for a request, or from the detail panel click **History**.
2. The **Student Leave History** sheet opens showing:
   - **Total Leaves** — Total number of leave requests for that student.
   - **Approved** — Count of approved requests.
   - Badges for **Pending**, **Rejected**, and **Cancelled** counts.
   - **Monthly Volume** — Counts per month (yyyy-MM).
   - **All Leaves** — Scrollable list of each leave with date range, reason, and status badge.
3. Close the sheet when done.

---

## Deleting a Leave Request

The Leave Requests page does not provide a **Delete** action. Leave requests are managed by status: **Pending**, **Approved**, **Rejected**, or **Cancelled**. To change the outcome of a request, use **Approve** or **Reject** from the detail panel while the request is still Pending. There is no separate "delete" workflow documented here.

---

## Tips & Best Practices

- **Use Fast Search for quick entry** — If you have card numbers or student codes, use the Fast Search field and press Enter to auto-fill class and student, then add dates and reason.
- **Select class first** — The student dropdown is disabled until a class is selected; choose the class for the current academic year, then pick the student.
- **Use quick duration buttons** — For common spans (1 day, 1 week, etc.), use the duration buttons to set start and end dates at once.
- **Use quick reason buttons** — Click a reason (Sick, Family emergency, etc.) to fill the reason field quickly, then add details in the text area if needed.
- **Print slips after approval** — For approved requests, use **Print** to give the student or guardian a QR-verifiable leave slip.

---

## Related Pages

- [Leave Requests Reports](/help-center/s/leave/leave-requests-reports) — Filter and export leave requests by status, student, class, school, and date range; view daily breakdown and generate PDF or Excel reports.

---

*Category: `leave` | Language: `en`*
