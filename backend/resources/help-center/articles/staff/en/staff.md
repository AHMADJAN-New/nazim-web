# Staff Management

The Staff Management page is the central hub for managing all staff members in your school. School administrators and staff use this page to add new employees, view and edit staff profiles, track employment status (active, on leave, inactive, terminated, suspended), and access staff documents. Every staff member in your organization appears here with their complete information including contact details, education, and employment data.

---

## Page Overview

When you open the Staff Management page, you will see:

### Summary Cards

Five summary cards display at the top of the page:

- **Total Staff** — The total number of staff members registered across the selected organization.
- **Active** — Count of staff currently active in the organization.
- **On Leave** — Count of staff members who are currently on leave.
- **Teachers** — Count of staff with the teacher staff type.
- **Admins** — Count of staff with the admin staff type.

### Filters & Search

- **Search** — Search by staff name, employee ID, staff code, email, or phone number. Type in the search box to filter the table.
- **Status** — Filter by employment status: All Status, Active, Inactive, On Leave, Terminated, or Suspended.
- **Type** — Filter by staff type (e.g., Teacher, Admin, Accountant, Librarian). Options depend on staff types configured in Settings.
- **School** — Filter by school (shown only if your organization has multiple schools). Default is "All Schools".
- **Clear** — Click the X button to reset all filters to their default values.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|---|---|
| Photo | Staff profile picture thumbnail. Shows a default avatar if no picture has been uploaded. |
| Name | Full name of the staff member, formatted as "First Name son of Father Name" (or equivalent in RTL languages). |
| ID | Staff code or system-generated ID. Displays employee ID if no staff code exists. Hidden on smaller screens. |
| Employee ID | The unique employee identifier you assigned when creating the staff record. |
| Type | Staff type badge (e.g., Teacher, Admin). Based on staff types configured in Settings. |
| Status | Employment status badge: Active (green), Inactive (gray), On Leave (outline), Terminated or Suspended (red). |
| School | The school the staff member is assigned to. Shows "-" if not assigned. |
| Contact | Email and phone number when available. |

### Row Actions

Each row has action buttons in the rightmost column:

- **View Profile (eye icon)** — Opens a profile dialog showing the staff member's complete details including personal information, contact, addresses, education (religious and modern), employment history, and documents. You can upload and manage documents from within the profile.
- **Edit (pencil icon)** — Opens the edit form with all current data pre-filled across five steps. Requires `staff.update` permission.
- **Delete (trash icon)** — Shows a confirmation dialog. Deleting removes the staff member permanently. Requires `staff.delete` permission.

### Bulk Actions

No bulk actions are available on this page. Staff members must be edited or deleted individually.

---

## Adding a New Staff Member

To add a new staff member, click the **"Add Staff"** button at the top-right of the page. A multi-step form will open. Fill in the information step by step and click **Next** to proceed. On the last step, click **"Add Staff"** to submit. The form has five steps:

### Step 1: Basic Information

| Field | Type | Required | Description |
|---|---|---|---|
| Employee Code | Text | Yes | Unique identifier for the employee (e.g., EMP-001). Maximum 50 characters. |
| Staff Type | Dropdown | Yes | Select the staff type (Teacher, Admin, etc.). Staff types are configured in Settings > Staff Types. |
| School | Dropdown | No | Assign to a specific school. Shown only if your organization has multiple schools. |
| Employment Status | Dropdown | Yes | Active, Inactive, On Leave, Terminated, or Suspended. Default is Active. |

### Step 2: Personal Details

| Field | Type | Required | Description |
|---|---|---|---|
| First Name | Text | Yes | Staff member's first name. Maximum 100 characters. |
| Father Name | Text | Yes | Father's full name. Maximum 100 characters. |
| Grandfather Name | Text | No | Grandfather's name. Maximum 100 characters. |
| Civil ID / Tazkira Number | Text | No | National identification number. Maximum 50 characters. |
| Birth Year | Text | No | Year of birth (e.g., 1990). Maximum 10 characters. |
| Date of Birth | Date Picker | No | Staff member's date of birth. Employee must be at least 18 years old. |
| Profile Picture | File Upload / Camera | No | Upload a photo (max 5MB, jpg, png, gif, webp) or take a photo with your camera. You can crop the image before saving. |

### Step 3: Contact & Location

| Field | Type | Required | Description |
|---|---|---|---|
| Email | Text (email) | No | Valid email address. |
| Phone Number | Text | No | Contact phone number. Maximum 20 characters. |
| Home Address | Text | No | Full home address. Maximum 255 characters. |
| Origin Location — Province | Text | No | Province of origin. Maximum 50 characters. |
| Origin Location — District | Text | No | District of origin. Maximum 50 characters. |
| Origin Location — Village | Text | No | Village of origin. Maximum 50 characters. |
| Current Location — Province | Text | No | Current province. Maximum 50 characters. |
| Current Location — District | Text | No | Current district. Maximum 50 characters. |
| Current Location — Village | Text | No | Current village. Maximum 50 characters. |

### Step 4: Education

