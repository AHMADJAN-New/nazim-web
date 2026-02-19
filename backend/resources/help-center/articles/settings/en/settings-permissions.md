# Roles and Permissions

The Roles and Permissions page lets you manage user roles and their permissions for your organization. Administrators with the right access can create roles, assign permissions to each role (e.g. read, write, delete per resource such as students, buildings, rooms), and edit or delete roles. What a user can do in the system is determined by the permissions of their role (and any direct user permissions). Setting up roles and permissions correctly is essential for security and for giving staff the right level of access.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Organization Context

A banner at the top shows which organization you are managing permissions for. You see global permissions and your organization's permissions; you can only assign permissions that belong to your organization or that are global.

### Filters & Search

- **Search** — Search roles by name or description. Type in the search box to filter the role cards.

---

## Roles Display (Card Grid)

Roles are shown as cards in a grid (not a table). Each role card shows:

- **Role name** — Title of the role (e.g. admin, teacher, staff).
- **Description** — Optional description of the role.
- **Permissions by resource** — For each resource (e.g. students, buildings, rooms), three checkboxes or indicators: **Read**, **Write**, **Delete**. These show whether the role has that permission. When you click **Edit** and enter edit mode on the card, you can check or uncheck these to assign or remove permissions.
- **Edit** — (If you have **roles.update**.) Puts the card into edit mode so you can toggle Read/Write/Delete per resource. When in edit mode, **Cancel** and **Save** appear; use the checkboxes to assign or remove permissions, then **Save** or **Cancel** to exit edit mode.
- **Delete** — (If you have **roles.delete**.) Opens the delete confirmation dialog for that role.

There is no single "table" with columns; the grid is the main data view.

### Bulk Actions

No bulk actions available on this page.

---

## Creating a New Role

To create a new role (requires **roles.create**):

1. Click the **"Add Role"** (or "Create Role") button at the top of the card.
2. A dialog opens with:
   - **Role Name** * (required) — Unique name for the role (e.g. Manager, Editor). Max 255 characters.
   - **Description** (optional) — Short description. Max 1000 characters.
3. Click **"Create"** to save. On success, the dialog closes and a new role card appears. The new role has no permissions yet; use **Edit** on the card to assign permissions.

---

## Editing a Role's Name and Description

To change a role's description (role name cannot be changed after creation) you need the **Edit Role** dialog. If your interface provides a way to open it (e.g. from the role card or a menu), use it. Requires **roles.update**.

1. Open the **Edit Role** dialog for that role.
2. In the dialog:
   - **Role Name** — Shown but cannot be changed (disabled). Role names are fixed once created.
   - **Description** — You can change this. Optional, max 1000 characters.
3. Click **"Update"** to save or **"Cancel"** to close.
4. On success, the dialog closes and the card refreshes.

---

## Editing a Role's Permissions

To assign or remove permissions for a role (requires **roles.update**):

1. On the role card, click **Edit** (the in-card Edit button, not the dialog for name/description).
2. The card enters edit mode: checkboxes for Read, Write, Delete per resource become enabled (where the permission exists).
3. Check or uncheck **Read**, **Write**, or **Delete** for any resource. Each change is applied when you toggle (the hooks call assign or remove API).
4. Click **Save** (or **Cancel** to leave without saving further). Note: toggles may already be saved as you go; Save/Cancel here mainly exit edit mode.
5. When finished, click **Save** or **Cancel** to exit edit mode.

Permissions are grouped by resource (e.g. students, buildings). You only see permissions that are global or belong to your organization.

---

## Deleting a Role

To delete a role (requires **roles.delete**):

1. On the role card, click **Delete**.
2. A confirmation dialog appears with the role name and a warning that the action cannot be undone.
3. Click **"Delete"** to confirm or **"Cancel"** to keep the role.
4. On success, the role is removed from the grid. Users who had this role will lose those permissions until assigned another role.

---

## What Depends on Roles and Permissions

- **Menu and page access** — Sidebar and pages are shown or hidden based on the user's permissions (e.g. buildings.read, rooms.create).
- **Buttons and actions** — Create, Edit, Delete buttons on pages are shown only if the user has the matching permission.
- **Profiles** — Users are assigned roles; changing a role's permissions affects everyone with that role.

---

## Export Options

This page does not offer PDF or Excel export.

---

## Tips & Best Practices

- **Least privilege** — Give each role only the permissions needed for the job (e.g. teachers may need classes.read and attendance.read but not buildings.delete).
- **Use descriptions** — Add a short description to each role so others know what the role is for.
- **Test after changes** — Log in as a user with that role (or ask them to try) to confirm they can and cannot access the right features.

---

## Related Pages

- [Profile Management](/help-center/s/settings/settings-profile) — Assign users to organizations and view profiles; roles are assigned via the permission system.
- [Organizations](/help-center/s/settings/settings-organizations) — Organization context; permissions are scoped per organization.
- [Buildings](/help-center/s/settings/settings-buildings) — Example of a resource controlled by permissions (e.g. buildings.read, buildings.create).

---

*Category: `settings` | Language: `en`*
