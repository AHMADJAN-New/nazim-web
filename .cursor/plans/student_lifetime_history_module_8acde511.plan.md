---
name: Student Lifetime History Module
overview: Design and implement a comprehensive Student Lifetime History module that aggregates all academic, administrative, and extracurricular data for a single student into a unified, chronological view accessible via a dedicated page and action button in the Students table.
todos:
  - id: backend-service
    content: Create StudentHistoryService with data aggregation methods for all sections (admissions, attendance, exams, fees, library, ID cards, courses, graduations, transfers)
    status: completed
  - id: backend-controller
    content: Create StudentHistoryController with index(), exportPdf(), and exportExcel() methods
    status: completed
    dependencies:
      - backend-service
  - id: backend-routes
    content: Add API routes for student history endpoints in routes/api.php
    status: completed
    dependencies:
      - backend-controller
  - id: backend-audit-log
    content: Create migration and model for student_history_audit_logs table
    status: completed
  - id: backend-report-template
    content: Create Blade template for PDF export (student_history.blade.php) with all sections
    status: completed
    dependencies:
      - backend-service
  - id: frontend-types
    content: Create API and Domain types for student history data structures
    status: completed
  - id: frontend-mapper
    content: Create studentHistoryMapper.ts for API to Domain conversion
    status: completed
    dependencies:
      - frontend-types
  - id: frontend-hook
    content: Create useStudentHistory hook with TanStack Query for data fetching and export functions
    status: completed
    dependencies:
      - frontend-types
      - frontend-mapper
  - id: frontend-summary-cards
    content: Create HistorySummaryCards component displaying key metrics (academic years, attendance rate, exam average, fees, etc.)
    status: completed
    dependencies:
      - frontend-hook
  - id: frontend-timeline
    content: Create StudentHistoryTimeline component with chronological view, event cards, filters, and academic year groupings
    status: completed
    dependencies:
      - frontend-hook
  - id: frontend-tabs
    content: Create StudentHistoryTabs component with section-specific tabs (Admissions, Attendance, Exams, Library, Fees, ID Cards, Courses, Graduations)
    status: completed
    dependencies:
      - frontend-hook
  - id: frontend-section-components
    content: Create individual section components (AdmissionsSection, AttendanceSection, ExamsSection, LibrarySection, FeesSection, IdCardsSection, CoursesSection, GraduationsSection)
    status: completed
    dependencies:
      - frontend-tabs
  - id: frontend-charts
    content: Create HistoryCharts component with attendance trend, academic performance, and fee timeline visualizations
    status: completed
    dependencies:
      - frontend-hook
  - id: frontend-main-page
    content: Create StudentHistoryPage component integrating all sections, timeline/tabbed views, and export buttons
    status: completed
    dependencies:
      - frontend-summary-cards
      - frontend-timeline
      - frontend-tabs
      - frontend-charts
  - id: frontend-route
    content: Add route to App.tsx for /students/:studentId/history
    status: completed
    dependencies:
      - frontend-main-page
  - id: frontend-action-button
    content: Add 'View History' action button to Students table Actions column
    status: completed
    dependencies:
      - frontend-route
  - id: frontend-translations
    content: Add translation keys for all student history UI text in all four languages (en, ps, fa, ar)
    status: completed
  - id: database-indexes
    content: Create database indexes for performance optimization (student_id + organization_id + date columns)
    status: completed
  - id: testing
    content: Write unit tests for StudentHistoryService and integration tests for API endpoints
    status: pending
    dependencies:
      - backend-service
      - backend-controller
---

# Student

Lifetime History Module - Implementation Plan

## Overview

A comprehensive Student Lifetime History module that serves as a single source of truth for a student's entire lifecycle in the school system. The module aggregates data from multiple sources (admissions, attendance, exams, fees, library, ID cards, courses, etc.) and presents it in a clear, chronological, and well-structured interface.

## Architecture & Data Model Strategy

### Data Aggregation Approach

The system will use a **hybrid approach** combining:

1. **Direct database queries** for real-time data (current academic year, recent records)
2. **Cached aggregated data** for historical records (older academic years)
3. **Lazy loading** for sections that require heavy computation

