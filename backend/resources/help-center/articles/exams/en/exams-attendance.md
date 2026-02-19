# Exam Attendance

The Exam Attendance page is where you record and view attendance for exam time slots. Staff and invigilators use it to mark students as Present, Absent, Late, or Excused for each scheduled exam slot, either manually in a table or by scanning roll numbers (e.g. barcode). You can export attendance for a time slot to PDF or Excel.

---

## Page Overview

When you open Exam Attendance (from **Exams** → select an exam → **Mark Attendance**, or from the sidebar), you will see:

### Summary Cards

Four cards at the top show totals for the selected exam:

- **Enrolled Students** — Total students enrolled in the exam.
- **Present** — Number marked present across all slots.
- **Absent** — Number marked absent.
- **Late / Excused** — Combined count of late and excused.

### Filters & Search

- **Exam** — When the page is opened without an exam in the URL, a **Select exam** dropdown lets you choose the exam. The latest exam from the current academic year is auto-selected when possible.
- **Class** — Filter time slots by class: **All Classes** or a specific exam class (e.g. "10A - Section 1").
- **Time Slot** — Select the exam date and time (e.g. "15 Jan 2024 - 09:00 to 11:00 (Mathematics)"). Only time slots for the selected class (or all classes) are listed. You must select a time slot to see or mark attendance.

---

## Data Table (Mark Attendance)

After you select a **Time Slot**, a card **Mark Attendance** appears with two tabs: **Manual** and **Barcode**.

### Manual Tab — Students Table

Columns:

| Column | Description |
|--------|-------------|
| Checkbox | Select one or more students for bulk status update (when you have permission to mark attendance). |
| Student Name | Full name of the enrolled student. |
| Father Name | Father's name. |
| Roll Number | Exam roll number (or "–" if not assigned). |
| Admission No | Student admission/code number. |
| Status | Dropdown (if you can edit): Present, Absent, Late, Excused. Or read-only badge with current status. |
| Seat # | Optional seat number (editable when marking is allowed). |
| Current | Saved status for this slot (badge or "Not marked"). |

### Row Actions

There are no row dropdown actions. You change **Status** and **Seat #** directly in the table. Use **Update Selected** to set one status for all selected students.

### Bulk Actions (Manual Tab)

When you have permission to mark attendance:

- **Load Existing** — Loads current saved attendance into the form so you can adjust and save again.
- **Mark All As** — Dropdown: set all students in the slot to **Present**, **Absent**, **Late**, or **Excused**.
- **Update Selected (n)** — Appears when at least one student is selected. Opens a dialog to choose a status (Present, Absent, Late, Excused) and applies it to all selected students.
- **Save Attendance** — Saves all current status and seat number changes for the selected time slot. Refreshes the list after save.
- **Export (PDF/Excel)** — **ReportExportButtons** in the same row export the current time slot’s student list with columns: Student Name, Father Name, Roll Number, Admission No, Status, Seat Number. Report key: `exam_attendance`. Export matches the current exam, time slot, and marked counts.

### Barcode Tab

- **Select Time Slots (Multiple)** — You can select more than one time slot; scanning a roll number then marks attendance as Present for all selected slots at once.
- **Roll Number** — Enter or scan roll number. Submit with **Record Scan** or Enter. If the roll number is not in the selected slot(s), an error message appears briefly.
- **Note (Optional)** — Optional note for the scan.
- **Focus Scanner** — Puts focus back in the roll number input.
- **Record Scan** — Marks the student as Present for the selected slot(s). Recent scans appear in the **Recent Scans** table below.
- **Recent Scans** — Table: Student Name, Father Name, Roll Number, Admission No, Status, Time. Search box filters scans by name, admission no, or card number.

---

## Marking Flow

1. Select **Exam** (if needed) and **Class** (optional).
2. Select a **Time Slot** from the dropdown.
3. Choose **Manual** or **Barcode**.
4. **Manual:** Set status (and optional seat number) per student, use **Mark All As** or **Update Selected** if needed, then click **Save Attendance**.
5. **Barcode:** Optionally select multiple time slots, then scan or type roll numbers and submit; each successful scan marks Present for the selected slot(s).
6. Use **Export** in the Manual tab to download the attendance list as PDF or Excel.

---

## Locked Attendance

If the exam status is **Completed** or **Archived**, or if attendance has been locked manually, the card shows **Locked** and editing is disabled. A **Unlock** button may be shown (depending on permission). Clicking it opens a confirmation dialog; confirming allows you to change attendance again. Use unlock only when necessary; completed exams are normally left locked.

---

## Export Options

- **PDF** — From the Export buttons in the Manual tab. Includes exam name, time slot, subject, date/time, and marked count in the filter summary. Uses server report generation with progress dialog.
- **Excel** — Same location; exports the same attendance table with title row and column headers. Data matches the selected time slot and current marks.

---

## Tips & Best Practices

- **Select the correct time slot** — Attendance is stored per time slot; always confirm date, time, and subject before marking.
- **Use Barcode for large rooms** — For many students, use the Barcode tab and multiple time slots to mark several sessions quickly.
- **Save after manual changes** — In the Manual tab, click **Save Attendance** after changing status or seat numbers; unsaved changes are lost if you switch slot or leave the page.
- **Assign roll numbers first** — For scanning to work, students must have roll numbers assigned (see Roll Number management). Otherwise use Manual tab.
- **Lock when done** — Once attendance is final, keep the exam completed/archived or use lock so it is not changed by mistake.

---

## Related Pages

- [Exams](/help-center/s/exams/exams) — Create exams and open attendance from the exam row actions.
- [Exam Timetables](/help-center/s/exams/exams-timetables) — Define time slots; those slots appear in the Time Slot filter here.
- [Exam Roll Numbers](/help-center/s/exams/exams-roll-numbers) — Assign roll numbers so students can be marked by scan.
- [Exam Student Enrollment](/help-center/s/exams/exams-student-enrollment) — Enroll students; only enrolled students appear in the attendance list.

---

*Category: `exams` | Language: `en`*
