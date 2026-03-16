---
name: Organization Admin Area
overview: Add a dedicated Organization Admin area at `/org-admin` (like Platform Admin at `/platform`), gated by Enterprise plan, and move the existing Organization Dashboard and Organization HR into it so the main sidebar only shows a single "Organization Admin" entry with room for future org-wide features.
todos: []
isProject: false
---

# Organization Admin Area (Enterprise-Gated)

## Goal

- Create an **Organization Admin** area at `/org-admin` with its own layout and sidebar (mirroring Platform Admin at `/platform`).
- **Gate access** by: authenticated user, has `organization_id`, and organization’s subscription **plan slug is `enterprise`** (plus existing org dashboard/HR permission logic).
- **Move** into this area:
  - Organization Dashboard (all-schools view) from `/organization-dashboard` and `/org/dashboard`.
  - Organization HR (hub + staff, assignments, payroll, reports) from `/organization/hr/`*.
- **Main app**: Remove those from the main sidebar and add a single **"Organization Admin"** entry linking to `/org-admin`, visible only when Enterprise + permission. This frees the main sidebar and leaves room for future org-wide items inside the org-admin area.

## Architecture

```mermaid
flowchart LR
  subgraph main [Main App]
    MainSidebar[Main Sidebar]
    Dashboard[/dashboard]
    Staff[/staff]
    OrgAdminLink["Organization Admin" link]
  end

  subgraph orgadmin [Org Admin Area]
    OrgAdminLayout[OrganizationAdminLayout]
    OrgDashboard[/org-admin/dashboard]
    OrgHR[/org-admin/hr]
    OrgHRStaff[/org-admin/hr/staff]
    OrgHRAssign[/org-admin/hr/assignments]
    OrgHRPayroll[/org-admin/hr/payroll]
    OrgHRReports[/org-admin/hr/reports]
  end

  MainSidebar --> OrgAdminLink
  OrgAdminLink -->|Enterprise + permission| OrgAdminLayout
  OrgAdminLayout --> OrgDashboard
  OrgAdminLayout --> OrgHR
  OrgAdminLayout --> OrgHRStaff
  OrgAdminLayout --> OrgHRAssign
  OrgAdminLayout --> OrgHRPayroll
  OrgAdminLayout --> OrgHRReports
```



- **Route tree**: Sibling to the main protected routes (like `/platform`). Under `BrowserRouter`: a route `path="/org-admin"` with `OrganizationAdminRoute` + `OrganizationAdminLayout` + `<Outlet />`, and nested routes for dashboard and HR.
- **Main app**: Under the existing `ProtectedRoute` → `PersistentLayout`, remove routes for organization-dashboard, `/org/dashboard`, and `/organization/hr/`*. Add one sidebar entry "Organization Admin" → `/org-admin` when plan is Enterprise and user has org-admin access (same logic as current org dashboard + HR visibility).

---

## 1. Backend: Plan slug for gating

**Problem**: Org-admin access must be gated by `plan.slug === 'enterprise'`. Today `useSubscriptionStatus()` is only enabled for users with `subscription.read`, so org admins without that permission never get plan info.

**Options** (choose one):

- **A) Lightweight endpoint**: Add `GET /api/subscription/plan-slug` (or `GET /api/me/plan`) that returns `{ plan_slug: 'enterprise' | 'pro' | ... }` for the current organization. No sensitive subscription details. No permission required beyond auth + org.
- **B) Include in profile/login**: Add `plan_slug` (or `subscription_plan_slug`) to the profile or login response so the frontend can read it from `useAuth().profile`.

**Recommendation**: A) keeps subscription logic in one place and avoids enlarging profile. Implement in [backend/routes/api.php](backend/routes/api.php) (under `auth:sanctum` + organization middleware) and in a small controller method that loads current org’s subscription plan and returns only the slug.

---

## 2. Frontend: Organization Admin route guard and layout

**OrganizationAdminRoute** (new component, e.g. [frontend/src/components/OrganizationAdminRoute.tsx](frontend/src/components/OrganizationAdminRoute.tsx)):

- Require: `user` and `profile?.organization_id`.
- Require: current organization’s plan slug is `enterprise` (from new hook `useOrganizationPlanSlug()` that calls the new endpoint, or from profile if option B).
- Optionally require: same “org dashboard access” as today (`schools_access_all` and one of `organization_admin` role, `organizations.read`, `dashboard.read`, `school_branding.read`) or a dedicated permission like `organization_admin.access` if you add it.
- If not allowed: redirect to `/dashboard` (or show “Organization Admin is available on Enterprise plan”).
- Render `children` when allowed.

**OrganizationAdminLayout** (new component, e.g. [frontend/src/organization-admin/components/OrganizationAdminLayout.tsx](frontend/src/organization-admin/components/OrganizationAdminLayout.tsx)):