### Backend API Endpoint

**New Endpoint**: `GET /api/students/{studentId}/history`**Response Structure**:

```typescript
interface StudentHistoryResponse {
  student: StudentBasicInfo;
  summary: HistorySummary;
  timeline: HistoryEvent[];
  sections: {
    admissions: AdmissionRecord[];
    classAssignments: ClassAssignmentRecord[];
    attendance: AttendanceSummary;
    exams: ExamRecord[];
    library: LibraryLoanRecord[];
    fees: FeeTransactionRecord[];
    idCards: IdCardRecord[];
    courses: CourseRecord[];
    graduations: GraduationRecord[];
    transfers: TransferRecord[];
  };
  metadata: {
    generatedAt: string;
    academicYears: AcademicYear[];
    totalRecords: number;
  };
}
```



### Database Query Strategy

**Performance Optimization**:

- Use **indexed queries** on `student_id`, `organization_id`, `school_id`, and date columns
- Implement **pagination** for large datasets (e.g., attendance records)
- Use **materialized views** or **cached aggregations** for frequently accessed historical summaries
- **Batch load relationships** using Laravel's eager loading to prevent N+1 queries

**Query Pattern**:

```php
// Example: Aggregating attendance data
$attendanceSummary = DB::table('attendance_records')
    ->join('attendance_sessions', 'attendance_records.attendance_session_id', '=', 'attendance_sessions.id')
    ->where('attendance_records.student_id', $studentId)
    ->where('attendance_records.organization_id', $organizationId)
    ->whereNull('attendance_records.deleted_at')
    ->selectRaw('
        COUNT(*) as total_records,
        SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent_count,
        MIN(session_date) as first_record_date,
        MAX(session_date) as last_record_date
    ')
    ->groupBy('attendance_records.student_id')
    ->first();
```



### Data Sources Mapping

| Section | Source Tables | Key Fields ||---------|--------------|------------|| **Admissions** | `student_admissions` | `admission_date`, `enrollment_status`, `class_id`, `academic_year_id` || **Class Assignments** | `student_admissions` + `class_academic_years` | `roll_number`, `section_name`, `academic_year_id` || **Attendance** | `attendance_records` + `attendance_sessions` | `session_date`, `status`, `marked_at` || **Exams** | `exam_students` + `exams` + `exam_results` | `exam_id`, `marks`, `grade`, `rank` || **Library** | `library_loans` | `loan_date`, `due_date`, `returned_at`, `book_id` || **Fees** | `fee_assignments` + `fee_payments` + `fee_exceptions` | `amount`, `paid_amount`, `discount`, `fine`, `payment_date` || **ID Cards** | `student_id_cards` | `card_number`, `issued_at`, `is_printed`, `re_issued_at` || **Courses** | `course_students` + `short_term_courses` | `registration_date`, `completion_status`, `certificate_issued` || **Graduations** | `graduation_students` + `graduation_batches` | `graduation_date`, `batch_name` || **Transfers** | `student_admissions` (status changes) | `enrollment_status`, `updated_at` |

## Page Layout & UX Flow

### Component Structure

**Main Component**: `frontend/src/pages/students/StudentHistoryPage.tsx`**Route**: `/students/:studentId/history`

### Layout Design

```javascript
┌─────────────────────────────────────────────────────────────┐
│  Student Header (Photo, Name, Admission #, Current Status)   │
├─────────────────────────────────────────────────────────────┤
│  Quick Summary Cards (4-6 key metrics)                       │
├─────────────────────────────────────────────────────────────┤
│  [Timeline View] [Tabbed View] [Export]                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Content Area (Timeline or Tabs)                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```



### Section Organization

**Option 1: Timeline View (Default)**

- Chronological vertical timeline showing all events
- Color-coded by event type (admission=blue, exam=green, fee=orange, etc.)
- Grouped by academic year with collapsible sections
- Interactive: Click event to see details

**Option 2: Tabbed View**

