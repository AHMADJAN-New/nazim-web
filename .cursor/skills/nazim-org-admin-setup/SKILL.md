---
name: nazim-org-admin-setup
description: Documents the Organization Admin area setup in Nazim: routes, layout, access control, and org-wide vs school-scoped behavior. Use when adding or changing org-admin pages, HR hub, staff/assignments lists, school scoping rules, or OrganizationAdminRoute/OrganizationAdminLayout.
---

# Nazim Organization Admin Setup

## Overview

The **Organization Admin** area (`/org-admin`) is an enterprise-gated section for org-wide management. It has its own layout and sidebar, separate from the main app. Staff and assignments **lists** are org-wide (no school filter); **create/update** forms may restrict or allow school selection by user type.

## Routes and layout

- **Base path**: `/org-admin`
- **Guard**: `OrganizationAdminRoute` wraps the tree; then `OrganizationAdminLayout` + `<Outlet />` for nested routes.
- **Register in**: `frontend/src/App.tsx` as a sibling to main protected routes (not inside `PersistentLayout`).

**Nested routes:**

| Path | Page | Purpose |
|------|------|---------|
| `/org-admin` (index) | Redirect → dashboard | - |
| `/org-admin/dashboard` | OrganizationDashboard | Org-wide overview |
| `/org-admin/schools` | OrgAdminSchoolsPage | Schools management |
| `/org-admin/users` | OrgAdminUsersPage | Users (with "Access all schools" option) |
| `/org-admin/subscription` | OrgAdminSubscriptionPage | Plan, expiry, usage summary |
| `/org-admin/limits` | OrgAdminLimitsPage | Usage limits by category |
| `/org-admin/hr` | OrganizationHrHubPage | HR hub landing |
| `/org-admin/hr/staff` | OrganizationHrStaffPage | All org staff (no school filter) |
| `/org-admin/hr/assignments` | OrganizationHrAssignmentsPage | All assignments (no school filter) |
| `/org-admin/hr/payroll` | OrganizationHrPayrollPage | Payroll |
| `/org-admin/hr/reports` | OrganizationHrReportsPage | HR reports |

**Legacy redirects** (in main app tree): `/organization-dashboard`, `/org/dashboard`, `/organization/hr`, `/organization/hr/staff`, etc. → redirect to `/org-admin/*`.

## Access control (OrganizationAdminRoute)

- **Auth**: `user` and `profile?.organization_id` required; else redirect to `/auth`.
- **Plan**: Organization must be on **Enterprise** plan (`useOrganizationPlanSlug()` → `isEnterprise`); else redirect to `/dashboard`.
- **Org-level user**: One of:
  - `profile.schools_access_all === true`, or
  - `!profile?.default_school_id` (no school = org management user), or
  - `profile.role === 'platform_admin'`
- **Permission**: Either `organization_admin` / `platform_admin` role **or** at least one of: `organizations.read`, `dashboard.read`, `school_branding.read`, `hr_staff.read`, `hr_assignments.read`, `hr_payroll.read`, `hr_reports.read`.

Sidebar visibility inside the layout uses `useHasPermission` per item (e.g. `hr_staff.read`, `hr_assignments.read`, `subscription.read`, `schools.read`, `users.read`).

## Staff and assignments: list vs create/update

**Lists (no school scope):**

- **Staff list** (main app `/staff` and org-admin `/org-admin/hr/staff`): Show **all staff in the organization**. Do not filter by current school.
- **Assignments list** (`/org-admin/hr/assignments`): Show **all assignments** in the org. Do not default to current school.

**Create/update:**

- **Staff create/edit** (main app): School dropdown is either (a) only the user’s `default_school_id` for school-level users, or (b) all org schools for org-level users. Default for create = `profile?.default_school_id`.
- **Assignments** (org-admin): User picks staff and school in the form; no automatic restriction to “current school” for the list.

## Frontend hooks and API

**Org HR hooks** (`frontend/src/hooks/orgHr/useOrgHr.ts`):