- Mirror [frontend/src/platform/components/PlatformAdminLayout.tsx](frontend/src/platform/components/PlatformAdminLayout.tsx) structure: fixed sidebar + main content area; header with org context, language switcher, user menu, “Back to main app” link to `/dashboard`.
- **Sidebar sections** (e.g. “Overview”, “HR”, “More later”):
  - **Overview**: Dashboard (link to `/org-admin` or `/org-admin/dashboard`).
  - **HR**: HR Hub (`/org-admin/hr`), Staff Master (`/org-admin/hr/staff`), Assignments, Payroll, Reports (same as current HR children, under `/org-admin/hr/`*).
  - Optional: placeholder section “Organization” for future (e.g. subscription link, org settings).
- Reuse existing nav patterns (collapsible sections, active state, icons). No platform-only links (organizations, plans, etc.).

**useOrganizationPlanSlug** (new hook):

- Calls `GET /api/subscription/plan-slug` (or equivalent), returns `{ planSlug: string | null }`, enabled when `!!user && !!profile?.organization_id`. Used by `OrganizationAdminRoute` and by main sidebar to show/hide “Organization Admin”.

---

## 3. Move Organization Dashboard into org-admin

- **Routes**: Remove from main app tree the routes for `/organization-dashboard` and `/org/dashboard`. Add under `/org-admin`:  
  - `index` or `path="dashboard"` → render existing [frontend/src/pages/OrganizationDashboard.tsx](frontend/src/pages/OrganizationDashboard.tsx) (or a thin wrapper that skips the old “redirect if no access” logic, since the guard already enforces access).
- **OrganizationDashboard.tsx**: Ease or remove the internal `canAccessOrganizationDashboard` redirect (redirect to `/dashboard`) so the page is only entered via `OrganizationAdminRoute`; alternatively keep a minimal check and redirect to `/org-admin` if not allowed.
- **API**: No change; keep `GET /organization-dashboard/overview` as is. Optionally add backend middleware later to allow only Enterprise for this endpoint.

---

## 4. Move Organization HR into org-admin

- **Routes**: Remove from main app the routes for `/organization/hr`, `/organization/hr/staff`, `/organization/hr/assignments`, `/organization/hr/payroll`, `/organization/hr/reports`. Add under `/org-admin` the same five routes with prefix `/org-admin/hr`:
  - `/org-admin/hr` → OrganizationHrHubPage  
  - `/org-admin/hr/staff` → OrganizationHrStaffPage  
  - `/org-admin/hr/assignments` → OrganizationHrAssignmentsPage  
  - `/org-admin/hr/payroll` → OrganizationHrPayrollPage  
  - `/org-admin/hr/reports` → OrganizationHrReportsPage
- **Permission**: Keep existing permission checks (`hr_staff.read`, `hr_assignments.read`, etc.) on each page or wrap the org-admin HR segment with a permission check; guard already ensures Enterprise.
- **Internal links**: Update all HR page links from `/organization/hr` to `/org-admin/hr` in:
  - [frontend/src/pages/organization/hr/OrganizationHrHubPage.tsx](frontend/src/pages/organization/hr/OrganizationHrHubPage.tsx) (module paths).
  - [frontend/src/pages/organization/hr/OrganizationHrStaffPage.tsx](frontend/src/pages/organization/hr/OrganizationHrStaffPage.tsx) (breadcrumb).
  - [frontend/src/pages/organization/hr/OrganizationHrAssignmentsPage.tsx](frontend/src/pages/organization/hr/OrganizationHrAssignmentsPage.tsx) (breadcrumb).
  - [frontend/src/pages/organization/hr/OrganizationHrPayrollPage.tsx](frontend/src/pages/organization/hr/OrganizationHrPayrollPage.tsx) (breadcrumb).
  - [frontend/src/pages/organization/hr/OrganizationHrReportsPage.tsx](frontend/src/pages/organization/hr/OrganizationHrReportsPage.tsx) (breadcrumb).
- **API**: No change; existing `/org-hr/`* endpoints stay as is. Optionally restrict to Enterprise in backend later.

---

## 5. Main app sidebar and redirects

**SmartSidebar** [frontend/src/components/navigation/SmartSidebar.tsx](frontend/src/components/navigation/SmartSidebar.tsx):

- Remove the current “Organization Dashboard” item (the one with `url: "/organization-dashboard"` when `hasOrganizationDashboardAccess`).
- Remove the entire “Organization HR” parent and its children (HR Hub, Staff Master, Assignments, Payroll, Reports).
- Add a single entry **“Organization Admin”** (or “Org Admin”):
  - `url: "/org-admin"` (or `/org-admin/dashboard`).
  - Visible when: `isEnterprisePlan === true` (from `useOrganizationPlanSlug()` or profile) **and** the same condition as today’s org dashboard + HR visibility: `profile?.schools_access_all` and (organization_admin role or one of organizations.read, dashboard.read, school_branding.read, or any of the HR permissions). Alternatively, a single permission like `organization_admin.access` if you introduce it.
  - Icon: e.g. Building2; place near top of sidebar (e.g. after main Dashboard).

