# Exam Attendance Report (View + PDF/Excel ZIP)

**Date:** 2026-07-18  
**Status:** Approved for implementation  
**Approach:** Backend ZIP pack — one file per class–subject (Approach A)

## Problem

Schools need to view exam attendance across all classes and subjects, and download printable/exportable packs. Today export only exists on the marking page for a single timeslot. Exam Reports hub has no attendance entry.

## Goals

- Dedicated **Exam Attendance Report** page in Exam Reports hub
- On-screen: exam summary + class×subject matrix + drill-down student table
- Export: **PDF ZIP** and **Excel ZIP**, one file per **class–subject**
- Include unmarked enrolled students as “Not marked”
- Optional `_summary` file inside each ZIP
- Permission: `exams.view_attendance_reports`
- Multi-tenant: organization + school scoped
- Branding, calendar, language, RTL via existing report stack where practical

## Non-Goals

- Hall seating map layout in exports
- Per-student attendance report card (existing API can stay unused here)
- Client-side ZIP assembly
- Changing attendance marking UX

## UX

1. Hub card → `/exams/reports/attendance`
2. Select exam (auto latest from current year when none selected)
3. Summary cards + class×subject table (counts)
4. Row click → detail table for that class–subject
5. Buttons: Download PDF ZIP / Download Excel ZIP (async + progress dialog)

## File naming (ZIP entries)

Nested folders (same pattern as secret labels):

```
{ExamName}/
  _summary.{pdf|xlsx}
  attendance/
    {Class}/
      {Section}/          # "_" when section empty
        {Subject}/
          attendance.{pdf|xlsx}
```

Segment names are sanitized. Plus `_summary.{pdf|xlsx}` with matrix totals.

## Each class–subject file

Columns: #, Student, Father, Roll, Admission No, Status, Seat, Notes  
Header: exam, class, section, subject, date/time if available  
Footer totals: present / absent / late / excused / unmarked

## API

- Extend/use attendance summary with **by_class_subject** matrix
- `GET /api/exams/{exam}/attendance/report/detail?exam_class_id=&exam_subject_id=`
- `POST /api/exams/{exam}/attendance/report/export` body: `{ format: "pdf"|"excel" }` → report run / ZIP download

## Backend

New `ExamAttendanceReportService` mirroring ZIP patterns in `ExamNumberReportService` (store via FileStorageService, progress callbacks).

## Frontend

- `ExamAttendanceReportPage.tsx`
- Hub card + route + lazy load
- Hooks/API client methods
- i18n en/ps/fa/ar