- Tabs: Overview | Admissions | Attendance | Exams | Library | Fees | ID Cards | Courses | Graduations
- Each tab shows filtered, section-specific data
- Summary statistics at top of each tab

### Quick Summary Cards

Display 4-6 key metrics at the top:

1. **Total Academic Years** - Number of years enrolled
2. **Current Class** - Current class and section
3. **Attendance Rate** - Overall attendance percentage
4. **Average Exam Score** - Weighted average across all exams
5. **Outstanding Fees** - Current fee balance
6. **Library Books** - Currently borrowed books count

### Timeline Component

**File**: `frontend/src/components/students/StudentHistoryTimeline.tsx`**Features**:

- Vertical timeline with academic year groupings
- Event cards showing: date, type, description, status badge
- Expandable details on click
- Filter by event type (checkbox filters)
- Search within timeline
- Smooth scrolling to specific dates

**Event Types**:

- 🎓 Admission/Enrollment
- 📚 Class Assignment
- ✅ Attendance Record (daily, with summary badges)
- 📝 Exam Result
- 📖 Library Loan/Return
- 💰 Fee Payment/Discount
- 🆔 ID Card Issue/Re-issue
- 🎓 Course Registration/Completion
- 🎓 Graduation
- 🔄 Transfer/Promotion

## Visualizations & UI Components

### Charts & Graphs

1. **Attendance Trend Chart** (Line chart)

- X-axis: Months/Years
- Y-axis: Attendance percentage
- Show present/absent/late trends over time

2. **Academic Performance Chart** (Line/Bar chart)

- X-axis: Exams (chronological)
- Y-axis: Marks/Grades
- Show grade progression over time
- Include class average line for comparison

3. **Fee Payment Timeline** (Gantt-like chart)

- Show fee assignments, payments, and due dates
- Color-coded by payment status (paid/partial/overdue)

4. **Library Activity Chart** (Bar chart)

- Books borrowed per month
- Return compliance rate

### Status Indicators & Badges

- **Academic Status**: Active | Graduated | Transferred | Withdrawn
- **Fee Status**: Paid | Partial | Overdue | Exempt
- **Attendance Status**: Excellent (>95%) | Good (85-95%) | Fair (75-85%) | Poor (<75%)
- **Library Status**: Good Standing | Overdue Books | Restricted

### Progress Indicators

- **Academic Progress**: Visual progress bar showing years completed vs. total program duration
- **Fee Payment Progress**: Circular progress for current academic year fees
- **Course Completion**: Progress bars for enrolled courses

## Access Control & Permissions

### Permission Requirements

**Required Permission**: `students.read` (already exists)**Additional Checks**:

- User must have access to student's organization (`organization_id` match)
- User must have access to student's school (`school_id` match, if school-scoped)
- Backend validates all data access server-side

### Route Protection

**Frontend**: Protected by existing `ProtectedRoute` component**Backend**: Protected by `auth:sanctum` + `EnsureOrganizationAccess` middleware

### Audit Logging

**Track**:

- Who viewed the history (user_id, timestamp)
- Which sections were accessed
- Export actions (PDF/Excel generation)
- Data modifications (if any edit capabilities added later)

**Table**: `student_history_audit_logs` (new table)

```sql
CREATE TABLE student_history_audit_logs (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50), -- 'view', 'export_pdf', 'export_excel'
    section VARCHAR(50), -- 'overview', 'admissions', 'exams', etc.
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP
);
```



## Export & Compliance Features

### PDF Export

**Implementation**: Use existing `ReportService` (see `backend/docs/REPORTING_SYSTEM.md`)**Report Structure**:

- Cover page with student photo and basic info
- Executive summary (key metrics)
- Detailed sections (one per page or section)
- Appendices (supporting documents list)

**Report Key**: `student_lifetime_history`**Template**: Custom Blade template `resources/views/reports/student_history.blade.php`**Features**:

- School branding (logos, colors)
- Calendar preference (Gregorian/Jalali/Qamari)
- Language support (English/Pashto/Farsi/Arabic)
- Page numbers
- Generation date/time
- Watermark (optional, for sensitive data)

### Excel Export