**Redirect after login** [frontend/src/lib/redirectUtils.ts](frontend/src/lib/redirectUtils.ts):

- When `canAccessOrganizationDashboard` is true, **and** organization plan is Enterprise, return `'/org-admin'` (or `'/org-admin/dashboard'`) instead of `'/organization-dashboard'`.
- Otherwise, if `canAccessOrganizationDashboard` but not Enterprise, keep redirecting to `/dashboard` (org dashboard no longer exists in main app).

**PersistentLayout** [frontend/src/components/layout/PersistentLayout.tsx](frontend/src/components/layout/PersistentLayout.tsx):

- Remove title mapping for `organization-dashboard` and `org/dashboard` (those routes no longer exist under main app).

---

## 6. App.tsx route structure

- **Register org-admin route group** (sibling to `path="/platform"` and the main `ProtectedRoute` block):
  - `path="/org-admin"` with `element={<OrganizationAdminRoute><OrganizationAdminLayout><Outlet /></OrganizationAdminLayout></OrganizationAdminRoute>}`.
  - Nested routes:
    - `index` → `<Navigate to="dashboard" replace />` or render dashboard.
    - `path="dashboard"` → OrganizationDashboard (or index).
    - `path="hr"` → OrganizationHrHubPage.
    - `path="hr/staff"` → OrganizationHrStaffPage.
    - `path="hr/assignments"` → OrganizationHrAssignmentsPage.
    - `path="hr/payroll"` → OrganizationHrPayrollPage.
    - `path="hr/reports"` → OrganizationHrReportsPage.
- **Remove** from the main protected route tree:
  - `/organization-dashboard`
  - `/org/dashboard`
  - `/organization/hr`
  - `/organization/hr/staff`
  - `/organization/hr/assignments`
  - `/organization/hr/payroll`
  - `/organization/hr/reports`

---

## 7. Optional: Backend enforcement for Enterprise

- **Organization dashboard**: Optionally add middleware or controller check that the current organization’s subscription plan is Enterprise before returning `organization-dashboard/overview` (avoid non-Enterprise orgs calling it if they hit the API directly).
- **Org-HR**: Same for `/org-hr/`* if you want strict plan enforcement on the server.

---

## 8. Translations and accessibility

- Add/use translation keys for “Organization Admin” and any new org-admin nav labels (e.g. under `nav` or a new `organizationAdmin` section) in [frontend/src/lib/translations](frontend/src/lib/translations) (en, ps, fa, ar).
- Ensure “Back to main app” and sidebar items have clear labels for RTL and screen readers.

---

## 9. Summary of files to add/change


| Action | File / area                                                                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add    | Backend: endpoint for plan slug (e.g. `SubscriptionController::planSlug()` or similar) and route.                                                                                                                   |
| Add    | `frontend/src/components/OrganizationAdminRoute.tsx`                                                                                                                                                                |
| Add    | `frontend/src/organization-admin/components/OrganizationAdminLayout.tsx` (and optional `organization-admin/index.ts`)                                                                                               |
| Add    | `frontend/src/hooks/useOrganizationPlanSlug.ts` (or extend profile in backend and use profile in guard).                                                                                                            |
| Change | [frontend/src/App.tsx](frontend/src/App.tsx): register `/org-admin` group and nested routes; remove old org dashboard and org HR routes from main tree.                                                             |
| Change | [frontend/src/components/navigation/SmartSidebar.tsx](frontend/src/components/navigation/SmartSidebar.tsx): remove org dashboard and org HR items; add “Organization Admin” entry gated by Enterprise + permission. |
| Change | [frontend/src/lib/redirectUtils.ts](frontend/src/lib/redirectUtils.ts): post-login redirect to `/org-admin` when Enterprise + org access.                                                                           |
| Change | [frontend/src/components/layout/PersistentLayout.tsx](frontend/src/components/layout/PersistentLayout.tsx): remove org dashboard title mappings.                                                                    |
| Change | [frontend/src/pages/OrganizationDashboard.tsx](frontend/src/pages/OrganizationDashboard.tsx): optional simplification of access check (rely on guard).                                                              |
| Change | HR pages (5 files): replace `/organization/hr` with `/org-admin/hr` in links and breadcrumbs.                                                                                                                       |


This gives you a single Organization Admin area under `/org-admin`, with Dashboard and HR moved there and the main app sidebar simplified to one “Organization Admin” entry when the plan is Enterprise, with room to add more org-wide sections inside the org-admin layout later.