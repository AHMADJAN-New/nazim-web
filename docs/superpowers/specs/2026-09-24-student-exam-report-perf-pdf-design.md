# Student Exam Report — Performance + PDF Export

**Date:** 2026-09-24  
**Status:** Approved (option A)

## Problem

1. `/exams/reports/student` loads all active admissions (~4MB) and all exam enrollments (~5MB), taking minutes.
2. Print uses `window.print()` (page snapshot), not a localized branded PDF like student history.

## Design

### Performance

- Stop calling `useStudentAdmissions` on this page.
- Load the student picker via `useExamStudentsWithNumbers(examId, examClassId)` only after a class is selected (lean payload).
- Enrich `GET /exams/{exam}/reports/students/{examStudentId}` with `father_name`, `birth_date`, `picture_path` so the on-screen card does not need the admissions dump.
- Optionally slim `GET /exam-students` eager loads (no full `exam` row) for other consumers.

### PDF export

- Replace Print with a server PDF download (ReportService + custom Blade), same pattern as student history.
- `POST /exams/{exam}/reports/students/export/pdf` with `exam_student_ids[]`, `language`, `calendar_preference`, `branding_id`.
- Multi-select → multi-page report cards in one PDF.
- Keep existing table Excel/PDF export (`ReportExportButtons`) as a separate summary export.

## Success criteria

- Opening the page does not fetch all admissions or all-exam students.
- Student list loads quickly after class selection (class-scoped lean API).
- Print downloads a branded, localized PDF with progress UI.
