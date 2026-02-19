# Roles Management

The Roles Management page lets you view and manage roles used in your organization for access control. Roles (such as admin, teacher, staff) are assigned to users and determine which permissions they have. School administrators use this page to create organization-specific roles, edit role descriptions, and remove roles that are no longer needed.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards at the top. Below the table, two statistic cards are shown:

- **Total Roles** — The total number of roles in your organization (including global and organization-specific).
- **Organization Roles** — The number of roles that are specific to your organization (as opposed to global/system roles).

### Filters & Search

- **Search** — A search box that filters roles by name or description. Type to narrow the list; results are sorted alphabetically by name.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | Role name (e.g., admin, teacher, staff). On mobile, description and organization badge are shown below the name. |
| Description | Short description of the role. Hidden on smaller screens. |
| Organization | Badge indicating whether the role is "Organization specific" or "Global". Hidden on smaller screens. |
| Actions | Edit (pencil) and Delete (trash) buttons. Shown only if you have update or delete permission. |

### Row Actions

There is no dropdown menu; actions are inline buttons on each row:

- **Edit** — Opens the edit role dialog with the current name and description. Role name is read-only in edit mode (it cannot be changed).
- **Delete** — Opens a confirmation dialog. Confirming removes the role permanently.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Role

To create a new role, click the **"Create Role"** button at the top of the page. A dialog will open with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Role Name | Text | Yes | Unique name for the role (e.g., clerk, librarian). Max 255 characters. Cannot be changed after creation. |
| Description | Text | No | Optional description of what the role is for. Max 1000 characters. |

### What Happens After Submission

- The system validates the name (required, max length) and description (max length).
- On success, a success message is shown, the dialog closes, and the table refreshes with the new role.
- The new role is organization-specific and can then be assigned to users and given permissions via the Permissions and User Permissions settings pages.

---

## Editing a Role

To edit an existing role:

1. Find the role in the table.
2. Click the **Edit** (pencil) button on that row.
3. The edit dialog opens with the current name and description. The **Role Name** field is disabled — role names cannot be changed so that existing user assignments remain valid.
4. Change the **Description** if needed.
5. Click **"Update"** (or "Create Name" depending on translation).
6. On success, the dialog closes and the table refreshes.

---

## Deleting a Role

To delete a role:

1. Click the **Delete** (trash) button on the role row.
2. A confirmation dialog appears with the role name.
3. Click **"Delete"** to confirm or **"Cancel"** to keep the role.
4. Deleting a role removes it permanently. Users who had this role will lose that role assignment. Consider reassigning them to another role before deleting.

---

## What Roles Control

- **Roles** group sets of permissions (e.g., "teacher" might have permissions for classes, attendance, and exams).
- Permissions are assigned to roles on the **Permissions** settings page.
- Users are assigned roles (and optionally given extra permissions) on the **User Permissions** settings page.
- **Global** roles are available across the system; **Organization-specific** roles exist only within your organization.

---

## Tips & Best Practices

- Use clear, short role names (e.g., admin, teacher, staff) so they are easy to recognize when assigning to users.
- Add a description for each role so other administrators know what the role is for.
- Do not delete a role that is still assigned to users without first assigning them another role or updating their permissions.
- You cannot rename a role after creation; if you need a different name, create a new role and migrate users to it.

---

## Related Pages

- [User Permissions](/help-center/s/settings/settings-user-permissions) — Assign roles and direct permissions to users
- [Permissions](/help-center/s/settings/settings-permissions) — Manage permissions and assign them to roles
- [Schools](/help-center/s/settings/settings-schools) — Manage school branding and multiple schools

---

*Category: `settings` | Language: `en`*