**Implementation**: Use `ExcelReportService` (PhpSpreadsheet)**Structure**:

- **Sheet 1**: Overview & Summary
- **Sheet 2**: Admissions History
- **Sheet 3**: Class Assignments
- **Sheet 4**: Attendance Records
- **Sheet 5**: Exam Results
- **Sheet 6**: Library Loans
- **Sheet 7**: Fee Transactions
- **Sheet 8**: ID Card History
- **Sheet 9**: Course Registrations
- **Sheet 10**: Graduations & Transfers

**Features**:

- Formatted headers with school branding colors
- Data validation (dropdowns for status fields)
- Conditional formatting (highlight overdue fees, low attendance)
- Charts embedded in summary sheet
- Freeze panes for easy navigation

### Export Triggers

**Location**: Top-right of Student History page**Buttons**:

- "Export PDF" - Generates comprehensive PDF report
- "Export Excel" - Generates multi-sheet Excel file
- "Export Summary" - Quick 1-page PDF summary

**Progress**: Use existing `ReportProgressDialog` component for async exports

## Performance Considerations

### Data Loading Strategy

1. **Initial Load**: Load summary and recent data only (last 2 academic years)
2. **Lazy Load Sections**: Load detailed sections on tab click or scroll
3. **Pagination**: Paginate large datasets (attendance records, fee transactions)
4. **Virtual Scrolling**: Use virtual scrolling for timeline view (react-window or similar)

### Caching Strategy

**Backend Caching**:

- Cache student history summary for 1 hour (Redis/Memcached)
- Cache key: `student_history:{student_id}:{organization_id}:summary`
- Invalidate on data updates (admission change, fee payment, etc.)

**Frontend Caching**:

- Use TanStack Query with `staleTime: 5 * 60 * 1000` (5 minutes)
- Cache key: `['student-history', studentId, organizationId]`
- Refetch on window focus: `false` (prevent unnecessary refetches)

### Database Optimization

**Indexes Required**:

```sql
-- Student history queries will filter by student_id + organization_id + date ranges
CREATE INDEX idx_attendance_records_student_date ON attendance_records(student_id, organization_id, session_date);
CREATE INDEX idx_exam_results_student_exam ON exam_results(student_id, exam_id);
CREATE INDEX idx_fee_payments_student_date ON fee_payments(student_id, payment_date);
CREATE INDEX idx_library_loans_student_date ON library_loans(student_id, loan_date);
```

**Query Optimization**:

- Use `SELECT` only required columns (avoid `SELECT *`)
- Use `LIMIT` and `OFFSET` for pagination
- Use `EXPLAIN` to analyze query plans
- Consider materialized views for complex aggregations

### Large Dataset Handling

**For students with 10+ years of data**:

- Implement **date range filters** (default: last 3 years, option to expand)
- **Progressive loading**: Load older data on "Load More" click
- **Summary mode**: Show aggregated summaries for older academic years (not daily records)
- **Background processing**: Generate exports asynchronously (queue jobs)

## Implementation Files

### Backend Files

1. **Controller**: `backend/app/Http/Controllers/StudentHistoryController.php`

- `index($studentId)` - Main history endpoint
- `exportPdf($studentId)` - PDF export
- `exportExcel($studentId)` - Excel export

2. **Service**: `backend/app/Services/StudentHistoryService.php`

- `getStudentHistory($studentId, $organizationId, $filters)` - Aggregate all data
- `getAdmissionsHistory($studentId)` - Admissions records
- `getAttendanceSummary($studentId, $dateRange)` - Attendance aggregation
- `getExamHistory($studentId)` - Exam results
- `getFeeHistory($studentId)` - Fee transactions
- `getLibraryHistory($studentId)` - Library loans
- `getIdCardHistory($studentId)` - ID card records
- `getCourseHistory($studentId)` - Course registrations
- `getGraduationHistory($studentId)` - Graduations
- `getTransferHistory($studentId)` - Transfers/promotions

