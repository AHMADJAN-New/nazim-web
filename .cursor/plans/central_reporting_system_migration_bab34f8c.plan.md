---
name: Central Reporting System Migration
overview: Migrate all existing reports to use the central reporting system (ReportService), implement missing backend reports, and enhance all reports with better features including branding, calendar support, and multi-language support.
todos:
  - id: phase1_student
    content: "Migrate Student Reports (StudentReportController, StudentReport.tsx, StudentAdmissionsReport.tsx) to use ReportService with report_key: student_list and student_admissions"
    status: pending
  - id: phase1_staff
    content: "Migrate Staff Reports (StaffReportController, StaffReport.tsx) to use ReportService with report_key: staff_list"
    status: pending
  - id: phase1_finance
    content: "Migrate Finance Reports (FinanceReportController - 6 methods, FinanceReports.tsx) to use ReportService with report_keys: finance_dashboard, finance_daily_cashbook, finance_income_vs_expense, finance_project_summary, finance_donor_summary, finance_account_balances"
    status: pending
  - id: phase1_fee
    content: "Migrate Fee Reports (FeeReportController - 4 methods, FeeReportsPage.tsx) to use ReportService with report_keys: fee_dashboard, fee_student_fees, fee_collection, fee_defaulters"
    status: pending
  - id: phase1_attendance
    content: "Migrate Attendance Reports (AttendanceSessionController, AttendanceReports.tsx, AttendanceTotalsReports.tsx) to use ReportService with report_keys: attendance_daily, attendance_monthly, attendance_totals, attendance_trends"
    status: pending
  - id: phase2_exam
    content: "Migrate Exam Reports (ExamReportController - 6 methods, all exam report pages) to use ReportService with report_keys: exam_overview, exam_summary, exam_class_marksheet, exam_student_report, exam_consolidated_marksheet, exam_class_subject_marksheet"
    status: pending
  - id: phase3_library
    content: Create LibraryReportController with 5 report methods (inventory, circulation, overdue, category_distribution, popular_books) and update LibraryReports.tsx
    status: pending
  - id: phase3_leave
    content: Create LeaveReportController with 4 report methods (requests_summary, balance, trends, approval_status) and update LeaveReports.tsx
    status: pending
  - id: phase3_asset
    content: Create AssetReportController with 5 report methods (inventory, assignments, maintenance, depreciation, category_summary) and update AssetReports.tsx
    status: pending
  - id: phase3_hostel
    content: Create HostelReportController with 4 report methods (occupancy, boarders, fees, maintenance) and update HostelReports.tsx
    status: pending
  - id: phase3_course
    content: Create CourseReportController with 4 report methods (enrollment, attendance, completion, certificates) and update CourseStudentReports.tsx
    status: pending
  - id: phase4_class
    content: Create ClassReportController and ClassReports.tsx page with 4 report types (list, performance, subject_assignments, timetable)
    status: pending
  - id: phase4_subject
    content: Create SubjectReportController and SubjectReports.tsx page with 4 report types (list, class_assignments, teacher_assignments, performance)
    status: pending
  - id: phase4_timetable
    content: Create TimetableReportController and TimetableReports.tsx page with 4 report types (class, teacher, room, conflicts)
    status: pending
  - id: phase4_certificate
    content: Create CertificateReportController and CertificateReports.tsx page with 3 report types (issued, templates, verification)
    status: pending
  - id: phase4_idcard
    content: Create IdCardReportController and IdCardReports.tsx page with 3 report types (assignments, status, printing_queue)
    status: pending
  - id: phase5_frontend
    content: Update all report pages to use useServerReport hook, add report template selection, branding selection, calendar preference, language selector, format selector, and progress dialog
    status: pending
    dependencies:
      - phase1_student
      - phase1_staff
      - phase1_finance
      - phase1_fee
      - phase1_attendance
      - phase2_exam
  - id: phase5_components
    content: "Create shared report components: ReportFilters.tsx, ReportOptions.tsx, ReportPreview.tsx"
    status: pending
  - id: phase6_permissions
    content: Add report permissions to PermissionSeeder for all report keys (reports.{report_key}.generate)
    status: pending
  - id: phase6_templates
    content: Update ReportTemplatesManagement.tsx to include all new report keys as template types
    status: pending
  - id: phase6_testing
    content: "Test all reports: unit tests, integration tests, permission tests, format tests (PDF/Excel), calendar tests, language tests, branding tests"
    status: pending
    dependencies:
      - phase5_frontend
      - phase5_components
