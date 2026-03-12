# ADR-003: Organization HR data migration strategy

## Status
Accepted

## Decision
- Introduce normalized HR tables for assignments and payroll.
- Keep legacy `staff.salary` (string) as display/backward compatibility.
- Backfill command:
  1. Create one active primary assignment from legacy `staff.school_id`.
  2. Parse `staff.salary` best-effort into numeric `base_salary` in compensation profile.
  3. Preserve parse failures in `legacy_salary_notes`.

## Rollback safety
- Migrations are reversible by dropping new tables only.
- Seeders are non-destructive no-op on down.
- Backfill command supports `--dry-run`.
