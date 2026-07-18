# Secret Number Continuous Assignment by Class/Section + Per-Subject Labels

**Date:** 2026-07-18  
**Status:** Approved for implementation planning  
**Approach:** Change default Entire Exam sort (Approach 1)

## Problem

1. **Assignment:** Entire Exam auto-assign currently sorts by class name then student name. Schools need secret numbers that are continuous **within each class/section**, and continue seamlessly **across** class/sections in grade order (e.g. Class A ends at 1062 → Class B starts at 1063).

2. **Printing:** Secret labels currently emit one label per student (first subject only). Schools need **one label per exam subject** for the same student secret number (e.g. secret 1340 with 7 subjects → 7 labels, each with 1340 + subject + date).

Secret numbers remain stored **once per exam student** (`exam_students.exam_secret_number`), not per subject.

## Goals

- Entire Exam assign: continuous numbers ordered by grade → class → section → student.
- Selected Class assign: unchanged continuous block for that class/section only.
- Override existing: keep current checkbox semantics (skip if off; may leave gaps).
- Preview: show class/section number ranges before confirm.
- Secret label print: always one label per subject when unfiltered; label shows secret + subject + date when available.
- Accurate total label count (students × subjects).

## Non-Goals

- New third scope/mode or drag-reorder wizard.
- Per-subject secret numbers in the database.
- Changing roll-number assignment behavior.
- Reserving skipped numbers when Override is off (gaps allowed).

## Assignment Design

### Sort order (Entire Exam and within Selected Class)

1. `classes.grade_level` ascending; `NULL` last  
2. Class name alphabetical  
3. Section name (`class_academic_years.section_name` or equivalent) alphabetical; empty/null last or as empty string consistently  
4. Exam roll number if assigned (natural/numeric-aware if already used elsewhere; otherwise string sort)  
5. Student full name alphabetical  

### Numbering

- Start from user-provided **Start From** (numeric increment as today).
- For each student in sorted order:
  - If student has existing secret and **Override** is off → skip (do not increment reserved slots).
  - Else assign next number and increment.
- Selected Class: same rules, filtered to that `exam_class_id`.

### Preview API / UI

- Keep per-student preview rows (current, new, override, collision).
- Add `class_ranges` (or equivalent) summary, e.g.:

```json
{
  "class_ranges": [
    {
      "class_name": "Grade 1",
      "section": "A",
      "start": "1000",
      "end": "1025",
      "count": 26
    }
  ]
}
```

- Ranges computed from the preview items that will receive new numbers (after skip/override logic).
- Frontend preview dialog shows this summary above the student table.
- Update Entire Exam description copy to explain continuous-by-grade/class/section behavior (EN/PS/FA/AR).

### Confirm

- Unchanged: client sends confirmed `exam_student_id` + `new_secret_number` items from preview.
- Sort correctness is enforced by preview generation; confirm applies the chosen items.

## Printing Design

### Label expansion (`GET .../reports/secret-labels`)

For each exam student with a non-null secret number:

- If `subject_id` / exam-subject filter is set → one label for that subject (current single-subject behavior).
- If no subject filter → one label for **each** non-deleted `exam_subject` on that student’s exam class.

Each label includes:

- `exam_secret_number` (same for all subjects of that student)
- Class name + section
- Subject name
- Subject exam date when available (from `exam_times` / scheduled_at as today)
- Barcode/QR as today

### Frontend (Number Reports)

- Default print path remains “all subjects” for the selected exam/class filter.
- Display `total_labels` from API (post-expansion count).
- No new toggle required.

## Technical Touchpoints

| Area | Files (expected) |
|------|------------------|
| Preview/sort | `backend/app/Http/Controllers/ExamNumberController.php` (`previewSecretNumberAssignment`) |
| Labels | Same controller (`secretLabelsHtml`), `backend/resources/views/reports/secret-labels.blade.php` (if needed for field display only) |
| Assign UI | `frontend/src/pages/ExamSecretNumbersPage.tsx` |
| Reports UI | `frontend/src/pages/ExamNumberReportsPage.tsx` |
| Hooks/types | `frontend/src/hooks/useExamNumbers*`, domain/API types for preview response |
| i18n | `frontend/src/lib/translations/pages/exams/exams.{en,ps,fa,ar}.ts` (+ types/keys as required) |
| Tests | PHPUnit feature tests for sort continuity, skip-without-override, label expansion count |

Eager-load `examClass.classAcademicYear.class` (including `grade_level`) and section for sorting.

## Error Handling

- Existing permission, org/school isolation, and locked-exam checks remain.
- Collision flags in preview remain as today.
- Empty secret labels: keep warning when no students have secret numbers.
- Students with secret but zero exam subjects: contribute zero labels (or document if we emit a fallback — prefer zero labels with no subject rather than inventing a subject).

## Testing Plan

1. Entire Exam: two classes with grade levels and sections; verify contiguous ranges and continuation across sections.
2. Missing `grade_level`: falls back to class name then section.
3. Override off: existing secrets skipped; new numbers continue without reassigning them.
4. Selected Class: only that class numbered from Start From.
5. Labels unfiltered: N students × M subjects each → correct total; same secret on each subject label.
6. Labels with subject filter: one label per student for that subject.
7. Permissions unchanged.

## Decisions Log

| Topic | Decision |
|-------|----------|
| Approach | #1 — change Entire Exam default sort |
| Class order | grade_level → name → section |
| Student order within section | roll number if set, else name |
| Override | Keep checkbox A — skip existing when off |
| Labels | Always one per subject when unfiltered |
| Label content | Secret + subject + date when available |
| Wizard / reorder UI | Out of scope |