---

# Central Reporting System Migration Plan

## Overview

This plan migrates all existing reports to use the central reporting system (`ReportService`), implements missing backend reports, and enhances all reports with consistent features including branding, calendar preferences, and multi-language support.

## Current State Analysis

### Reports Using Central System

- None (only example in docs)

### Reports Using Old/Custom Systems

- Student Reports (`StudentReportController`)
- Staff Reports (`StaffReportController`)
- Exam Reports (`ExamReportController` - 6 methods)
- Finance Reports (`FinanceReportController` - 6 methods)
- Fee Reports (`FeeReportController` - 4 methods)
- Attendance Reports (`AttendanceSessionController`)

### Reports Missing Backend

- Library Reports (frontend only)
- Leave Reports (frontend only)
- Course Student Reports (frontend only)
- Asset Reports (frontend only)
- Hostel Reports (frontend only)

## Migration Strategy

### Phase 1: Core Report Migration (Student, Staff, Finance, Fee, Attendance)

#### 1.1 Student Reports Migration

**Files to Modify:**

- `backend/app/Http/Controllers/StudentReportController.php` - Replace export method
- `frontend/src/pages/StudentReport.tsx` - Update to use `useServerReport`
- `frontend/src/pages/StudentAdmissionsReport.tsx` - Update to use `useServerReport`

**Changes:**

- Replace `StudentReportController@export` to use `ReportService`
- Add `report_key: 'student_list'` and `report_key: 'student_admissions'`
- Format dates using `DateConversionService`
- Add branding support
- Support PDF and Excel formats
- Add calendar preference and language options

#### 1.2 Staff Reports Migration

**Files to Modify:**

- `backend/app/Http/Controllers/StaffReportController.php` - Replace export method
- `frontend/src/pages/StaffReport.tsx` - Update to use `useServerReport`

**Changes:**

- Replace `StaffReportController@export` to use `ReportService`
- Add `report_key: 'staff_list'`
- Format dates using `DateConversionService`
- Add branding support

#### 1.3 Finance Reports Migration

**Files to Modify:**

- `backend/app/Http/Controllers/FinanceReportController.php` - Migrate all 6 methods
- `frontend/src/pages/finance/FinanceReports.tsx` - Update all report generations

**Report Keys to Add:**

- `finance_dashboard`
- `finance_daily_cashbook`
- `finance_income_vs_expense`
- `finance_project_summary`
- `finance_donor_summary`
- `finance_account_balances`

**Changes:**

- Convert all methods to use `ReportService`
- Format currency amounts properly
- Add date formatting with calendar support
- Support PDF and Excel for all reports

#### 1.4 Fee Reports Migration

**Files to Modify:**

- `backend/app/Http/Controllers/Fees/FeeReportController.php` - Migrate all 4 methods
- `frontend/src/pages/fees/FeeReportsPage.tsx` - Update all report generations

**Report Keys to Add:**

- `fee_dashboard`
- `fee_student_fees`
- `fee_collection`
- `fee_defaulters`

**Changes:**

- Convert all methods to use `ReportService`
- Format currency and dates properly
- Add branding support

#### 1.5 Attendance Reports Migration

**Files to Modify:**

- `backend/app/Http/Controllers/AttendanceSessionController.php` - Migrate report methods
- `frontend/src/pages/AttendanceReports.tsx` - Update to use `useServerReport`
- `frontend/src/pages/AttendanceTotalsReports.tsx` - Update to use `useServerReport`

