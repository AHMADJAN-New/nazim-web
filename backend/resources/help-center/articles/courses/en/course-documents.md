# Course Documents

The Course Documents page is where you upload, view, and manage documents attached to short-term courses (syllabus, materials, assignments, certificates, attendance records, grade reports, receipts, or other). You can filter by course and document type, search by title or filename, and download or delete documents. Staff use this page to keep course-related files in one place.

---

## Page Overview

When you open this page, you will see:

### Page Header

- **Title** — Course Documents.
- **Description** — Manage documents for your courses.
- **Upload Document** — Primary button. Opens a course selection dialog if you have multiple courses; then opens the upload dialog for the chosen course. Disabled if there are no courses.

### Filters (Filter Panel)

- **Course Name** — Filter documents by a specific course or "All Courses".
- **Document Type** — Filter by: All Types, Syllabus, Course Material, Assignment, Certificate, Attendance Record, Grade Report, Receipt, or Other.
- **Search** — Search by title, description, or file name.

Filter values can be reflected in the URL (e.g. `course_id`, `document_type`, `search`).

---

## Data Table

The table shows:

| Column | Description |
|--------|-------------|
| Document | File icon (by type: image vs document), title, optional description, and file name. |
| Course Name | Course name; click to open the course documents dialog for that course. |
| Document Type | Badge with type (Syllabus, Material, Assignment, etc.). |
| Size | File size (B, KB, or MB). |
| Uploaded | Upload/create date. |
| Actions | **Download** button and **Delete** button (Delete is hidden for type "certificate"). |

### Row Actions

- **Download** — Downloads the file. Button is disabled while a download is in progress.
- **Delete** — Only for non-certificate documents. Opens a confirmation dialog; confirm to delete the document.

Clicking the **Course Name** link opens the **Course Documents Dialog** for that course (see below).

---

## Uploading a Document

1. Click **Upload Document**.
2. If there are multiple courses, a **Select Course** dialog appears: click a course to choose it.
3. The **Course Documents** dialog opens for the selected course. Switch to upload mode if not already (e.g. "Upload" or similar).
4. In the upload form:
   - **Title** — Short title for the document (required).
   - **Description** — Optional description.
   - **Document Type** — Select: Syllabus, Course Material, Assignment, Certificate, Attendance Record, Grade Report, Receipt, or Other.
   - **File** — Choose a file from your device.
5. Submit the form. On success, the new document appears in the list (in the dialog and on the main table when the dialog is closed).

---

## Course Documents Dialog

- Opened by clicking a **Course Name** in the table or after choosing a course from the Upload flow.
- Shows the course name and lists all documents for that course.
- You can:
  - **Upload** a new document (title, description, type, file).
  - **Download** a document.
  - **Delete** a document (except type Certificate).
- Closing the dialog returns you to the main Course Documents page.

---

## Deleting a Document

1. Click **Delete** on the row (or delete inside the Course Documents dialog).
2. A confirmation dialog asks you to confirm.
3. Click **Delete** to confirm. The document is removed. Certificate-type documents cannot be deleted from this UI.

---

## Export Options

This page does not provide PDF or Excel export. It is for managing files only; use **Course Students Reports** or **Course Certificates** for data exports.

---

## Tips & Best Practices

- Use **Document Type** consistently (e.g. "Course Material" for handouts, "Syllabus" for the course outline) so filtering is useful.
- Give documents clear **Title** and optional **Description** so search finds them easily.
- Use the **Course Name** link to open the dialog and see all documents for one course in one place.

---

## Related Pages

- [Short-Term Courses](/help-center/s/courses/short-term-courses) — Manage courses
- [Course Students](/help-center/s/courses/course-students) — Enrollments
- [Course Certificates](/help-center/s/courses/course-certificates) — Issued certificates (view/download)

---

*Category: `courses` | Language: `en`*
