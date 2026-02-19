# Course Students

The Course Students page is where you manage enrollments for short-term courses. You can add students manually, enroll existing main-school students into a course, assign enrolled students to another course, and mark completion, drop, or issue certificates. Staff use this page to keep the student roster up to date and to run the enrollment-to-certificate workflow.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

- **Total** — Total number of course students (for the selected course or all courses).
- **Enrolled** — Number of students currently enrolled (not yet completed or dropped).
- **Completed** — Number of students who have completed the course.
- **Dropped** — Number of students who have been marked as dropped.

### Filters & Search

- **Course** — Dropdown to filter by a specific course or "All Courses".
- **Status** — Filter by: All, Enrolled, Completed, Dropped, or Failed.
- **Search** — Text search by student name or admission number.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| (Photo) | Student picture thumbnail. |
| Name | Student full name. |
| Father Name | Father's name. |
| Admission No | Admission number. |
| Course | Course name. Hidden on smaller screens (lg). |
| Guardian Name | Guardian name. Hidden on smaller screens. |
| Guardian Phone | Guardian phone. Hidden on smaller screens. |
| Phone | Student phone. Hidden on smaller screens. |
| Birth Year | Birth year. Hidden on mobile/tablet. |
| Age | Age. Hidden on mobile/tablet. |
| Registration | Registration date. Hidden on mobile/tablet. |
| Status | Badge: Enrolled, Completed, Dropped, or Failed; plus "Certified" badge if a certificate was issued. |
| Actions | Dropdown menu (⋮) with row-level actions. |

Clicking a row opens the **Course Student Details** panel for that student.

### Row Actions

When you click the actions menu (⋮) on any student row:

- **View Details** — Opens the details panel for that student (same as clicking the row).
- **Edit** — Opens the course student edit form with all tabs (Basic, Guardian & Address, Fee & Notes, Picture) pre-filled.
- **Mark Completed** — Available only when status is Enrolled. Marks the student as completed for that course.
- **Mark Dropped** — Available only when Enrolled. Marks the student as dropped.
- **Issue Certificate** — Available when status is Completed and no certificate has been issued yet. Issues a certificate for the student.
- **Copy to Main** — Available when the student is not linked to a main-school student. Copies this course student into the main Students register (with options to generate new admission and link to course student).
- **Delete** — Opens a confirmation dialog. Deleting removes the course enrollment record.

### Bulk Actions

No bulk actions on this page; bulk Mark Completed / Mark Dropped are on the **Course Students Reports** page.

---

## Adding a New Course Student

To add a new student to a course, click the **"Add Student"** button at the top. A multi-tab form will open.

### Tab: Basic Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Course | Select | Yes | Choose the course (only open or draft courses listed). |
| Admission No | Text | No | Admission number for this course. |
| Registration Date | Date Picker | No | Defaults to today. |
| Full Name | Text | Yes | Student's full name. |
| Father Name | Text | Yes | Father's name. |
| Grandfather Name | Text | No | Grandfather's name. |
| Mother Name | Text | No | Mother's name. |
| Gender | Select | Yes | Male or Female. |
| Birth Year | Number | No | Birth year. |
| Birth Date | Date Picker | No | Date of birth. |
| Age | Number | No | Age (can be auto-calculated). |
| Tazkira Number | Text | No | National ID (Tazkira) number. |
| Phone | Text | No | Student phone. |
| Nationality | Text | No | Default "Afghan". |
| Preferred Language | Text | No | Default "Dari". |
| Origin Province/District/Village | Text | No | Origin location. |
| Current Province/District/Village | Text | No | Current address location. |
| Home Address | Text | No | Full address. |
| Is Orphan | Checkbox | No | Whether the student is an orphan. |
| Disability Status | Text | No | Optional. |
| Notes | Textarea | No | General notes. |

### Tab: Guardian & Address

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Guardian Name | Text | No | Guardian full name. |
| Guardian Relation | Text | No | Relation to student. |
| Guardian Phone | Text | No | Guardian phone. |

(Address fields may also appear here depending on form layout.)

### Tab: Fee & Notes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Fee Paid | Checkbox | No | Whether the fee has been paid. |
| Fee Amount | Number | No | Amount paid. |
| Notes | Textarea | No | Additional notes. |

### Tab: Picture

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Picture | File Upload | No | Student photo. |

### What Happens After Submission

- The system validates required fields (e.g. Course, Full Name, Father Name, Gender).
- On success, a success message is shown, the dialog closes, and the table refreshes (page may reset to 1).

---

## Enrolling from Main Students

- Click **"Enroll From Main"** (available when there is at least one open course).
- A dialog lets you select a course and then search/select students from the main Students register to enroll in that course.
- After enrolling, the list refreshes.

---

## Assigning to Another Course

- Click **"Assign to New Course"** to open the Assign to Course dialog.
- You can select one or more course students and assign them to another (open) course.
- On success, the table refreshes.

---

## Editing a Course Student

1. Find the student in the table.
2. Click the actions menu (⋮) → **Edit**.
3. The form opens with all tabs and current data pre-filled.
4. Change any fields across Basic, Guardian & Address, Fee & Notes, and Picture.
5. Click the submit button (e.g. **"Add Student"** / **"Save"**).
6. On success, the dialog closes and the table refreshes.

---

## Deleting a Course Student

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears with the student name.
3. Click **"Delete"** to confirm. The enrollment is removed.

---

## View Details Panel

- Click a row or **View Details** from the actions menu to open the **Course Student Details** panel.
- The panel shows full student information, guardian, fee, and related data. You can use it to review before editing or issuing a certificate.

---

## Export Options

This page does not provide its own export buttons. Use **Course Students Reports** for PDF/Excel export of the student list.

---

## Tips & Best Practices

- Filter by **Course** first when you are managing a single course so the counts and list match that course.
- Use **Enroll From Main** to avoid re-entering data for students who already exist in the main Students register.
- Use **Mark Completed** only when the student has actually finished the course; then use **Issue Certificate** if your school issues certificates.
- Use **Copy to Main** when a course-only student should be added to the main student register for other modules (e.g. exams, fees).

---

## Related Pages

- [Short-Term Courses](/help-center/s/courses/short-term-courses) — Create and manage courses
- [Course Students Reports](/help-center/s/courses/course-students-reports) — Reports and bulk Mark Completed / Mark Dropped
- [Course Attendance](/help-center/s/courses/course-attendance) — Mark attendance by session
- [Course Certificates](/help-center/s/courses/course-certificates) — View and download certificates
- [Course Dashboard](/help-center/s/courses/course-dashboard) — Overview and exports

---

*Category: `courses` | Language: `en`*
