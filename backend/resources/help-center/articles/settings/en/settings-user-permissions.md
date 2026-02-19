# User Permissions Management

The User Permissions Management page lets you assign roles and direct permissions to users in your organization. School administrators use this page to control what each user can do—for example, giving a staff member access only to attendance and students, or adding extra permissions to a teacher. Permissions come from the user's roles plus any direct (user-specific) permissions you assign here.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Organization Context

A blue banner at the top shows which organization you are managing permissions for and a short note that you can assign specific permissions to users.

### Filters & Search

- **Search** — Search users by full name, email, or role. Type to filter the table.
- **Filter by Role** — Dropdown to show only users with a specific role: All Roles, staff, admin, teacher, accountant, librarian, hostel_manager, asset_manager.

---

## Data Table

The main table shows the following columns:

| Column | Description |
|--------|-------------|
| Name | User's full name. On mobile, email and role/status badges are shown below. |
| Email | User's email address. Hidden on smaller screens. |
| Role | User's current role (badge). Hidden on smaller screens. |
| Status | Active or Inactive badge. Hidden on smaller screens. |
| Actions | **Manage Permissions** button — opens the permissions dialog for that user. Shown only if you have permission to update permissions. |

### Row Actions

There is no row dropdown; the only action is the **Manage Permissions** button, which opens a large dialog where you can:

- View and manage the user's roles (add or remove roles).
- View and toggle the user's direct permissions, grouped by feature (Students, Staff, Classes, Attendance, Finance, etc.). Permissions that come from a role show a "From role" badge; permissions assigned directly to the user show a "User specific" badge. You can add a direct permission by checking it, or remove a user-specific permission by unchecking it (you cannot remove a permission that the user has only from a role—you would remove it from the role instead).

### Bulk Actions

No bulk actions available on this page.

---

## Managing a User's Permissions

To change roles or permissions for a user:

1. Find the user in the table (use search or role filter if needed).
2. Click **"Manage Permissions"** on that row.
3. The dialog opens with two main sections:

### User Roles Section

- **Current Roles** — Lists the roles assigned to the user as badges. If you have update permission, you can click the (X) on a badge to remove that role (after confirming).
- **Assign Role** — Buttons for roles the user does not have yet. Click a role name to assign it to the user.

### Direct Permissions Section

- A **search box** at the top lets you filter permissions by permission name or resource.
- Permissions are grouped into **collapsible sections** by feature (e.g., Students, Staff, Classes, Subjects, Exams, Attendance, Finance, Fees, DMS, Events, Library, Hostel, Graduation, ID Cards, Assets, Leave Management, Other). Click a section header to expand or collapse it.
- Each permission has a **checkbox**. If checked, the user has that permission (either from a role or directly). If the permission is from a role, it shows a "From role" badge and you cannot uncheck it here (you would edit the role's permissions instead). If it is user-specific, it shows a "User specific" badge and you can uncheck it to remove it.
- Checking an unchecked permission adds it as a **direct (user-specific) permission** for that user. Unchecking a user-specific permission removes it.

4. When finished, click **"Close"** to close the dialog.

---

## What This Setting Controls

- **Roles** define a set of permissions; assigning a role to a user gives them all permissions attached to that role.
- **Direct permissions** override or add to role permissions. They are useful for giving one user extra access (e.g., one teacher can also manage exams) without changing the role for everyone.
- Only users with **permissions.read** can open this page. Only users with **permissions.update** can change roles or permissions.
- All changes apply to the **current organization** shown in the banner.

---

## Tips & Best Practices

- Use roles for common job functions (admin, teacher, staff) and add direct permissions only when a specific user needs more (or less) access.
- Before removing a role from a user, ensure they have another role or enough direct permissions so they can still do their job.
- The "From role" badge means the permission cannot be removed from this dialog; edit the role on the Permissions page if you want to change it for everyone with that role.
- Use the permission search in the dialog to quickly find a permission (e.g., "attendance" or "exams") when you have many permissions.

---

## Related Pages

- [Roles](/help-center/s/settings/settings-roles) — Create and manage roles
- [Permissions](/help-center/s/settings/settings-permissions) — Manage permissions and assign them to roles
- [User Management](/help-center/s/settings/settings-user) — Create and manage user accounts

---

*Category: `settings` | Language: `en`*