**Report Keys to Add:**

- `attendance_daily`
- `attendance_monthly`
- `attendance_totals`
- `attendance_trends`

**Changes:**

- Convert report methods to use `ReportService`
- Format dates with calendar support
- Add summary statistics

### Phase 2: Exam Reports Migration

#### 2.1 Exam Reports Migration

**Files to Modify:**

- `backend/app/Http/Controllers/ExamReportController.php` - Migrate all 6 methods
- `frontend/src/pages/ExamReportsPage.tsx` - Update to use `useServerReport`
- `frontend/src/pages/ExamReportsHub.tsx` - Update to use `useServerReport`
- `frontend/src/pages/StudentExamReport.tsx` - Update to use `useServerReport`
- `frontend/src/pages/ConsolidatedMarkSheet.tsx` - Update to use `useServerReport`
- `frontend/src/pages/ClassSubjectMarkSheet.tsx` - Update to use `useServerReport`

**Report Keys to Add:**

- `exam_overview`
- `exam_summary`
- `exam_class_marksheet`
- `exam_student_report`
- `exam_consolidated_marksheet`
- `exam_class_subject_marksheet`

**Changes:**

- Convert all 6 methods to use `ReportService`
- Format dates and grades properly
- Add grade calculation display
- Support PDF export for mark sheets
- Add branding with school logos

### Phase 3: Missing Backend Reports Implementation

#### 3.1 Library Reports Backend

**Files to Create:**

- `backend/app/Http/Controllers/LibraryReportController.php`

**Report Keys to Add:**

- `library_inventory`
- `library_circulation`
- `library_overdue`
- `library_category_distribution`
- `library_popular_books`

**Implementation:**

- Create controller with methods for each report type
- Query `library_books`, `library_loans`, `library_copies` tables
- Format data for central reporting system
- Add date formatting and currency support

#### 3.2 Leave Reports Backend

**Files to Create:**

- `backend/app/Http/Controllers/LeaveReportController.php`

**Report Keys to Add:**

- `leave_requests_summary`
- `leave_balance`
- `leave_trends`
- `leave_approval_status`

**Implementation:**

- Create controller with methods for each report type
- Query `leave_requests` table
- Calculate leave balances
- Format dates with calendar support

#### 3.3 Asset Reports Backend

**Files to Create:**

- `backend/app/Http/Controllers/AssetReportController.php`

**Report Keys to Add:**

- `asset_inventory`
- `asset_assignments`
- `asset_maintenance`
- `asset_depreciation`
- `asset_category_summary`

**Implementation:**

- Create controller with methods for each report type
- Query `assets`, `asset_assignments`, `asset_maintenance` tables
- Format currency and dates
- Calculate depreciation if needed

#### 3.4 Hostel Reports Backend

**Files to Create:**

- `backend/app/Http/Controllers/HostelReportController.php`

**Report Keys to Add:**

- `hostel_occupancy`
- `hostel_boarders`
- `hostel_fees`
- `hostel_maintenance`

**Implementation:**

- Create controller with methods for each report type
- Query `hostels`, `hostel_rooms`, `student_admissions` tables
- Format dates and currency

#### 3.5 Course Student Reports Backend

**Files to Create:**

- `backend/app/Http/Controllers/CourseReportController.php`

**Report Keys to Add:**

- `course_enrollment`
- `course_attendance`
- `course_completion`
- `course_certificates`

**Implementation:**

- Create controller with methods for each report type
- Query `short_term_courses`, `course_students`, `course_attendance_sessions` tables
- Format dates and attendance data

### Phase 4: New Missing Reports Implementation

#### 4.1 Class Reports

**Files to Create:**

- `backend/app/Http/Controllers/ClassReportController.php`
- `frontend/src/pages/ClassReports.tsx`

**Report Keys to Add:**

