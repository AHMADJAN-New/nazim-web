# Exam Attendance Report ZIP Implementation Plan

> **For agentic workers:** Implement task-by-task. Spec: `docs/superpowers/specs/2026-07-18-exam-attendance-report-zip-design.md`

**Goal:** View exam attendance by class×subject and download PDF/Excel ZIPs (one file per class–subject).

**Approach:** Backend `ExamAttendanceReportService` + report keys via `POST /api/reports/generate` (same async ZIP pattern as roll slips).

## Tasks

1. Backend service: build class×subject rows + ZIP of PDF/Excel files + summary
2. Wire report keys into ReportGenerationController + GenerateReportJob
3. API: extend summary with `by_class_subject`; add detail endpoint
4. Frontend page + hub card + routes + hooks + i18n
5. Feature test for summary matrix + export permission/format

## Report keys

- `exam_attendance_pdf_zip` (report_type pdf)
- `exam_attendance_excel_zip` (report_type excel)
