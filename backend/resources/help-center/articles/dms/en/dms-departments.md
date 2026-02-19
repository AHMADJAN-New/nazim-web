# Departments & Routing

The Departments page is where you manage your organization’s departments and see how incoming documents are assigned to them. School administrators use departments to route incoming mail (e.g. Admin, Finance, Exams, Library) and to see how many documents each department has. You can add, edit, and delete departments; departments that have documents assigned cannot be deleted until those documents are reassigned or removed.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

- **Total Departments** — The total number of departments in your organization.
- **Documents Assigned** — The total number of incoming documents currently assigned to any department. The subtitle explains these are incoming documents.
- **Unassigned Documents** — Shown as a dash (-). The subtitle tells you to check the Incoming documents page to see or assign unassigned documents.

### Filters & Search

- **Search** — Search departments by name. Type in the search box to filter the table; the list updates as you type.
- **Export** — PDF and Excel export buttons are in the filter area. Export includes the current filtered list with columns: Department Name, Documents (count), Created (date). The export reflects the active search filter.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Department Name | The name of the department (e.g. Admin, Finance, Exams, Library). |
| Documents | A badge showing how many incoming documents are assigned to this department (e.g. "3 documents"). If zero, the badge shows "0 documents". |
| Created | The date the department was created, in locale date format, or "-" if not available. |
| Actions | Edit (pencil) and Delete (trash) buttons. Delete is disabled if the department has one or more documents assigned. |

### Row Actions

There is no dropdown menu; each row has two action buttons:

- **Edit (pencil icon)** — Opens the edit dialog with the current department name. Change the name and click **"Update Department"** to save.
- **Delete (trash icon)** — Opens the delete confirmation dialog. If the department has no documents assigned, you can confirm to delete. If it has documents, the Delete button in the dialog is disabled and a message explains that the department has a count of assigned document(s) and cannot be deleted.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Department

To create a new department, click the **"Add Department"** button in the page header (or **"Create First Department"** in the empty state). A dialog will open with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Department Name | Text | Yes | Name of the department. Placeholder suggests e.g. Admin, Finance, Exams, Library. A hint below lists examples: Admin, Finance, Exams, Hostel, Library, IT, HR. |

**Buttons:** **Cancel** (closes and clears the form) and **Create Department** (submits; shows "Creating..." while saving).

### What Happens After Submission

- The system checks that the name is not empty. If it is, an error message (e.g. "Department name is required") is shown.
- On success, a success message is shown, the dialog closes, the form resets, and the table and stats cards refresh.
- The new department appears in the table and in the Total Departments count.

---

## Editing a Department

To edit an existing department:

1. Find the department in the table.
2. Click the **Edit** (pencil) button on that row.
3. The edit dialog opens with the current department name pre-filled.
4. Change the name as needed.
5. Click **"Update Department"** (or "Updating..." while saving).
6. On success, a success message appears, the dialog closes, and the table and stats refresh.

---

## Deleting a Department

To delete a department:

1. Click the **Delete** (trash) button on the department row.
2. A confirmation dialog appears: "Are you sure you want to delete \"{name}\"? This action cannot be undone."
3. If the department has assigned documents, the dialog also shows: "This department has {count} assigned document(s) and cannot be deleted." The **Delete** button is disabled in that case.
4. If the department has no documents, click **"Delete"** to confirm or **"Cancel"** to keep it. While deleting, the button may show "Deleting...".
5. On success, the department is removed and the table and stats refresh.

---

## Export Options

- **PDF and Excel** — Available from the filter panel (ReportExportButtons). Export uses the current filtered list (based on search).
- **Columns exported:** Department Name, Documents (count), Created (date).
- **Report key:** `dms_departments`. A filter summary is included (e.g. search term or "All departments").

---

## Tips & Best Practices

- **Create departments before routing** — Set up departments (Admin, Finance, Exams, etc.) before or when you start recording incoming documents so you can assign documents to the right place.
- **Avoid deleting departments with documents** — If a department has documents, reassign or handle those documents in Incoming first, then delete the department if it is no longer needed.
- **Use clear names** — Department names should be short and recognizable (e.g. Admin, Finance, Exams, Library) so staff can quickly choose the right department when routing documents.

---

## Related Pages

- [DMS Incoming](/help-center/s/dms/dms-incoming) — Record and route incoming documents to departments; unassigned documents appear here.
- [DMS Reports](/help-center/s/dms/dms-reports) — View incoming-by-department and other DMS statistics.
- [DMS Archive](/help-center/s/dms/dms-archive) — Search and browse all incoming and outgoing documents.

---

*Category: `dms` | Language: `en`*
