# ADR-002: Organization HR permission model

## Status
Accepted

## Decision
Use resource.action permissions:
- `hr_staff.read/create/update/delete`
- `hr_assignments.read/create/update/approve`
- `hr_payroll.read/create/run/approve/export`
- `hr_reports.read/export`

Role mappings:
- `organization_hr_admin`
- `hr_officer`
- `payroll_officer`
- `principal` (read-limited for org hr views)

Permissions are global definitions (`organization_id = NULL`) assigned to org-scoped roles via `role_has_permissions` with organization_id.

## Guardrails
- No role-name bypasses in controllers.
- Controller checks use organization context via base `Controller::userHasPermission`.