3. **Migration**: `backend/database/migrations/YYYY_MM_DD_HHMMSS_create_student_history_audit_logs_table.php`
4. **Model**: `backend/app/Models/StudentHistoryAuditLog.php`
5. **Report Template**: `backend/resources/views/reports/student_history.blade.php`
6. **Route**: Add to `backend/routes/api.php`:
   ```php
            Route::get('/students/{student}/history', [StudentHistoryController::class, 'index']);
            Route::post('/students/{student}/history/export/pdf', [StudentHistoryController::class, 'exportPdf']);
            Route::post('/students/{student}/history/export/excel', [StudentHistoryController::class, 'exportExcel']);
   ```




### Frontend Files

1. **Page Component**: `frontend/src/pages/students/StudentHistoryPage.tsx`

- Main page component with routing
- Integrates all sections and views

2. **Timeline Component**: `frontend/src/components/students/StudentHistoryTimeline.tsx`

- Chronological timeline view
- Event cards and filters

3. **Tabbed View Component**: `frontend/src/components/students/StudentHistoryTabs.tsx`

- Tabbed interface for sectioned view
- Individual section components

4. **Section Components**:

- `frontend/src/components/students/history/AdmissionsSection.tsx`
- `frontend/src/components/students/history/AttendanceSection.tsx`
- `frontend/src/components/students/history/ExamsSection.tsx`
- `frontend/src/components/students/history/LibrarySection.tsx`
- `frontend/src/components/students/history/FeesSection.tsx`
- `frontend/src/components/students/history/IdCardsSection.tsx`
- `frontend/src/components/students/history/CoursesSection.tsx`
- `frontend/src/components/students/history/GraduationsSection.tsx`

5. **Summary Cards**: `frontend/src/components/students/history/HistorySummaryCards.tsx`

- Quick metrics display

6. **Charts**: `frontend/src/components/students/history/HistoryCharts.tsx`

- Attendance trend
- Academic performance
- Fee timeline

7. **Hook**: `frontend/src/hooks/useStudentHistory.tsx`

- Data fetching with TanStack Query
- Export functions

8. **Types**: 

- `frontend/src/types/api/studentHistory.ts` - API response types
- `frontend/src/types/domain/studentHistory.ts` - Domain types

9. **Mapper**: `frontend/src/mappers/studentHistoryMapper.ts`

- API to Domain conversion

10. **Route**: Add to `frontend/src/App.tsx`:
    ```typescript
                <Route path="/students/:studentId/history" element={<StudentHistoryPage />} />
    ```




11. **Action Button**: Add to `frontend/src/pages/Students.tsx` Actions column:
    ```typescript
                <DropdownMenuItem onClick={() => navigate(`/students/${student.id}/history`)}>
                  <History className="mr-2 h-4 w-4" />
                  {t('students.viewHistory') || 'View History'}
                </DropdownMenuItem>
    ```




## Translation Keys

Add to `frontend/src/lib/translations/types.ts`:

```typescript
students: {
  // ... existing keys ...
  viewHistory: string;
  studentHistory: string;
  lifetimeHistory: string;
  historySummary: string;
  admissionsHistory: string;
  classAssignments: string;
  attendanceHistory: string;
  examHistory: string;
  libraryHistory: string;
  feeHistory: string;
  idCardHistory: string;
  courseHistory: string;
  graduationHistory: string;
  transferHistory: string;
  exportHistory: string;
  exportSummary: string;
  // ... more keys ...
}
```



## Testing Strategy

1. **Unit Tests**: Test data aggregation logic in `StudentHistoryService`
2. **Integration Tests**: Test API endpoints with various student data scenarios
3. **Performance Tests**: Test with students having 10+ years of data
4. **UI Tests**: Test timeline and tabbed views, export functionality

## Future Enhancements

1. **Comparison Mode**: Compare two students side-by-side
2. **Predictive Analytics**: Predict graduation date, fee payment likelihood
3. **Alerts**: Notify on attendance drops, fee overdue, etc.
4. **Parent Portal**: Limited view for parents (their child's history only)
5. **Mobile App**: Native mobile view for quick access

## Success Metrics

- Page load time < 2 seconds for students with 5 years of data