- `useOrgHrStaff(params?)`: Pass `school_id` only when the page explicitly filters by school (e.g. `params?.schoolId`). **Do not** default `school_id` to `profile?.default_school_id` so org-admin sees all staff.
- `useOrgHrAssignments(params?)`: Same: pass `school_id` only when explicitly filtering. **Do not** default to current school.
- `enabled`: `!!profile?.organization_id` (no requirement for `default_school_id`).

**API client** (`frontend/src/lib/api/client.ts`):

- For **GET /staff** (main app staff list), the client must **not** add `school_id` to the request (so the backend returns all org staff). The interceptor uses `isStaffList = endpoint === '/staff' && (method === 'GET' || !method)` and skips adding `school_id` when `isStaffList` is true.
- Other endpoints may still add `school_id` when the user has `schools_access_all` and a `selected_school_id` is set.

**Org HR API** (`orgHrApi`): Uses prefix `/org-hr/` (e.g. `/org-hr/staff`, `/org-hr/assignments`). No automatic injection of `school_id` by the client for these; hooks pass params explicitly.

## Backend

- **Org HR routes**: Under `auth:sanctum` + org middleware, prefix `org-hr`, middleware `feature:org_hr_core`. See `backend/routes/api.php` (e.g. `Route::prefix('org-hr')->middleware(['feature:org_hr_core'])->group(...)`).
- **Staff index** (main app `GET /staff`): `StaffController::index` returns all staff for the user’s organization; **no** school filter for listing.
- **Org HR staff index** (`GET /org-hr/staff`): `OrganizationHrController::staffIndex` returns all org staff; **no** school filter for listing.
- **Assignments**: `OrganizationHrController::assignmentsIndex` returns all org assignments; optional `school_id` only when the client sends it as a filter.

## File locations

| Area | Location |
|------|----------|
| Route guard | `frontend/src/components/OrganizationAdminRoute.tsx` |
| Layout + sidebar | `frontend/src/organization-admin/components/OrganizationAdminLayout.tsx` |
| Org-admin pages | `frontend/src/organization-admin/pages/` (e.g. `OrgAdminUsersPage`, `OrgAdminLimitsPage`, `OrgAdminSubscriptionPage`) |
| HR pages | `frontend/src/pages/organization/hr/` (e.g. `OrganizationHrStaffPage`, `OrganizationHrAssignmentsPage`) |
| Org HR hooks | `frontend/src/hooks/orgHr/useOrgHr.ts` |
| Org HR API | `frontend/src/lib/api/client.ts` (`orgHrApi`) |
| Backend Org HR | `backend/app/Http/Controllers/OrganizationHrController.php` |
| Backend staff list | `backend/app/Http/Controllers/StaffController.php` (index) |

## Layout header

- **OrganizationAdminLayout** header shows: org name, user name, language switcher, “Back to main app” (or similar), **Platform Admin** button (if `GET /auth/is-platform-admin` returns `is_platform_admin: true`), logout.
- Translations: use `organizationAdmin.*` keys (e.g. `organizationAdmin.dashboard`, `organizationAdmin.hrStaff`). Shared bundle: `frontend/src/lib/translations/shared/organizationAdmin/`.

## Checklist: new org-admin page or HR change

- [ ] Route added under `/org-admin` in `App.tsx` (inside `OrganizationAdminRoute` + `OrganizationAdminLayout`).
- [ ] Sidebar entry added in `OrganizationAdminLayout.tsx` with correct `useHasPermission` and `organizationAdmin.*` translation key.
- [ ] **Lists**: No default school filter; pass `school_id` only when the user explicitly filters by school.
- [ ] **Create/update**: School selection follows main app rule (current school only for school-level users; all schools for org-level).
- [ ] API client: If the endpoint is a “list all org” endpoint (e.g. staff list), ensure the client does not auto-inject `school_id`.
- [ ] Backend: Index methods for org-wide lists do not scope by `school_id` unless the request explicitly sends it as a filter.
