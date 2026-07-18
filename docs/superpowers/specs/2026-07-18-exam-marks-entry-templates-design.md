# Exam Marks Entry Paper Templates (ZIP)

**Date:** 2026-07-18  
**Status:** Approved for implementation  
**Approach:** Mirror attendance ZIP (Approach A)

## Goal

Teachers receive blank mark sheets (PDF/Excel ZIP) to fill by pen; clerk later enters marks into the system.

## UX

- Button on Exam Marks Entry opens a dialog.
- Select class(es), subject(s), ID mode (roll / secret / both), format (PDF ZIP / Excel ZIP).
- Async generation + progress dialog (same as attendance).

## Columns

| Mode | Columns |
|------|---------|
| Roll only | #, Roll, Name, Father, Marks (empty), Absent (empty) |
| Secret only | #, Secret, Marks (empty), Absent (empty) — no name/father |
| Both | #, Roll, Secret, Name, Father, Marks (empty), Absent (empty) |

## ZIP layout

```
{ExamName}/marks-entry/{Class}/{Section}/{Subject}/marks-entry.xlsx|pdf
```

## Backend

- Report keys: `exam_marks_entry_pdf_zip`, `exam_marks_entry_excel_zip`
- Service: `ExamMarksEntryReportService` (pattern of `ExamAttendanceReportService`)
- Permission: `exams.enter_marks`