- `class_list`
- `class_performance`
- `class_subject_assignments`
- `class_timetable`

#### 4.2 Subject Reports

**Files to Create:**

- `backend/app/Http/Controllers/SubjectReportController.php`
- `frontend/src/pages/SubjectReports.tsx`

**Report Keys to Add:**

- `subject_list`
- `subject_class_assignments`
- `subject_teacher_assignments`
- `subject_performance`

#### 4.3 Timetable Reports

**Files to Create:**

- `backend/app/Http/Controllers/TimetableReportController.php`
- `frontend/src/pages/TimetableReports.tsx`

**Report Keys to Add:**

- `timetable_class`
- `timetable_teacher`
- `timetable_room`
- `timetable_conflicts`

#### 4.4 Certificate Reports

**Files to Create:**

- `backend/app/Http/Controllers/CertificateReportController.php`
- `frontend/src/pages/CertificateReports.tsx`

**Report Keys to Add:**

- `certificates_issued`
- `certificate_templates`
- `certificate_verification`

#### 4.5 ID Card Reports

**Files to Create:**

- `backend/app/Http/Controllers/IdCardReportController.php`
- `frontend/src/pages/IdCardReports.tsx`

**Report Keys to Add:**

- `id_card_assignments`
- `id_card_status`
- `id_card_printing_queue`

### Phase 5: Frontend Updates

#### 5.1 Update All Report Pages

**Files to Update:**

- All report pages in `frontend/src/pages/`

**Changes:**

- Replace custom export logic with `useServerReport` hook
- Add report template selection
- Add branding selection
- Add calendar preference selector
- Add language selector
- Add format selector (PDF/Excel)
- Add async generation with progress dialog
- Add download functionality

#### 5.2 Create Shared Report Components

**Files to Create:**

- `frontend/src/components/reports/ReportFilters.tsx` - Common filter component
- `frontend/src/components/reports/ReportOptions.tsx` - Report options (format, branding, etc.)
- `frontend/src/components/reports/ReportPreview.tsx` - Preview component

### Phase 6: Enhancements

#### 6.1 Add Report Permissions

**Files to Update:**

- `backend/database/seeders/PermissionSeeder.php`

**Permissions to Add:**

- `reports.student_list.generate`
- `reports.staff_list.generate`
- `reports.finance.*.generate`
- `reports.fee.*.generate`
- `reports.attendance.*.generate`
- `reports.exam.*.generate`
- `reports.library.*.generate`
- `reports.leave.*.generate`
- `reports.asset.*.generate`
- `reports.hostel.*.generate`
- And all other report keys

#### 6.2 Update Report Templates

**Files to Update:**

- `frontend/src/components/settings/ReportTemplatesManagement.tsx`

**Template Types to Add:**

- All new report keys as template types
- Update validation to include all report keys

#### 6.3 Add Report History/Logging

**Files to Update:**

- `backend/app/Models/ReportRun.php` - Already exists, ensure all reports use it
- Add report history page in frontend

#### 6.4 Add Report Scheduling (Optional)

**Files to Create:**

- `backend/app/Models/ScheduledReport.php`
- `backend/app/Http/Controllers/ScheduledReportController.php`
- `frontend/src/pages/ScheduledReports.tsx`

## Implementation Details

### Backend Pattern for All Reports