| Field | Type | Required | Description |
|---|---|---|---|
| Religious Education — Level | Text | No | Level of religious education. Maximum 255 characters. |
| Religious Education — University/Institution | Text | No | Religious university or school attended. Maximum 255 characters. |
| Religious Education — Graduation Year | Text | No | Year of graduation. Maximum 10 characters. |
| Religious Education — Department | Text | No | Department or field of study. Maximum 255 characters. |
| Modern Education — Level | Text | No | Level of modern/formal education. Maximum 255 characters. |
| Modern Education — School/University | Text | No | Modern school or university attended. Maximum 255 characters. |
| Modern Education — Graduation Year | Text | No | Year of graduation. Maximum 10 characters. |
| Modern Education — Department | Text | No | Department or field of study. Maximum 255 characters. |

### Step 5: Employment

| Field | Type | Required | Description |
|---|---|---|---|
| Position | Text | No | Job position or title. Maximum 255 characters. |
| Teaching Section | Text | No | Teaching section or subject area. Maximum 255 characters. |
| Duty | Text | No | Main duties and responsibilities. Maximum 255 characters. |
| Salary | Text | No | Salary information. Maximum 50 characters. |
| Notes | Textarea | No | Additional notes about the staff member. Maximum 1000 characters. |

### What Happens After Submission

1. The system validates all required fields (Employee Code, Staff Type, First Name, Father Name, Employment Status).
2. A usage limit warning may appear if your subscription is near or at the staff limit. You cannot create new staff if the limit is reached.
3. On success, a "Staff member created successfully" message appears.
4. If you selected a profile picture, it is uploaded and saved.
5. The form closes and the staff table refreshes to show the new staff member.

---

## Editing a Staff Member

To edit an existing staff member:

1. Find the staff member in the table.
2. Click the **Edit** (pencil) button in the row actions.
3. The edit form opens with the same five steps as the create form and all current data pre-filled.
4. Navigate through the steps using the sidebar or **Previous** / **Next** buttons.
5. Make your changes in any step.
6. On the last step, click **"Update Staff"**.
7. If you selected a new profile picture, it is uploaded.
8. A success message appears, the form closes, and the table refreshes.

---

## Deleting a Staff Member

To delete a staff member:

1. Click the **Delete** (trash) button in the row actions.
2. A confirmation dialog appears with the message: "Are you sure you want to delete this staff member? This action cannot be undone."
3. Click **Confirm** or **Delete** to permanently remove the staff member.
4. The staff record is soft-deleted and no longer appears in the list. Associated data (documents, assignments) may be affected depending on system configuration.

---

## Viewing Staff Profile

The **View Profile** action opens a detailed profile dialog with:

- **Employee Profile** — Photo, Staff ID, Employee ID, full name, status badges, position, staff type, hire date.
- **Employee Details** — Personal information (date of birth, Tazkira), location (province, district, village), contact (email, phone).
- **Tabs** — Current Assignment & Contract, Addresses, Employment History, Education & Skills, Documents, Records & Memberships, Leave Balance.

### Documents Tab

In the profile's Documents tab, you can:

1. **Upload Document** — Click "Upload Document" and provide: a file, document type (e.g., ID Card, Certificate, Contract), and optional description.
2. **View** — Click "View" on a document to open it in a new tab.
3. **Delete** — Click the trash icon to remove a document (requires permission). A confirmation dialog will appear.

---

## Registration Report

If you have `staff_reports.read` permission, a **"Registration Report"** button appears at the top. Clicking it navigates to the Staff Registration Report page where you can view and export staff registration data in PDF or Excel format.

---

## Export Options

Direct export (PDF/Excel) is not available on the Staff List page. To export staff data:

1. Click **"Registration Report"** in the page header.
2. On the Staff Registration Report page, use the export options to generate PDF or Excel reports.
3. Exports include staff data matching the current filters and report configuration.

---

## Pagination

The staff table is paginated. Use the pagination controls at the bottom to:

- Change page (First, Previous, Next, Last).
- Change page size (e.g., 10, 25, 50, 100 rows per page).
- See the total count of records.

---

## Tips & Best Practices

- **Set staff types first** — Configure staff types (Teacher, Admin, Accountant, etc.) in Settings > Staff Types before adding staff. You must select a staff type when creating a record.
- **Use unique employee codes** — Each staff member should have a unique Employee Code (e.g., EMP-001). This helps with payroll, attendance, and identification.
- **Upload profile pictures** — Photos make it easier to identify staff and may be used for ID cards or directory features.
- **Update status when staff leave** — When a staff member goes on leave or is terminated, update their status. This keeps your active count accurate and helps with reporting.
- **Complete education fields for teachers** — For teaching staff, filling in religious and modern education helps with curriculum assignment and compliance reporting.

---

## Related Pages

- [Staff Registration Report](/help-center/s/reports/reports-staff-registrations) — View and export staff registration data in PDF or Excel
- [Staff Report (Guide)](/help-center/s/staff/staff-report) — Quick access guide from Staff section
- [Staff Types](/help-center/s/settings/staff-types) — Configure staff types (Teacher, Admin, Accountant, Librarian, etc.)

---

*Category: `staff` | Language: `en`*
