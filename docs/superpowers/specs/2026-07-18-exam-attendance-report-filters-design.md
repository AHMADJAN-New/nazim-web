# Exam Attendance Report Filters + Hall Session Export

## Goal
Filter the Exam Attendance Report page like Mark Attendance (Hall vs By class), and make ZIP / combined exports respect those filters.

## Modes
- **Hall**: session picker (date + start time). Matrix/stats show all class–subjects in that sitting.
- **By class**: Class (`All` | one class) + Subject (`All` | subjects of selected class).

## Exports
1. **ZIP (PDF/Excel)** — one file per class–subject for current filter scope (+ `_summary`).
2. **Combined session report** — when Hall session selected: one PDF or Excel with all classes in that sitting.

## Parameters
- ZIP: `exam_id`, optional `exam_class_id`, `exam_subject_id`, `session_date`, `session_start_time`
- Session: `exam_id`, required `session_date`, `session_start_time`

## Report keys
- `exam_attendance_pdf_zip` / `exam_attendance_excel_zip` (existing, now filtered)
- `exam_attendance_session_pdf` / `exam_attendance_session_excel` (new)
