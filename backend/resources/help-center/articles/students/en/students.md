# Students

The Students page is the central hub for managing all student records in your school. School administrators and staff use this page to register new students, view and edit student profiles, track admission status, and access student documents, educational history, and discipline records. Every student in your organization appears here with summary cards, filters, and a data table. You can also open a student’s full history page or fee assignments from the row actions.

---

## Page Overview

When you open the Students page, you will see:

### Summary Cards

- **Total Students** — The total number of students registered across your organization, regardless of status.
- **Male** — Count of registered male students.
- **Female** — Count of registered female students.
- **Orphans** — Students marked as orphans who may need special care or fee waivers.

### Filters & Search

- **Search** — Search by student name, admission number, father name, guardian phone, or card number. Type in the search box to filter the table.
- **School** — Filter students by a specific school (if your organization has multiple schools). Default is "All Schools".
- **Status** — Filter by student status: All Status, Applied, Admitted, Active, or Withdrawn.
- **Gender** — Filter by gender: All Genders, Male, or Female.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|--------------|
| Picture | Student photo thumbnail. Shows a default avatar if no picture is uploaded. |
| Admission # | The unique admission number assigned to the student. Hidden on small mobile screens. |
| Student | Full name with status badge (Applied, Admitted, Active, Withdrawn), orphan badge if applicable, father name, and guardian phone below. On mobile, admission number is also shown here. |
| School | The school the student belongs to. Hidden on smaller screens. |
| Gender | Gender badge (Male/Female). Hidden on smaller screens. |
| Applying Grade | The grade or class the student is applying for. Hidden on smaller screens. |
| Actions | Dropdown menu (⋮) with row-level actions. |

Clicking a row opens the **View Profile** dialog. Use the actions menu on the right to perform other actions without opening the profile.

### Row Actions

When you click the actions menu (⋮) on any student row:

- **View Profile** — Opens a dialog showing the student's complete profile (personal details, address, guardian, guarantor, and notes).
- **Print Profile** — Generates a PDF of the student's profile that you can download or print. A progress dialog appears while the report is generated.
- **Documents** — Opens a dialog where you can upload, view, and manage student documents (e.g. certificates, ID copies). You can add documents with a file, document type, and description; view or download existing ones; and delete if needed.
- **Educational History** — Opens a dialog showing the student's previous school records. You can add, edit, or delete history entries (institution name, academic year, grade level, start/end dates, achievements, notes).
- **Discipline Records** — Opens a dialog to view and add discipline records (incident date, type, description, severity, action taken, resolved status). You can add, edit, delete, or mark records as resolved.
- **Fee Assignments** — Navigates to the student's fee assignment page where you can see and manage their fee structure.
- **View History** — Navigates to the student's full history page with timeline, attendance, exams, and fees.
- **Edit** — Opens the student edit form with all current data pre-filled in the same multi-tab dialog used for registration.
- **Delete** — Opens a confirmation dialog. Confirming removes the student record (audit trail is kept but the student is hidden from admissions lists).

### Bulk Actions

No bulk actions are available on this page. Use row actions or filters to work with multiple students conceptually (e.g. filter by status then edit or view one by one).

---

## Registering a New Student

To register a new student, click the **"Register Student"** button at the top of the page. A large form dialog opens with five tabs. Fill the required fields (marked with *) and any optional ones as needed.

### Tab 1: Admission

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| School | Dropdown | Auto | Shown only when your organization has more than one school. Automatically selected if there is only one school. |
| Admission No | Text | Yes | Unique admission number (e.g. SH-2024-001). Must not duplicate an existing number. |
| Card Number | Text | No | Optional ID or card number. |
| Applying Grade | Text | No | Grade or class the student is applying for (e.g. Grade 7). |
| Admission Year | Text | No | Year of admission (e.g. 2024). |

### Tab 2: Personal

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Full Name | Text (autocomplete) | Yes | Student's full name. Autocomplete suggests existing names to help avoid duplicates. |
| Father Name | Text (autocomplete) | Yes | Father's full name. |
| Tazkira Number | Text | No | National ID (Tazkira) number. |
| Phone | Text | No | Student's phone number. |
| Grandfather Name | Text (autocomplete) | No | Grandfather's name. |
| Gender | Select | Yes | Male or Female. |
| Birth Year | Text (read-only when Birth Date set) | No | Auto-filled from Birth Date if provided. |
| Birth Date | Date picker | No | Student's date of birth. Selecting this auto-fills Birth Year and Age. |
| Age | Number (read-only when Birth Date set) | No | Auto-calculated from Birth Date. |
| Preferred Language | Text | No | e.g. Dari, Pashto. |
| Nationality | Text | No | e.g. Afghan. |
| Previous School | Text | No | Name of the student's previous school or madrasa. |

### Tab 3: Address

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Origin Province / District / Village | Text (autocomplete) | No | Origin address; autocomplete suggests existing values. |
| Current Province / District / Village | Text (autocomplete) | No | Current address; autocomplete suggests existing values. |
| Home Address | Textarea | No | Full current home address. |

