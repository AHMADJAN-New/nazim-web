# ADR-001: Organization HR API boundaries

## Status
Accepted

## Context
Existing staff APIs are school-context scoped and are suitable for principal/school operations. Central HR requires organization-wide visibility and workflows.

## Decision
- Keep `/api/staff` and related endpoints school-scoped under `school.context` for backward compatibility.
- Add `/api/org-hr/*` endpoints under `auth:sanctum`, `organization`, `subscription:read`, and feature flags.
- Org-HR endpoints are intentionally outside `school.context` and enforce organization isolation in controllers.
- Central HR modules are bounded by:
  - Staff Master
  - Assignments
  - Compensation & Payroll
  - HR Analytics

## Consequences
- Principals continue using current school APIs.
- HR teams get organization-wide tools without breaking existing flows.
- Audit and permission checks are centralized at org-level resources.
