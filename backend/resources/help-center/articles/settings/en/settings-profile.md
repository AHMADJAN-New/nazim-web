# Profile Management

The Profile Management page lets you view and edit your own user profile and, if you have the right permission, view and edit other users' profiles in your organization. You can update your full name, phone, and (when editing others) email, role, organization, and active status. Profiles are linked to the same user accounts used for login; changes here affect how you and others appear and what roles and permissions they have.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

This page does not have a separate filter panel. The main content is your profile card and, if you have permission, a table of all profiles.

---

## Your Profile Card

At the top of the page you see your own profile in a card. It shows:

- **Name** — Your full name (or "No name" if not set).
- **Email** — Your login email (or "No email" if not set).
- **Role** — Your current role (e.g. admin, teacher, staff) in a badge.
- **Organization** — If you belong to an organization, its name is shown in a button (read-only). If you have no organization, a "Super Admin" badge may appear.
- **Edit** — A button to open the edit dialog for your own profile.

---

## All Profiles Table (if you have permission)

If you have the **profiles.update** permission, below your card you see a section **"All Profiles"** with a table of all profiles in your organization. Columns:

| Column | Description |
|--------|-------------|
| Name | Full name. On small screens, email, role, and status are shown below the name in the same cell. |
| Email | User's email. Hidden on small screens. |
| Role | User's role in a badge. Hidden on medium and small screens. |
| Status | Active or Inactive. Hidden on large screens when space is limited. |
| Actions | Edit button (pencil) to open that profile's edit dialog. |

### Row Actions

- **Edit** — Opens the edit profile dialog for that user so you can change their name, email, phone, role, organization, and active status (subject to permissions).

### Bulk Actions

No bulk actions available on this page.

---

## Editing Your Own Profile

To edit your own profile:

1. Click **"Edit My Profile"** (or **"Edit"** on mobile) at the top of the page, or the Edit button on your profile card.
2. The edit dialog opens. You can change:
   - **Full Name** (required)
   - **Phone** (optional)
   - You cannot change your own email, role, organization, or active status from this dialog; those are for admins editing other users.
3. Click **"Update"** to save or **"Cancel"** to close without saving.
4. On success, the dialog closes and your card (and table if visible) refreshes.

---

## Editing Another User's Profile

To edit another user's profile (requires **profiles.update**):

1. In the "All Profiles" table, find the user and click the Edit (pencil) button.
2. The edit dialog opens with that user's data. You can change:
   - **Full Name** (required)
   - **Email** (optional)
   - **Phone** (optional)
   - **Role** — Select from the list of roles (e.g. admin, teacher, staff). Role name is shown with spaces and capitalization.
   - **Status** — Active or Inactive.
   - Organization is shown but cannot be changed from this form in the described implementation.
3. Click **"Update"** to save or **"Cancel"** to close without saving.
4. On success, the dialog closes and the table refreshes.

Note: You cannot edit your own role, organization, or active status from this page; only another user with profiles.update can do that for you.

---

## Form Fields Summary (Edit Dialog)

| Field | Type | Required | Shown when | Description |
|-------|------|----------|------------|-------------|
| Full Name | Text | Yes | Always | User's full name. |
| Email | Email | No | When editing another user | User's email address. |
| Phone | Text | No | Always | Phone number (max 50 characters). |
| Role | Select | No | When editing another user and you have permission | Role (admin, teacher, staff, etc.). |
| Status | Select (Active/Inactive) | No | When editing another user and you have permission | Whether the user account is active. |

---

## Deleting a Profile

This page does not support deleting profiles. User deletion is typically done from a separate user or admin management page.

---

## Export Options

This page does not offer PDF or Excel export.

---

## Tips & Best Practices

- **Keep your name and phone current** — So others can identify and contact you correctly in the system.
- **Role and status** — Only users with profiles.update can change another user's role or active status; use this to disable accounts or adjust roles without deleting.
- **Organization** — Each user should belong to an organization for normal school operations; "Super Admin" with no organization is for platform-level access.

---

## Related Pages

- [Permissions](/help-center/s/settings/settings-permissions) — Manage roles and permissions that apply to profiles.
- [Organizations](/help-center/s/settings/settings-organizations) — View organization information.
- [Buildings](/help-center/s/settings/settings-buildings) — Manage buildings; profile's default school affects which data you see.

---

*Category: `settings` | Language: `en`*