### Tab 4: Guardian

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Guardian Name | Text (autocomplete) | No | Guardian's full name. |
| Relation | Text | No | Relationship to the student. |
| Guardian Phone | Text | No | Guardian's phone number. |
| Guardian Tazkira | Text | No | Guardian's Tazkira number. |
| Guardian Photo | File upload | No | Optional guardian picture. |
| Zamin/Guarantor Name | Text (autocomplete) | No | Guarantor's name. |
| Zamin Phone | Text | No | Guarantor's phone. |
| Zamin Tazkira | Text | No | Guarantor's Tazkira. |
| Zamin Address | Textarea | No | Guarantor's address. |

### Tab 5: Additional

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Student Picture | File upload | No | Student photo; useful for ID cards and identification. |
| Admission Fee Status | Select | No | Paid, Pending, Waived, or Partial. |
| Student Status | Select | No | Applied, Admitted, Active, or Withdrawn. |
| Orphan Status | Select | No | Orphan or Has parents. |
| Disability Status | Text | No | e.g. hearing impairment. |
| Emergency Contact Name | Text | No | Name of emergency contact. |
| Emergency Contact Phone | Text | No | Emergency contact phone. |
| Family Income / Support Details | Textarea | No | Monthly income or donor support notes. |
| Notes | Textarea | No | Any additional notes. |

Use **Previous** and **Next** at the bottom to move between tabs. When done, click **"Register Student"**.

### What Happens After Submission

1. The system may check for potential duplicate students (matching name and father name, or other identifiers). If a possible duplicate is found, a confirmation prompt appears; you can still proceed to create a new record.
2. If your subscription has a student limit, the system checks it. When the limit is reached, registration is blocked and a message explains that you need to upgrade to add more students.
3. On success, a success message appears (e.g. "Student registered successfully"), the dialog closes, and the table refreshes. If you selected a student picture or guardian picture, they are uploaded after the student is created.

---

## Editing a Student

To edit an existing student:

1. Find the student in the table (use search or filters if needed).
2. Click the actions menu (⋮) → **Edit**.
3. The same multi-tab form opens with current data pre-filled.
4. Change any fields across the tabs (Admission, Personal, Address, Guardian, Additional).
5. Optionally change the student picture or guardian picture in the form.
6. Click **"Update Student"** (or **"Save"**).
7. On success, a success message appears, the dialog closes, and the table refreshes. Picture uploads are processed after the update.

When editing, the **Additional** tab also shows shortcut buttons to open **Educational History**, **Student Documents**, and **Discipline Records** for that student.

---

## Deleting a Student

To delete a student:

1. Click the actions menu (⋮) → **Delete**.
2. A confirmation dialog appears: "Delete student record?" with a note that removing the student keeps the audit trail but hides them from admissions lists.
3. Click **"Delete"** to confirm or **"Cancel"** to keep the student.
4. On confirm, the student is removed from the list and a success message is shown.

---

## View Profile

- From the table: click a row or choose **View Profile** from the actions menu (⋮).
- The profile dialog shows personal details, address, guardian and guarantor (Zamin) information, and notes. It is read-only; use **Edit** from the main table to change data.

---

## Print Profile

- From the actions menu (⋮) → **Print Profile**.
- The system generates a PDF of the student's profile. A progress dialog appears; when ready, you can download and optionally print the file.

---

## Documents

- From the actions menu (⋮) → **Documents** (or, when editing, from the **Additional** tab → **Student Documents**).
- The dialog lists existing documents. You can:
  - **Upload**: choose a file, enter document type and optional description, then upload.
  - **View/Download**: open or download existing documents.
  - **Delete**: remove a document after confirming.

---

## Educational History

- From the actions menu (⋮) → **Educational History** (or, when editing, from the **Additional** tab → **Educational History**).
- The dialog lists previous school records. You can **Add** a new record with: institution name, academic year, grade level, start date, end date, achievements, and notes. **Edit** or **Delete** existing entries as needed.

---

## Discipline Records

- From the actions menu (⋮) → **Discipline Records** (or, when editing, from the **Additional** tab → **Discipline Records**).
- The dialog lists discipline incidents. You can **Add** a record with: incident date, type, description, severity (Minor, Moderate, Major, Severe), action taken, and resolved flag. **Edit**, **Delete**, or **Resolve** existing records as needed.

---

## Export Options

The Students page itself does not provide PDF or Excel export. To get a student registration report:

- Use the **"Student Registration Report"** link in the page header (secondary action) to open the Student Registration Report page, where you can generate and export reports based on your filters.

---

## Tips & Best Practices

- **Fill required fields first** — Admission No, Full Name, Father Name, and Gender are required. Complete these before moving to other tabs.
- **Use autocomplete** — When typing names and addresses, the system suggests existing values. This helps keep data consistent and avoid typos.
- **Upload a student picture** — A photo helps identify students and is useful for ID card generation.
- **Check for duplicates** — Before registering, search by name and father name to reduce duplicate records. If the system warns about a potential duplicate, review before proceeding.
- **Set the correct status** — New students often start as "Applied" or "Admitted" and are set to "Active" when they begin attending. Use "Withdrawn" when they leave.

---

## Related Pages

- [Admissions](/help-center/s/students/admissions) — Manage student admissions to specific classes and academic years.
- [Students Import](/help-center/s/students/students-import) — Bulk import students from an Excel file.
- [Students History](/help-center/s/students/students-history) — View a student's full history with timeline and charts.
- [Admissions Report](/help-center/s/students/admissions-report) — Generate admission statistics and reports.

---

*Category: `students` | Language: `en`*
