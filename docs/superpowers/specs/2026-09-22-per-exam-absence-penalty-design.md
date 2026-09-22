# Per-Exam Absence Mark Penalty Design

**Date:** 2026-09-22  
**Status:** Approved for implementation (Approach 1 — fully per-exam)

## Problem

Schools apply different absence windows and class scopes per exam (e.g. monthly = one month, classes A–B; midterm = four months, classes A–E), with possibly different progressive cut bands. Year-scoped school settings cannot express this.

## Decision

Fully **per-exam** configuration:

| Concern | Scope |
|---------|--------|
| Enable flag | Per exam |
| Progressive bands | Per exam |
| Which classes | Selected `exam_classes` for that exam |
| Absence totals | Per exam + student admission |
| Application | Grand-total reports only; subject marks unchanged |

## Apply rule

Penalty applies iff:

1. Exam setting `is_enabled` is true, **and**
2. The report’s `exam_class_id` is in the exam’s selected exam-class list.

Empty selected list ⇒ no cut (safe default).

Union of “selected exams” and “selected classes” from earlier discussion collapses to: selecting whole exams is done by enabling an exam and selecting all its exam-classes; partial selection selects a subset of exam-classes.

## Data model

- `exam_absence_penalty_settings` — unique `exam_id`
- `exam_absence_penalty_bands` — `exam_id`
- `exam_absence_penalty_exam_classes` — `(exam_id, exam_class_id)` unique
- `exam_student_absences` — unique `(exam_id, student_admission_id)`

All rows include `organization_id` + `school_id` (UUID PKs).

## Calculator

`loadContext(org, school, examId, examClassId)` loads setting/bands/absences for the exam and sets `enabled` only when the exam-class is selected.

Progressive band math unchanged (e.g. 12 absences with bands 0–4=0, 5–9=3, 10–15=5 ⇒ cut 30).

## API

- `GET/PUT .../settings?exam_id=` — enabled, bands, exam_class_ids
- `GET/PUT .../absences?exam_id=` — per-student counts for that exam
- `POST .../copy` — copy enabled + bands (+ optional class mapping); never copy absences

Permissions: `exams.read` / `exams.update`; school via `getCurrentSchoolId()`.

## UI

- Settings page: pick exam → enable → select exam-classes → bands → save; copy-from-exam
- Absences page: pick exam → optional exam-class filter → edit counts → save
- Consolidated / student reports: show absence/cut columns when API returns them

## Out of scope

- Auto-sync from daily attendance
- Class-subject single-subject mark sheets
- Mutating `exam_results.marks_obtained`
