# Organizations

The Organizations page lets you view and manage organization records in the Nazim School Management System. Platform administrators use it to create organizations, set up an admin user for each, and view organization details and statistics. Organization admins with the right permissions can edit their own organization's information. Organizations are the top-level tenant: each has schools, users, students, and other data scoped to it.

---

## Page Overview

When you open this page, you will see:

### Summary Cards

This page does not have summary cards.

### Filters & Search

- **Search** — Search by organization name or slug. Type in the search box to filter the list.

---

## Data Table

The main table shows the following columns (on desktop; on mobile a card layout is used):

| Column | Description |
|--------|-------------|
| Name | Organization display name (may wrap to two lines). |
| Slug | Short URL-friendly identifier (lowercase, hyphens). Shown in a code-style badge. |
| Settings | Badge showing how many custom settings are configured, or "No settings". Hidden on smaller screens. |
| Created At | Date the organization was created. |
| Updated At | Date the organization was last updated. Hidden on smaller screens. |
| Actions | View details, Edit, Delete; on platform admin routes, also "View Subscription & Features". |

### Row Actions

When you click the actions (or the ⋮ menu on mobile) on any row, you can:

- **View Details** — Opens a dialog with full organization info: basic info, statistics (users, schools, students, classes, staff, buildings, rooms), and settings JSON. From there you can close or go to Edit.
- **View Subscription & Features** — (Platform admin only.) Opens the organization’s subscription and features page.
- **Edit** — Opens the create/edit form with current data so you can update the organization.
- **Delete** — Opens a confirmation dialog to delete the organization.

### Bulk Actions

No bulk actions available on this page.

---

## Adding a New Organization

To create a new organization, click the **"Add Organization"** button at the top. A form opens with the following tabs:

### Tab: Basic

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Organization Name | Text | Yes | Full name of the organization. |
| Slug | Text | Yes | URL-friendly identifier: lowercase letters, numbers, and hyphens only. |
| Organization Type | Select | No | One of: School, University, Institute, Academy, College, Other. |
| Description | Textarea | No | Short description of the organization. |
| Established Date | Date picker | No | When the organization was established. |
| Active Organization | Switch | No | Whether the organization is active (default: on). |

### Tab: Contact

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Email | Email | No | Organization contact email. |
| Phone | Text | No | Organization phone number. |
| Website | URL | No | Website URL; if you omit "https://", it is added automatically. |

### Tab: Address

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Street Address | Text | No | Street address. |
| City | Text | No | City. |
| State/Province | Text | No | State or province. |
| Country | Text | No | Country. |
| Postal Code | Text | No | Postal or ZIP code. |

### Tab: Legal

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Registration Number | Text | No | Official registration number. |
| Tax ID | Text | No | Tax identification number. |
| License Number | Text | No | License number. |

### Tab: Additional

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Contact Person Name | Text | No | Full name of main contact. |
| Contact Person Email | Email | No | Contact person email. |
| Contact Person Phone | Text | No | Contact person phone. |
| Contact Person Position | Text | No | e.g. Principal, Director. |
| Logo URL | URL | No | URL of organization logo image. |

### Tab: Admin User (Platform admin only, when creating)

This tab appears only for platform administrators when creating a new organization.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Admin Full Name | Text | Yes | Full name of the organization admin user. |
| Admin Email | Email | Yes | Login email for the admin. |
| Admin Password | Password | Yes | Password (minimum 8 characters). |

### What Happens After Submission

- Validation runs (required fields, formats). If the website field has no scheme, "https://" is added.
- On success, a success message is shown, the dialog closes, and the table refreshes.
- For platform admins creating an org, the new admin user can log in and manage that organization.

---

## Editing an Organization

To edit an existing organization:

1. Find the organization in the table (or cards on mobile).
2. Click **View Details** then **Edit Organization**, or click the Edit action (pencil) on the row.
3. The form opens with current data in all tabs.
4. Change any fields across Basic, Contact, Address, Legal, and Additional (Admin User tab is only for create).
5. Click **"Update"** (or **"Create"** if the form was opened in create mode).
6. On success, a message is shown and the table refreshes.

---

## Deleting an Organization

To delete an organization:

1. Click the Delete action (trash icon) on the row.
2. A confirmation dialog appears with the organization name.
3. Click **"Delete"** to confirm or **"Cancel"** to keep it.
4. Deleting an organization removes it and can affect all data scoped to it (schools, users, students, etc.). Use with care.

---

## Viewing Organization Details

Click **View Details** (eye icon) on a row to open the details dialog. It shows:

- **Basic information** — Name, slug, ID, created at, updated at.
- **Statistics** — (When not on platform admin route.) Counts for users, schools, students, classes, staff, buildings, and rooms for that organization.
- **Settings** — JSON of custom organization settings, or a message if none are configured.

From the dialog you can click **Edit Organization** to open the edit form, or **Close** to return to the list.

---

## Export Options

This page does not offer PDF or Excel export.

---

## Tips & Best Practices

- **Slug** — Use a short, unique slug (e.g. `my-school`) so it is easy to use in URLs and integrations.
- **Contact and address** — Fill contact and address so reports and letters can use correct organization details.
- **Admin user (platform)** — When creating an organization as a platform admin, set a strong password and share the admin login details securely.

---

## Related Pages

- [Buildings](/help-center/s/settings/settings-buildings) — Manage buildings within your organization's schools.
- [Rooms](/help-center/s/settings/settings-rooms) — Manage rooms within buildings.
- [Profile](/help-center/s/settings/settings-profile) — Edit your user profile and view other profiles.
- [Permissions](/help-center/s/settings/settings-permissions) — Manage roles and permissions for your organization.

---

*Category: `settings` | Language: `en`*
