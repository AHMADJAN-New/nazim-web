# Leave Create Page — Two-Column Desk Redesign

**Date:** 2026-10-04  
**Scope:** Leave request *giving* page only (`LeaveManagement` with `mode="create"`). Approvals workspace is out of scope.  
**Goals:** Desk speed + clearer post-create flow (Print / Next student).

## Decisions (confirmed)

| Decision | Choice |
|----------|--------|
| Primary goal | Speed for desk staff |
| Layout | **B — Two-column** |
| After create | Success panel with **Print** and **Next student** (no auto-print) |

## Current problems

- One tall single-column form: scan, class/student, type, dates, reason, notes all compete.
- Stats cards consume first viewport without helping create speed.
- After create, form resets immediately; print is only from list/approvals, not part of create flow.
- Manual class/student always visible even when scan already filled the student.

## Target UX

```text
┌─────────────────────────────────────────────────────────────┐
│ Page header: Leave Management                               │
├──────────────────────────────┬──────────────────────────────┤
│ LEFT — Student               │ RIGHT — Leave details        │
│                              │                              │
│ [ Big scan / search input ]  │ Leave type chips             │
│                              │ Duration quick chips         │
│ Student identity card        │ Start / End dates            │
│  name · father · code · class│ Times (if partial/time)      │
│                              │ Reason chips + textarea      │
│ Manual class / student       │ Approval note (collapsed)    │
│ (collapsed / secondary)      │                              │
│                              │ [ Clear ]  [ Create request ]│
└──────────────────────────────┴──────────────────────────────┘
│ SUCCESS (after create, replaces or overlays create actions) │
│ Request created · student name · leave summary              │
│ [ Print slip ]  [ Next student ]                            │
└─────────────────────────────────────────────────────────────┘
│ Recent requests (compact table — keep, below form)          │
└─────────────────────────────────────────────────────────────┘
```

### Left column — Student

1. **Scan-first input** (large, autofocus on mount and after “Next student”).
2. **Student card** when a student is selected/scanned:
   - Full name, father name, student code, class name.
   - Clear visual confirmation before submit.
3. **Manual pick** (class + student comboboxes) stays available but secondary (collapsed “Select manually” or muted section under the card) so scan remains the default path.

### Right column — Leave details

1. Leave type as **segmented chips** (full day / partial / time bound) — same values as today.
2. Duration quick chips + start/end date (existing behavior).
3. Times only when leave type ≠ full day.
4. Reason quick chips + required reason textarea.
5. Approval note optional, **collapsed by default** (“Add approval note”).
6. Actions: Clear form | Create request.

### Success panel

On successful `createLeave.mutateAsync`:

1. Do **not** fully wipe UI without feedback.
2. Show success panel with:
   - Created leave summary (student, dates, type, status).
   - **Print slip** → reuse existing iframe print helper / `handlePrint` with returned leave domain object.
   - **Next student** → clear student + leave fields (keep class if useful), hide success panel, refocus scan input.
3. Keep a short toast optional (`leave.requestCreated`) or rely on panel; prefer panel as primary + light toast OK.

### Defaults for speed

- Default leave type: `full_day`.
- Default dates: empty until quick-chip or picker (unchanged), unless product later wants “today” default — **not in this spec**.
- Keep class after Next student for faster same-class batching; clear student and leave fields.

### Responsive

- `lg+`: two columns (`grid-cols-1 lg:grid-cols-2`).
- Below `lg`: stack — Student column first, then Leave details, then success, then recent list.
- Follow existing Nazim mobile patterns (page container, button label hiding where applicable).

### Out of scope

- Approvals page redesign.
- Backend API / permission changes.
- Auto-print.
- Changing leave business rules or QR verification.

## Implementation notes

**Primary file:** [`frontend/src/pages/LeaveManagement.tsx`](frontend/src/pages/LeaveManagement.tsx)

Likely changes:

1. Restructure create-mode JSX into left/right columns.
2. Add `lastCreatedRequest: LeaveRequest | null` (or similar) state for success panel; ensure create mutation returns mapped leave with id for print.
3. Extract print iframe logic if needed so create success and approvals share one helper.
4. Soften/remove top stats row on create view (or move below) so form starts higher — prefer remove/hide on create for speed.
5. i18n keys for success panel actions (`leave.printSlip`, `leave.nextStudent`, `leave.selectManually`, `leave.addApprovalNote`, etc.) in all four leave page locale files + keys lists.

**Hooks:** Confirm `useCreateLeaveRequest` returns created leave domain object with `id`; if not, adjust mapper/hook return.

## Acceptance criteria

- [ ] Create page uses two-column layout on desktop; stacked on mobile.
- [ ] Scan remains the primary student entry path; manual pick still works.
- [ ] Selected student shows identity card (name, father, code, class).
- [ ] Create shows success panel with Print + Next student (no new browser tab; print via existing same-tab iframe).
- [ ] Next student clears student/leave fields, refocuses scan, ready for another entry.
- [ ] Approvals mode unchanged.
- [ ] All new UI strings translated (en/ps/fa/ar).

## Review

Please confirm this spec (or note edits). After approval, implementation plan + coding can proceed.
