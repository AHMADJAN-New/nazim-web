# Staff Registration Report

The Staff Registration Report page lets you view, filter, and export detailed staff registration data. School administrators use this page to generate PDF or Excel reports of all staff members with their personal information, contact details, education, employment, and location data. The report reflects your current filters, so you can export a subset of staff (e.g., only teachers, or only staff from a specific school) or the full list.

---

## Page Overview

When you open the Staff Registration Report page, you will see:

### Header

- **Title** — "Staff Registration Report" with a short description.
- **Export Buttons** — PDF and Excel export buttons in the top-right. Exports include only the data matching your current filters. A school must be selected (or implied by your default school) to export.

### Filters Panel

A collapsible filter panel lets you narrow the staff list before viewing or exporting:

- **Search** — Search by name, employee ID, staff code, father name, phone number, or email.
- **School** — Filter by school. Options: All Schools, or a specific school from your organization.
- **Status** — Filter by employment status: All Status, Active, Inactive, On Leave, Terminated, or Suspended.
- **Staff Type** — Filter by staff type (Teacher, Admin, Accountant, Librarian, etc.). Options depend on staff types configured in Settings.

---

## Data Table

The main table shows staff with these columns:

| Column | Description |
|---|---|
| Avatar | Staff profile picture (or placeholder if no picture). |
| Staff Code | Staff code or employee ID. |
| Employee ID | The unique employee identifier. |
| Name | Full name formatted as "First Name son of Father Name" (or equivalent in RTL). |
| Staff Type | Staff type (e.g., Teacher, Admin). |
| Position | Job position or title. |
| Status | Employment status badge (Active, Inactive, On Leave, Terminated, Suspended). |
| Actions | Eye icon to view full details. |

### View Details

Click the **eye icon** in the Actions column to open a side panel (sheet) with the staff member's complete profile:

- **Personal Information** — Staff Code, Employee ID, Full Name, Father Name, Grandfather Name, Birth Date, Birth Year, Tazkira Number, Status.
- **Contact Information** — Phone Number, Email, Home Address.
- **Location Information** — Origin Location (province, district, village), Current Location.
- **Education Information** — Religious Education (level, institution, graduation year, department), Modern Education (level, institution, graduation year, department).
- **Employment Information** — Staff Type, Position, Duty, Salary, School, Teaching Section.
- **Additional Information** — Notes, if any.

---

## Exporting the Report

### PDF Export

1. Apply filters (School, Status, Staff Type, Search) as needed.
2. Ensure a school is selected or available (required for branded report generation).
3. Click the **PDF** export button.
4. The system generates a branded PDF report with your organization's logo and styling.
5. The PDF includes all staff matching the current filters, with columns such as: Staff Code, Employee ID, Status, Full Name, First Name, Father Name, Grandfather Name, Tazkira Number, Birth Date, Birth Year, Phone, Email, Home Address, Staff Type, Position, Duty, Salary, Teaching Section, School, Organization, Origin Location, Current Location, Religious Education, Religious Institution, Religious Graduation Year, Religious Department, Modern Education, Modern Institution, Modern Graduation Year, Modern Department, Notes.
6. A success message appears when the PDF is ready to download.

### Excel Export

1. Apply filters as needed.
2. Ensure a school is selected or available.
3. Click the **Excel** export button.
4. The system generates an Excel file with the same data as the PDF, in spreadsheet format.
5. Each column corresponds to a field (Staff Code, Employee ID, Full Name, etc.).
6. A success message appears when the Excel file is ready to download.

### Export Requirements

- **School required** — A school must be in context (either from the School filter or your default school) for export to work. If no school is selected, you will see: "A school is required to export the report."
- **No data** — If no staff match your filters, you will see: "No data to export."
- **Permission** — You need the `staff_reports.read` permission to access this page. Export may require `staff_reports.export` depending on your setup.

---

## Pagination

The table is paginated. Use the controls at the bottom to:

- Change page (First, Previous, Next, Last).
- Change page size (e.g., 10, 25, 50 rows per page).
- See the total count of staff matching your filters.

The table header shows "Staff Management (X)" where X is the number of staff after filtering.

---

## Tips & Best Practices

- **Filter before exporting** — Use School, Status, and Staff Type filters to export only the staff you need. This keeps reports focused and file sizes manageable.
- **Select a school** — Always ensure a school is selected (or use your default) before exporting. Exports use school branding and require school context.
- **Use the detail sheet** — Click the eye icon to verify a staff member's full information before including them in an export.
- **Search for specific staff** — Use the search box to find staff by name, employee ID, or phone before filtering or exporting.
- **Check staff types** — Configure staff types in Settings > Staff Types before relying on Staff Type filters. Options come from your organization's staff types.

---

## Related Pages

- [Staff Management](/help-center/s/staff/staff) — Add, edit, and manage staff members
- [Staff Types](/help-center/s/settings/staff-types) — Configure staff types (Teacher, Admin, etc.)
- [Student Registrations Report](/help-center/s/reports/reports-student-registrations) — Similar report for students

---

*Category: `reports` | Language: `en`*
