# Phone Book

The Phone Book page gives you one place to view and search contact information for students (guardians, emergency contacts, zamin), staff, donors, and event guests. You can filter by category, search by name or phone, and export the list to PDF or Excel. School administrators and staff use it to quickly find and contact parents, staff, or donors.

---

## Page Overview

When you open the Phone Book (from the sidebar or navigation), you will see:

### Header

- **Title** — "Phone Book" (or the translated equivalent).
- **Description** — Short text explaining that you can view and search all phone numbers from students, staff, donors, and guests.
- **Export buttons** — PDF and Excel export on the right (when there is data to export). Exports respect the current tab and search filter.

### Tabs

Tabs at the top let you filter entries by category. Only tabs you have **permission** to see are shown:

- **All** — All phone book entries from every category you can access. A badge may show the total count.
- **Students** — Contacts linked to students (guardians, emergency contacts, zamin). Shown if you have `students.read`.
- **Staff** — Staff members’ contact details. Shown if you have `staff.read`.
- **Donors** — Donor contacts. Shown if you have `donors.read`.
- **Guests** — Event guests. Shown if you have `event_guests.read`.

If you have no permissions for any of these, the page shows an "Access Denied" message. Changing the tab resets the search and pagination to the first page.

---

## Filters & Search

- **Search** — A search box (e.g. "Search by name, phone, email...") on each tab. Type to filter the table by name, phone, or email. Search applies to the current tab only. Pagination resets to page 1 when you search or change the tab.

---

## Data Table

The main table shows the following columns:

| Column   | Description |
|----------|-------------|
| Name     | Contact name. A relation label (e.g. Guardian, Zamin) may appear below the name. |
| Phone    | Phone number. Shown as a clickable link (e.g. tel: link) so you can call directly. |
| Email    | Email address if available. Shown as a clickable mailto link. "-" if not set. |
| Category | Badge indicating the type of contact: Student Guardian, Student Emergency, Student Zamin, Staff, Donor, Guest, or Other. Colors differ by category. |
| Details  | Extra context: e.g. linked student name, admission number, employee ID, guest code, or contact person. "-" if none. |
| Address  | Address if available. Truncated in the cell if long. "-" if not set. |

The table is paginated. Use the pagination controls at the bottom to change page or page size.

---

## Row Behavior

- **No row actions menu** — The Phone Book is read-only. You do not add or edit contacts from this page; contacts come from Students, Staff, Donors, and Events. Use this page to view and search, and to export.

---

## Export Options

- **PDF and Excel** — Use the export buttons in the header. The export includes the data currently visible (current tab and search). Columns typically include: Name, Phone, Email, Category, Relation, Student name, Admission No, Employee ID, Address.
- **Filters summary** — The export can include a short summary of active filters (e.g. category, search text) so you know what the file represents.
- If there is no data (e.g. empty tab or no results), export may be disabled or show a message like "No data to export."

---

## Permissions

- You must have at least one of: `students.read`, `staff.read`, `donors.read`, `event_guests.read` to see the Phone Book. The **All** tab appears only if you have at least one of these.
- Each category tab is visible only if you have the matching permission. Data is scoped to your organization and default school.

---

## Tips & Best Practices

- **Use the right tab** — Switch to Students, Staff, Donors, or Guests to focus on one type of contact.
- **Use search** — Type name, phone, or email to find a contact quickly without scrolling.
- **Use the phone link** — Click the phone number in the table to start a call (on devices that support it).
- **Export for offline use** — Export to Excel or PDF when you need a printed or offline list (e.g. for events or emergency contacts).
- **Check category badges** — Category and relation (e.g. Guardian vs Zamin) help you choose the right contact for each student or purpose.

---

## Related Pages

- [Dashboard](/help-center/s/general/dashboard) — Main overview and quick links
- [Getting Started](/help-center/s/general/getting-started) — First steps in the system
- [Account & Profile](/help-center/s/general/account-profile) — Your profile and contact info

---

*Category: `general` | Language: `en`*
