# Org Admin Setup — Reference

## Backend feature gating

- Org HR APIs live under `Route::prefix('org-hr')->middleware(['feature:org_hr_core'])`. The `feature:org_hr_core` middleware checks subscription/addons; ensure the organization has the feature enabled (e.g. via `organization_feature_addons` or plan).
- Enterprise plan enables `org_hr_core`, `org_hr_payroll`, `org_hr_analytics` by default (see `SubscriptionSeeder` / plan features).

## Permissions used in org-admin

- **Sidebar**: `hr_staff.read`, `hr_assignments.read`, `hr_payroll.read`, `hr_reports.read`, `schools.read`, `users.read`, `subscription.read`.
- **Route guard**: At least one of `organizations.read`, `dashboard.read`, `school_branding.read`, `hr_staff.read`, `hr_assignments.read`, `hr_payroll.read`, `hr_reports.read`, or role `organization_admin` / `platform_admin`.
- **Assignments CRUD**: `hr_assignments.read`, `hr_assignments.create`, `hr_assignments.update`, `hr_assignments.delete` (backend checks via Spatie).

## User management in org-admin

- **OrgAdminUsersPage** uses `UserManagement` with `showSchoolsAccessAll={true}` so the "Access all schools" checkbox is visible. Main app user management does not show it.
- Users with no school (`default_school_id` null) are org-level; backend sets `schools_access_all = true` when saving "No school".

## useStaff (main app) vs org-admin staff

- Main app staff list uses `useStaff` in `StaffList.tsx`; that hook may require `profile?.default_school_id` for `enabled`. Org-admin HR staff list uses `useOrgHrStaff` and only requires `profile?.organization_id`, and does not send `school_id` unless the UI explicitly filters by school.
- For org-wide staff list in the main app, the backend `StaffController::index` returns all org staff and the API client must not add `school_id` to GET `/staff` (see SKILL.md).