```php
public function generateReport(Request $request)
{
    // 1. Validate user and permissions
    $user = $request->user();
    $profile = DB::table('profiles')->where('id', $user->id)->first();
    
    if (!$profile || !$profile->organization_id) {
        return response()->json(['error' => 'User must be assigned to an organization'], 403);
    }
    
    // 2. Check permission
    if (!$user->hasPermissionTo('reports.{report_key}.generate')) {
        return response()->json(['error' => 'This action is unauthorized'], 403);
    }
    
    // 3. Validate request
    $validated = $request->validate([
        'filters' => 'nullable|array',
        'format' => 'nullable|in:pdf,excel',
        'branding_id' => 'nullable|uuid',
        'report_template_id' => 'nullable|uuid',
        'calendar_preference' => 'nullable|in:gregorian,jalali,qamari',
        'language' => 'nullable|in:en,ps,fa,ar',
    ]);
    
    // 4. Query data
    $data = $this->queryReportData($validated['filters'] ?? [], $profile->organization_id);
    
    // 5. Format dates using DateConversionService
    $dateService = app(DateConversionService::class);
    foreach ($data['rows'] as &$row) {
        if (!empty($row['date_field'])) {
            $row['date_field'] = $dateService->formatDate(
                $row['date_field'],
                $validated['calendar_preference'] ?? 'jalali',
                'full',
                $validated['language'] ?? 'ps'
            );
        }
    }
    
    // 6. Prepare columns and rows
    $columns = $this->getReportColumns($validated['language'] ?? 'ps');
    $rows = $this->formatRows($data['rows'], $columns);
    
    // 7. Generate report using ReportService
    $config = ReportConfig::fromArray([
        'report_key' => 'report_key_here',
        'report_type' => $validated['format'] ?? 'pdf',
        'branding_id' => $validated['branding_id'],
        'report_template_id' => $validated['report_template_id'],
        'title' => $this->getReportTitle($validated['language'] ?? 'ps'),
        'calendar_preference' => $validated['calendar_preference'] ?? 'jalali',
        'language' => $validated['language'] ?? 'ps',
    ]);
    
    $reportRun = $this->reportService->generateReport(
        $config,
        ['columns' => $columns, 'rows' => $rows],
        $profile->organization_id
    );
    
    // 8. Return response
    return response()->json([
        'success' => true,
        'report_id' => $reportRun->id,
        'status' => $reportRun->status,
        'download_url' => $reportRun->isCompleted() 
            ? url("/api/reports/{$reportRun->id}/download")
            : null,
    ]);
}
```



### Frontend Pattern for All Reports

```typescript
const { generateReport, status, progress, downloadUrl, isGenerating } = useServerReport();

const handleGenerate = async () => {
  await generateReport({
    reportKey: 'report_key_here',
    reportType: selectedFormat, // 'pdf' or 'excel'
    brandingId: selectedBrandingId,
    reportTemplateId: selectedTemplateId,
    title: reportTitle,
    calendarPreference: selectedCalendar,
    language: selectedLanguage,
    columns: reportColumns,
    rows: reportRows,
    async: true,
  });
};
```



## Testing Strategy

1. **Unit Tests**: Test each report controller method
2. **Integration Tests**: Test report generation end-to-end
3. **Permission Tests**: Verify permission checks work
4. **Format Tests**: Test both PDF and Excel generation
5. **Calendar Tests**: Test all calendar preferences
6. **Language Tests**: Test all language options
7. **Branding Tests**: Test with and without branding

## Migration Checklist

- [ ] Phase 1: Core Reports (Student, Staff, Finance, Fee, Attendance)
- [ ] Phase 2: Exam Reports
- [ ] Phase 3: Missing Backend Reports (Library, Leave, Asset, Hostel, Course)
- [ ] Phase 4: New Reports (Class, Subject, Timetable, Certificate, ID Card)
- [ ] Phase 5: Frontend Updates
- [ ] Phase 6: Enhancements (Permissions, Templates, History)
- [ ] Testing: All reports tested
- [ ] Documentation: Update API docs and user guides

## Estimated Effort

- Phase 1: 5-7 days
- Phase 2: 3-4 days
- Phase 3: 4-5 days
- Phase 4: 5-6 days
- Phase 5: 3-4 days
- Phase 6: 2-3 days
- **Total: 22-29 days**

## Risks and Mitigation

1. **Risk**: Breaking existing report functionality

- **Mitigation**: Test thoroughly before deployment, have rollback plan

2. **Risk**: Performance issues with large reports

- **Mitigation**: Use async generation, add pagination for very large datasets