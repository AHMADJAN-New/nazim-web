# Exam Reopen Permission Design

**Date:** 2026-10-04  
**Status:** Approved for implementation

## Goal

Allow authorized users to reopen a **completed** exam to **in_progress** so marks can be entered again. Default access is limited to organization admins via a dedicated permission.

## Decision

Use permission `exams.reopen` (not a hard role check). Assign by default only to the `organization_admin` role. School admins and other roles do not get it unless granted explicitly later.

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
- Treat `exams.reopen` as school-admin restricted (same pattern as org-only permissions).
- Migration creates the permission and assigns it only to `organization_admin` roles for existing orgs.

## Out of scope

- Direct archived → in_progress
- Changing who can complete or archive exams
