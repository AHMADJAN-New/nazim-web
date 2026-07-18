# Plan: Exam Attendance Report Filters + Session Export

## Files
- `backend/app/Services/Exams/ExamAttendanceReportService.php` — filter units; session combined report
- `backend/resources/views/reports/exam-attendance-session.blade.php` — session PDF
- `backend/app/Services/Reports/ReportService.php`, `GenerateReportJob.php`, `ReportGenerationController.php` — wire keys
- `frontend/src/pages/ExamAttendanceReportPage.tsx` — Hall / By class filters + exports
- i18n examReports keys (en/ps/fa/ar)

## Done when
- Filters change matrix + stats + ZIP scope
- Hall session: Session PDF/Excel combined file
- Tests pass for filter ZIP + session excel
