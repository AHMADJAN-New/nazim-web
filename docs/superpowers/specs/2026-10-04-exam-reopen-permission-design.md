# Exam Reopen Permission Design

**Date:** 2026-10-04  
**Status:** Approved for implementation

## Goal

Allow authorized users to reopen a **completed** exam to **in_progress** so marks can be entered again. Default access is given to organization admins and school admins via a dedicated permission.

## Decision

Use permission `exams.reopen` (not a hard role check). Assign by default to `organization_admin` and school `admin` roles.

## Behavior

### Backend (`POST /api/exams/{id}/status`)

- Existing `exams.update` still required for all status changes.
- Transition `completed` → `in_progress` additionally requires `exams.reopen`.
- Existing graduation-batch rollback block remains.
- Other transitions unchanged (e.g. completed → archived still only needs `exams.update`).

### Frontend (Exams list)

- For completed exams, show **In Progress** in Change Status only when the user has `exams.reopen`.
- Still show **Archived** for users with `exams.update`.

### Seeding / migration

- Add `reopen` to the `exams` actions in `PermissionSeeder`.
- Migration creates the permission and assigns it to `organization_admin` and `admin` roles for existing orgs.

## Out of scope

- Direct archived → in_progress
- Changing who can complete or archive exams
