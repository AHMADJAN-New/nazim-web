# Attendance Round Names

This document explains the Attendance Round Names feature, how legacy sessions are handled, and how to run safe backfills.

## Overview

Attendance sessions now use a school-scoped predefined round name:

- source table: `attendance_round_names`
- linkage column: `attendance_sessions.attendance_round_name_id`
- display label: `attendance_sessions.session_label` (kept for backward-compatible UI/report rendering)

`round_number` remains in use for ordering/analytics continuity.

---

## Data Model

### `attendance_round_names`

- `id` (UUID PK)
- `organization_id` (UUID)
- `school_id` (UUID)
- `name` (string, max 100)
- `order_index` (int)
- `is_active` (bool)
- timestamps + soft delete

### `attendance_sessions`

- `attendance_round_name_id` (UUID FK, nullable for legacy rows before backfill)

---

## Runtime Behavior

### Create / update attendance session

- `attendance_round_name_id` is required.
- Selected round must belong to current `organization_id` + `school_id` and be active.
- `session_label` is set from the selected round name.

### Legacy sessions

- Legacy rows may have `attendance_round_name_id = NULL` if created before this feature.
- They continue rendering via existing `session_label` + `round_number`.
- Use backfill command to fully link them.

---

## Safe Backfill Command

Command:

```bash
php artisan attendance:backfill-round-names
```

Options:

- `--dry-run` preview only (no DB writes)
- `--organization-id=<uuid>` limit to one org
- `--school-id=<uuid>` limit to one school
- `--chunk=500` sessions per transaction chunk
- `--force` skip confirmation prompt

### Recommended Production Flow

1. Preview:

```bash
php artisan attendance:backfill-round-names --dry-run
```

2. Apply:

```bash
php artisan attendance:backfill-round-names --force
```

3. Verify:

```bash
php artisan tinker --execute "echo \App\Models\AttendanceSession::whereNull('deleted_at')->whereNull('attendance_round_name_id')->count();"
```

Expected verification result: `0`.

---

## Backfill Matching Logic

For each legacy session:

1. Try to match existing round by `session_label` (case-insensitive) in the same org/school.
2. If no label match and label is empty, try match by `round_number -> order_index`.
3. If still no match, create a round name:
   - use existing `session_label` if present
   - otherwise use `Round {round_number}`
4. Update session:
   - set `attendance_round_name_id`
   - normalize empty label to resolved round name

---

## Operational Notes

- Backfill is idempotent for already-linked sessions (it only targets `attendance_round_name_id IS NULL`).
- Uses chunked transactions to reduce lock time.
- Safe to rerun with scoped options.
- Keep queue workers running normally; this operation is DB-only and does not require queue pause.

---

## Troubleshooting

### Command says no legacy sessions found

- Data is already fully linked, or your scope options are too narrow.

### Round names created count is high

- Legacy data likely had many unique labels; this is expected.
- You can clean up/merge names in settings after backfill if needed.

### Some sessions still unlinked after run

- Re-run with narrower scope (`--organization-id`, `--school-id`) and check for data anomalies.

