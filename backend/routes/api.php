<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\BuildingController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\ClassController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\ClassSubjectController;
use App\Http\Controllers\ClassSubjectTemplateController;
use App\Http\Controllers\AcademicYearController;
use App\Http\Controllers\TimetableController;
use App\Http\Controllers\ScheduleSlotController;
use App\Http\Controllers\TeacherSubjectAssignmentController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Fees\FeeAssignmentController;
use App\Http\Controllers\Fees\FeeExceptionController;
use App\Http\Controllers\Fees\FeePaymentController;
use App\Http\Controllers\Fees\FeeReportController;
use App\Http\Controllers\Fees\FeeStructureController;
use App\Http\Controllers\SchoolBrandingController;
use App\Http\Controllers\StaffTypeController;
use App\Http\Controllers\ResidencyTypeController;
use App\Http\Controllers\StaffDocumentController;
use App\Http\Controllers\ReportTemplateController;
use App\Http\Controllers\StudentAdmissionController;
use App\Http\Controllers\StudentDocumentController;
use App\Http\Controllers\StudentEducationalHistoryController;
use App\Http\Controllers\StudentDisciplineRecordController;
use App\Http\Controllers\TeacherTimetablePreferenceController;
use App\Http\Controllers\StudentReportController;
use App\Http\Controllers\StaffReportController;
use App\Http\Controllers\HostelController;
use App\Http\Controllers\AttendanceSessionController;
use App\Http\Controllers\LibraryBookController;
use App\Http\Controllers\LibraryCategoryController;
use App\Http\Controllers\LibraryCopyController;
use App\Http\Controllers\LibraryLoanController;
use App\Http\Controllers\ShortTermCourseController;
use App\Http\Controllers\CourseStudentController;
use App\Http\Controllers\CourseStudentDisciplineRecordController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\AssetAssignmentController;
use App\Http\Controllers\AssetMaintenanceController;
use App\Http\Controllers\AssetCategoryController;
use App\Http\Controllers\CourseAttendanceSessionController;
use App\Http\Controllers\TranslationController;
use App\Http\Controllers\CourseDocumentController;
use App\Http\Controllers\CertificateTemplateController;
use App\Http\Controllers\IdCardTemplateController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExamController;
use App\Http\Controllers\ExamClassController;
use App\Http\Controllers\ExamSubjectController;
use App\Http\Controllers\ExamStudentController;
use App\Http\Controllers\ExamResultController;
use App\Http\Controllers\ExamReportController;
use App\Http\Controllers\ExamTimeController;
use App\Http\Controllers\ExamAttendanceController;
use App\Http\Controllers\ExamNumberController;
use App\Http\Controllers\ExamTypeController;
use App\Http\Controllers\ExamDocumentController;
use App\Http\Controllers\FinanceDocumentController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\GraduationBatchController;
use App\Http\Controllers\Certificates\IssuedCertificateController;
use App\Http\Controllers\Dms\ArchiveSearchController;
use App\Http\Controllers\Dms\DepartmentsController as DmsDepartmentsController;
use App\Http\Controllers\Dms\DocumentFilesController;
use App\Http\Controllers\Dms\DocumentReportsController;
use App\Http\Controllers\Dms\DocumentSettingsController;
use App\Http\Controllers\Dms\IncomingDocumentsController;
use App\Http\Controllers\Dms\LetterheadsController;
use App\Http\Controllers\Dms\LetterTemplatesController;
use App\Http\Controllers\Dms\LetterTypesController;
use App\Http\Controllers\Dms\OutgoingDocumentsController;
use App\Http\Controllers\StorageController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/leave-requests/scan/{token}', [LeaveRequestController::class, 'scanPublic']);

// Public certificate verification routes (rate limited)
use App\Http\Controllers\CertificateVerifyController;
Route::get('/verify/certificate/{hash}', [CertificateVerifyController::class, 'show'])
    ->middleware('throttle:60,1'); // 60 requests per minute for hash verification

// Certificate number search (stricter rate limiting for security)
Route::post('/verify/certificate/search', [CertificateVerifyController::class, 'search'])
    ->middleware('throttle:10,1'); // 10 requests per minute for searches (stricter)

// Public stats endpoints (for landing page)
// Note: These return aggregate counts across all organizations
// Consider protecting if aggregate data is sensitive
Route::get('/stats/students-count', [StatsController::class, 'studentsCount']);
Route::get('/stats/staff-count', [StatsController::class, 'staffCount']);

// Protected routes (organization context is mandatory everywhere)
Route::middleware(['auth:sanctum', 'organization'])->group(function () {
    // Storage routes (private file access)
    Route::get('/storage/download/{encodedPath}', [StorageController::class, 'download'])
        ->where('encodedPath', '.*')
        ->name('storage.download');
    Route::get('/storage/force-download/{encodedPath}', [StorageController::class, 'forceDownload'])
        ->where('encodedPath', '.*')
        ->name('storage.force-download');
    Route::get('/storage/info/{encodedPath}', [StorageController::class, 'info'])
        ->where('encodedPath', '.*')
        ->name('storage.info');
    // Auth routes
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    // Organizations (protected - all operations require authentication)
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::post('/organizations', [OrganizationController::class, 'store']);
    // IMPORTANT: More specific routes must come before parameterized routes
    Route::get('/organizations/accessible', [OrganizationController::class, 'accessible']);
    Route::get('/organizations/{id}/statistics', [OrganizationController::class, 'statistics']);
    Route::put('/organizations/{id}', [OrganizationController::class, 'update']);
    Route::patch('/organizations/{id}', [OrganizationController::class, 'update']);
    Route::delete('/organizations/{id}', [OrganizationController::class, 'destroy']);
    Route::get('/organizations/{id}', [OrganizationController::class, 'show']);

    // Profiles
    Route::apiResource('profiles', ProfileController::class);
    Route::get('/profiles/me', [ProfileController::class, 'me']);

    // Users (user management)
    Route::apiResource('users', UserController::class);
    Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);

    // Schools (school branding)
    Route::apiResource('schools', SchoolBrandingController::class);

    // Watermarks (for school branding)
    Route::get('/watermarks', [\App\Http\Controllers\WatermarkController::class, 'index']);
    Route::post('/watermarks', [\App\Http\Controllers\WatermarkController::class, 'store']);
    Route::get('/watermarks/{id}', [\App\Http\Controllers\WatermarkController::class, 'show']);
    Route::put('/watermarks/{id}', [\App\Http\Controllers\WatermarkController::class, 'update']);
    Route::patch('/watermarks/{id}', [\App\Http\Controllers\WatermarkController::class, 'update']);
    Route::delete('/watermarks/{id}', [\App\Http\Controllers\WatermarkController::class, 'destroy']);

    // Permissions
    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::post('/permissions', [PermissionController::class, 'store']);
    Route::put('/permissions/{id}', [PermissionController::class, 'update']);
    Route::delete('/permissions/{id}', [PermissionController::class, 'destroy']);
    Route::get('/permissions/user', [PermissionController::class, 'userPermissions']);
    Route::get('/permissions/user/{userId}', [PermissionController::class, 'userPermissionsForUser']);
    Route::get('/permissions/roles', [PermissionController::class, 'roles']);
    Route::get('/permissions/roles/{roleName}', [PermissionController::class, 'rolePermissions']);
    Route::post('/permissions/roles/assign', [PermissionController::class, 'assignPermissionToRole']);
    Route::post('/permissions/roles/remove', [PermissionController::class, 'removePermissionFromRole']);
    Route::get('/permissions/users/{userId}/roles', [PermissionController::class, 'userRoles']);
    Route::post('/permissions/users/assign-role', [PermissionController::class, 'assignRoleToUser']);
    Route::post('/permissions/users/remove-role', [PermissionController::class, 'removeRoleFromUser']);
    Route::post('/permissions/users/assign-permission', [PermissionController::class, 'assignPermissionToUser']);
    Route::post('/permissions/users/remove-permission', [PermissionController::class, 'removePermissionFromUser']);

    // Roles
    Route::apiResource('roles', RoleController::class);

    // Translations (no permission required - accessible to all authenticated users)
    Route::get('/translations', [TranslationController::class, 'index']);
    Route::post('/translations', [TranslationController::class, 'store']);

    // ============================================================
    // School-scoped routes
    // Rule: Everything is school-scoped except org/permissions/roles/schools.
    // ============================================================
    Route::middleware(['school.context'])->group(function () {

        // Buildings
        Route::apiResource('buildings', BuildingController::class);

        // Rooms
        Route::apiResource('rooms', RoomController::class);

        // Staff
        Route::get('/staff/stats', [StaffController::class, 'stats']);
        Route::get('/staff/report/export', [StaffReportController::class, 'export']);
        Route::post('/staff/{id}/picture', [StaffController::class, 'uploadPicture']);
        Route::post('/staff/{id}/document', [StaffController::class, 'uploadDocument']);
        Route::apiResource('staff', StaffController::class);

        // Staff Types
        Route::apiResource('staff-types', StaffTypeController::class);

        // Residency Types
        Route::apiResource('residency-types', ResidencyTypeController::class);

        // Report Templates
        Route::get('/report-templates/school/{schoolId}', [ReportTemplateController::class, 'bySchool']);
        Route::get('/report-templates/default', [ReportTemplateController::class, 'getDefault']);
        Route::apiResource('report-templates', ReportTemplateController::class);

        // Staff Documents
        Route::get('/staff/{id}/documents', [StaffDocumentController::class, 'index']);
        Route::post('/staff/{id}/documents', [StaffDocumentController::class, 'store']);
        Route::delete('/staff-documents/{id}', [StaffDocumentController::class, 'destroy']);

        // Students
        // IMPORTANT: More specific routes must come before parameterized routes
        Route::get('/students/stats', [StudentController::class, 'stats']);
        Route::get('/students/autocomplete', [StudentController::class, 'autocomplete']);
        Route::post('/students/check-duplicates', [StudentController::class, 'checkDuplicates']);
        // Picture routes must come before resource route to avoid conflicts
        Route::get('/students/{id}/picture', [StudentController::class, 'getPicture']);
        Route::post('/students/{id}/picture', [StudentController::class, 'uploadPicture']);
        Route::get('/students/report/export', [StudentReportController::class, 'export']);
        Route::apiResource('students', StudentController::class);

        // Student Documents
        Route::get('/students/{id}/documents', [StudentDocumentController::class, 'index']);
        Route::post('/students/{id}/documents', [StudentDocumentController::class, 'store']);
        Route::get('/student-documents/{id}/download', [StudentDocumentController::class, 'download']);
        Route::delete('/student-documents/{id}', [StudentDocumentController::class, 'destroy']);

        // Student Educational History
        Route::get('/students/{id}/educational-history', [StudentEducationalHistoryController::class, 'index']);
        Route::post('/students/{id}/educational-history', [StudentEducationalHistoryController::class, 'store']);
        Route::put('/student-educational-history/{id}', [StudentEducationalHistoryController::class, 'update']);
        Route::delete('/student-educational-history/{id}', [StudentEducationalHistoryController::class, 'destroy']);

        // Student Discipline Records
        Route::get('/students/{id}/discipline-records', [StudentDisciplineRecordController::class, 'index']);
        Route::post('/students/{id}/discipline-records', [StudentDisciplineRecordController::class, 'store']);
        Route::put('/student-discipline-records/{id}', [StudentDisciplineRecordController::class, 'update']);
        Route::delete('/student-discipline-records/{id}', [StudentDisciplineRecordController::class, 'destroy']);
        Route::post('/student-discipline-records/{id}/resolve', [StudentDisciplineRecordController::class, 'resolve']);

        // Student Admissions
        Route::get('/student-admissions/stats', [StudentAdmissionController::class, 'stats']);
        Route::get('/student-admissions/report', [StudentAdmissionController::class, 'report']);
        Route::post('/student-admissions/export', [StudentAdmissionController::class, 'export']);
        Route::post('/student-admissions/bulk-deactivate', [StudentAdmissionController::class, 'bulkDeactivate']);
        Route::post('/student-admissions/bulk-deactivate-by-student-ids', [StudentAdmissionController::class, 'bulkDeactivateByStudentIds']);
        Route::apiResource('student-admissions', StudentAdmissionController::class);

        // Hostel aggregation
        Route::get('/hostel/overview', [HostelController::class, 'overview']);

        // Classes - Specific routes must come BEFORE resource route to avoid route conflicts
        Route::get('/classes/academic-years', [ClassController::class, 'byAcademicYear']);
        Route::post('/classes/bulk-assign-sections', [ClassController::class, 'bulkAssignSections']);
        Route::post('/classes/copy-between-years', [ClassController::class, 'copyBetweenYears']);
        Route::get('/class-academic-years/{id}', [ClassController::class, 'getClassAcademicYear']);
        Route::put('/classes/academic-years/{id}', [ClassController::class, 'updateInstance']);
        Route::delete('/classes/academic-years/{id}', [ClassController::class, 'removeFromYear']);
        Route::get('/classes/{class}/academic-years', [ClassController::class, 'academicYears']);
        Route::post('/classes/{class}/assign-to-year', [ClassController::class, 'assignToYear']);
        Route::apiResource('classes', ClassController::class);

        // Subjects
        Route::apiResource('subjects', SubjectController::class);

        // Class Subject Templates
        Route::apiResource('class-subject-templates', ClassSubjectTemplateController::class);

        // Class Subjects
        Route::apiResource('class-subjects', ClassSubjectController::class);

        // Exams
        Route::apiResource('exams', ExamController::class);
        Route::post('/exams/{exam}/status', [ExamController::class, 'updateStatus']);

        // Exam Types
        Route::apiResource('exam-types', ExamTypeController::class);

    // Exam Classes
    Route::apiResource('exam-classes', ExamClassController::class)->only(['index', 'store', 'destroy']);

    // Exam Subjects
    Route::apiResource('exam-subjects', ExamSubjectController::class)->only(['index', 'store', 'update', 'destroy']);

    // Exam Timetable
    Route::get('/exams/{exam}/times', [ExamTimeController::class, 'index']);
    Route::post('/exams/{exam}/times', [ExamTimeController::class, 'store']);
    Route::put('/exam-times/{examTime}', [ExamTimeController::class, 'update']);
    Route::delete('/exam-times/{examTime}', [ExamTimeController::class, 'destroy']);
    Route::post('/exam-times/{examTime}/toggle-lock', [ExamTimeController::class, 'toggleLock']);

    // Exam Students
    Route::apiResource('exam-students', ExamStudentController::class)->only(['index', 'store', 'destroy']);
    Route::post('/exam-students/bulk-enroll', [ExamStudentController::class, 'bulkEnroll']);
    Route::post('/exams/{exam}/enroll-all', [ExamStudentController::class, 'enrollAll']);
    Route::get('/exams/{exam}/enrollment-stats', [ExamStudentController::class, 'stats']);

    // Exam Results
    Route::apiResource('exam-results', ExamResultController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('/exam-results/bulk-store', [ExamResultController::class, 'bulkStore']);
    Route::get('/exams/{exam}/marks-progress', [ExamResultController::class, 'progress']);

    // Exam Reports
    Route::get('/exams/{exam}/report', [ExamReportController::class, 'show']);
    Route::get('/exams/{exam}/reports/summary', [ExamReportController::class, 'summary']);
    Route::get('/exams/{exam}/reports/classes/{class}', [ExamReportController::class, 'classReport']);
    Route::get('/exams/{exam}/reports/students/{student}', [ExamReportController::class, 'studentReport']);
    Route::get('/exams/{exam}/reports/classes/{class}/consolidated', [ExamReportController::class, 'consolidatedClassReport']);
    Route::get('/exams/{exam}/reports/classes/{class}/subjects/{subject}', [ExamReportController::class, 'classSubjectMarkSheet']);

    // Exam Documents
    Route::get('/exam-documents/{id}/download', [ExamDocumentController::class, 'download']);
    Route::apiResource('exam-documents', ExamDocumentController::class);

    // Finance Documents
    Route::get('/finance-documents/{id}/download', [FinanceDocumentController::class, 'download']);
    Route::apiResource('finance-documents', FinanceDocumentController::class);

    // Exam Numbers (Roll Numbers & Secret Numbers)
    Route::get('/exams/{exam}/students-with-numbers', [ExamNumberController::class, 'studentsWithNumbers']);
    Route::get('/exams/{exam}/roll-numbers/start-from', [ExamNumberController::class, 'rollNumberStartFrom']);
    Route::post('/exams/{exam}/roll-numbers/preview-auto-assign', [ExamNumberController::class, 'previewRollNumberAssignment']);
    Route::post('/exams/{exam}/roll-numbers/confirm-auto-assign', [ExamNumberController::class, 'confirmRollNumberAssignment']);
    Route::patch('/exams/{exam}/students/{examStudent}/roll-number', [ExamNumberController::class, 'updateRollNumber']);
    Route::get('/exams/{exam}/secret-numbers/start-from', [ExamNumberController::class, 'secretNumberStartFrom']);
    Route::post('/exams/{exam}/secret-numbers/preview-auto-assign', [ExamNumberController::class, 'previewSecretNumberAssignment']);
    Route::post('/exams/{exam}/secret-numbers/confirm-auto-assign', [ExamNumberController::class, 'confirmSecretNumberAssignment']);
    Route::patch('/exams/{exam}/students/{examStudent}/secret-number', [ExamNumberController::class, 'updateSecretNumber']);
    Route::get('/exams/{exam}/secret-numbers/lookup', [ExamNumberController::class, 'lookupBySecretNumber']);
    Route::get('/exams/{exam}/reports/roll-numbers', [ExamNumberController::class, 'rollNumberReport']);
    Route::get('/exams/{exam}/reports/roll-slips', [ExamNumberController::class, 'rollSlipsHtml']);
    Route::get('/exams/{exam}/reports/secret-labels', [ExamNumberController::class, 'secretLabelsHtml']);

    // Exam Attendance
    Route::get('/exams/{exam}/attendance', [ExamAttendanceController::class, 'index']);
    Route::get('/exams/{exam}/attendance/summary', [ExamAttendanceController::class, 'summary']);
    Route::get('/exams/{exam}/attendance/class/{classId}', [ExamAttendanceController::class, 'byClass']);
    Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}', [ExamAttendanceController::class, 'byTimeslot']);
    Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}/students', [ExamAttendanceController::class, 'getTimeslotStudents']);
    Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}/summary', [ExamAttendanceController::class, 'timeslotSummary']);
    Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}/scans', [ExamAttendanceController::class, 'scanFeed']);
    Route::get('/exams/{exam}/attendance/students/{studentId}', [ExamAttendanceController::class, 'studentReport']);
    Route::post('/exams/{exam}/attendance/mark', [ExamAttendanceController::class, 'mark']);
    Route::post('/exams/{exam}/attendance/scan', [ExamAttendanceController::class, 'scan']);
    Route::put('/exam-attendance/{id}', [ExamAttendanceController::class, 'update']);
    Route::delete('/exam-attendance/{id}', [ExamAttendanceController::class, 'destroy']);

        // Academic Years
        Route::apiResource('academic-years', AcademicYearController::class);

        // Grades (Academic Settings)
        Route::apiResource('grades', GradeController::class);

        // Timetables
        Route::apiResource('timetables', TimetableController::class);
        Route::get('/timetables/{id}/entries', [TimetableController::class, 'entries']);

        // Schedule Slots
        Route::apiResource('schedule-slots', ScheduleSlotController::class);

        // Teacher Timetable Preferences
        Route::apiResource('teacher-timetable-preferences', TeacherTimetablePreferenceController::class);
        Route::post('/teacher-timetable-preferences/upsert', [TeacherTimetablePreferenceController::class, 'upsert']);

        // Teacher Subject Assignments
        Route::apiResource('teacher-subject-assignments', TeacherSubjectAssignmentController::class);

        // Assets
        Route::get('/assets/stats', [AssetController::class, 'stats']);
        Route::get('/assets/{id}/history', [AssetController::class, 'history']);
        Route::get('/assets/{id}/assignments', [AssetController::class, 'assignments']);
        Route::post('/assets/{id}/assignments', [AssetController::class, 'createAssignment']);
        Route::get('/assets/{id}/maintenance', [AssetMaintenanceController::class, 'index']);
        Route::post('/assets/{id}/maintenance', [AssetMaintenanceController::class, 'store']);
        Route::apiResource('assets', AssetController::class);
        Route::apiResource('asset-assignments', AssetAssignmentController::class);
        Route::apiResource('asset-maintenance', AssetMaintenanceController::class);
        Route::apiResource('asset-categories', AssetCategoryController::class);

        // Attendance Sessions
        Route::get('/attendance-sessions/roster', [AttendanceSessionController::class, 'roster']);
        Route::get('/attendance-sessions/totals-report', [AttendanceSessionController::class, 'totalsReport']);
        Route::get('/attendance-sessions/report', [AttendanceSessionController::class, 'report']);
        Route::post('/attendance-sessions/generate-report', [AttendanceSessionController::class, 'generateReport']);
        Route::post('/attendance-sessions/{id}/close', [AttendanceSessionController::class, 'close']);
        Route::post('/attendance-sessions/{id}/records', [AttendanceSessionController::class, 'markRecords']);
        Route::post('/attendance-sessions/{id}/scan', [AttendanceSessionController::class, 'scan']);
        Route::get('/attendance-sessions/{id}/scans', [AttendanceSessionController::class, 'scanFeed']);
        Route::apiResource('attendance-sessions', AttendanceSessionController::class);

        // Library Management
        Route::apiResource('library-categories', LibraryCategoryController::class);
        Route::apiResource('library-books', LibraryBookController::class);
        Route::post('/library-copies', [LibraryCopyController::class, 'store']);
        Route::put('/library-copies/{id}', [LibraryCopyController::class, 'update']);
        Route::delete('/library-copies/{id}', [LibraryCopyController::class, 'destroy']);
        Route::get('/library-loans', [LibraryLoanController::class, 'index']);
        Route::post('/library-loans', [LibraryLoanController::class, 'store']);
        Route::post('/library-loans/{id}/return', [LibraryLoanController::class, 'returnCopy']);
        Route::get('/library-loans/due-soon', [LibraryLoanController::class, 'dueSoon']);

        // Short-term courses
        Route::apiResource('short-term-courses', ShortTermCourseController::class);
        Route::post('/short-term-courses/{id}/close', [ShortTermCourseController::class, 'close']);
        Route::post('/short-term-courses/{id}/reopen', [ShortTermCourseController::class, 'reopen']);
        Route::get('/short-term-courses/{id}/stats', [ShortTermCourseController::class, 'stats']);

        // Course students
        Route::apiResource('course-students', CourseStudentController::class);
        Route::post('/course-students/enroll-from-main', [CourseStudentController::class, 'enrollFromMain']);
        Route::post('/course-students/{id}/copy-to-main', [CourseStudentController::class, 'copyToMain']);
        Route::post('/course-students/{id}/complete', [CourseStudentController::class, 'markCompleted']);
        Route::post('/course-students/{id}/drop', [CourseStudentController::class, 'markDropped']);
        Route::post('/course-students/{id}/issue-certificate', [CourseStudentController::class, 'issueCertificate']);
        Route::post('/course-students/{id}/enroll-to-new-course', [CourseStudentController::class, 'enrollToNewCourse']);

    // Course student discipline records
    Route::get('/course-students/{id}/discipline-records', [CourseStudentDisciplineRecordController::class, 'index']);
    Route::post('/course-students/{id}/discipline-records', [CourseStudentDisciplineRecordController::class, 'store']);
    Route::put('/course-student-discipline-records/{id}', [CourseStudentDisciplineRecordController::class, 'update']);
    Route::delete('/course-student-discipline-records/{id}', [CourseStudentDisciplineRecordController::class, 'destroy']);
    Route::post('/course-student-discipline-records/{id}/resolve', [CourseStudentDisciplineRecordController::class, 'resolve']);

        // Course Attendance Sessions
        Route::get('/course-attendance-sessions/roster', [CourseAttendanceSessionController::class, 'roster']);
        Route::get('/course-attendance-sessions/report', [CourseAttendanceSessionController::class, 'report']);
        Route::post('/course-attendance-sessions/{id}/close', [CourseAttendanceSessionController::class, 'close']);
        Route::post('/course-attendance-sessions/{id}/records', [CourseAttendanceSessionController::class, 'markRecords']);
        Route::post('/course-attendance-sessions/{id}/scan', [CourseAttendanceSessionController::class, 'scan']);
        Route::get('/course-attendance-sessions/{id}/scans', [CourseAttendanceSessionController::class, 'scans']);
        Route::apiResource('course-attendance-sessions', CourseAttendanceSessionController::class);

        // Course Documents
        Route::get('/course-documents/{id}/download', [CourseDocumentController::class, 'download']);
        Route::apiResource('course-documents', CourseDocumentController::class);

        // Certificate Templates
        Route::get('/certificate-templates/{id}/background', [CertificateTemplateController::class, 'getBackgroundImage'])
            ->name('certificate-templates.background');
        Route::post('/certificate-templates/{id}/set-default', [CertificateTemplateController::class, 'setDefault']);
        Route::post('/certificate-templates/generate/{courseStudentId}', [CertificateTemplateController::class, 'generateCertificate']);
        Route::get('/certificate-templates/certificate-data/{courseStudentId}', [CertificateTemplateController::class, 'getCertificateData']);
        Route::apiResource('certificate-templates', CertificateTemplateController::class);

        // ID Card Templates
        Route::get('/id-card-templates/{id}/background/{side}', [IdCardTemplateController::class, 'getBackgroundImage'])
            ->name('id-card-templates.background');
        Route::post('/id-card-templates/{id}/set-default', [IdCardTemplateController::class, 'setDefault']);
        Route::apiResource('id-card-templates', IdCardTemplateController::class);

        // Student ID Cards
        Route::get('/student-id-cards', [\App\Http\Controllers\StudentIdCardController::class, 'index']);
        Route::post('/student-id-cards/assign', [\App\Http\Controllers\StudentIdCardController::class, 'assign']);
        Route::get('/student-id-cards/{id}', [\App\Http\Controllers\StudentIdCardController::class, 'show']);
        Route::put('/student-id-cards/{id}', [\App\Http\Controllers\StudentIdCardController::class, 'update']);
        Route::delete('/student-id-cards/{id}', [\App\Http\Controllers\StudentIdCardController::class, 'destroy']);
        Route::post('/student-id-cards/{id}/mark-printed', [\App\Http\Controllers\StudentIdCardController::class, 'markPrinted']);
        Route::post('/student-id-cards/{id}/mark-fee-paid', [\App\Http\Controllers\StudentIdCardController::class, 'markFeePaid']);
        Route::get('/student-id-cards/export/preview', [\App\Http\Controllers\StudentIdCardController::class, 'preview']);
        Route::post('/student-id-cards/export/bulk', [\App\Http\Controllers\StudentIdCardController::class, 'exportBulk']);
        Route::get('/student-id-cards/export/individual/{id}', [\App\Http\Controllers\StudentIdCardController::class, 'exportIndividual']);

    // Certificate Templates (v2 API - frontend compatibility)
    Route::get('/certificates/templates', [CertificateTemplateController::class, 'index']);
    Route::post('/certificates/templates', [CertificateTemplateController::class, 'store']);
    Route::get('/certificates/templates/{id}', [CertificateTemplateController::class, 'show']);
    Route::get('/certificates/templates/{id}/background', [CertificateTemplateController::class, 'getBackgroundImage']);
    Route::put('/certificates/templates/{id}', [CertificateTemplateController::class, 'update']);
    Route::delete('/certificates/templates/{id}', [CertificateTemplateController::class, 'destroy']);
    Route::post('/certificates/templates/{id}/activate', [CertificateTemplateController::class, 'activate']);
    Route::post('/certificates/templates/{id}/deactivate', [CertificateTemplateController::class, 'deactivate']);

        // Graduation Batches
        Route::get('/graduation/batches', [GraduationBatchController::class, 'index']);
        Route::post('/graduation/batches', [GraduationBatchController::class, 'store']);
        Route::get('/graduation/batches/{id}', [GraduationBatchController::class, 'show']);
        Route::put('/graduation/batches/{id}', [GraduationBatchController::class, 'update']);
        Route::delete('/graduation/batches/{id}', [GraduationBatchController::class, 'destroy']);
        Route::post('/graduation/batches/{id}/generate-students', [GraduationBatchController::class, 'generateStudents']);
        Route::post('/graduation/batches/{id}/approve', [GraduationBatchController::class, 'approve']);
        Route::post('/graduation/batches/{id}/issue-certificates', [GraduationBatchController::class, 'issueCertificates']);

    // Issued Certificates
    Route::get('/issued-certificates', [IssuedCertificateController::class, 'index']);
    Route::get('/issued-certificates/{id}', [IssuedCertificateController::class, 'show']);
    Route::post('/issued-certificates/{id}/revoke', [IssuedCertificateController::class, 'revoke']);
    Route::get('/issued-certificates/{id}/download', [IssuedCertificateController::class, 'downloadPdf']);
    Route::get('/issued-certificates/batch/{batchId}/download-zip', [IssuedCertificateController::class, 'downloadBatchZip']);

    // Issued Certificates (v2 API - frontend compatibility)
    Route::get('/certificates/issued', [IssuedCertificateController::class, 'index']);
    Route::get('/certificates/issued/{id}', [IssuedCertificateController::class, 'show']);
    Route::get('/certificates/issued/{id}/data', [IssuedCertificateController::class, 'getCertificateData']);
    Route::post('/certificates/issued/{id}/revoke', [IssuedCertificateController::class, 'revoke']);
    Route::get('/certificates/issued/{id}/pdf', [IssuedCertificateController::class, 'downloadPdf']);
    Route::get('/certificates/batches/{batchId}/pdf', [IssuedCertificateController::class, 'downloadBatchZip']);

        // Leave Requests
        Route::get('/leave-requests/{id}/print', [LeaveRequestController::class, 'printData']);
        Route::post('/leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']);
        Route::post('/leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']);
        Route::post('/leave-requests/generate-report', [LeaveRequestController::class, 'generateReport']);
        Route::apiResource('leave-requests', LeaveRequestController::class);

        // Dashboard
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // ============================================
    // Finance Module
    // ============================================

        // Finance Accounts (cash locations)
        Route::apiResource('finance-accounts', \App\Http\Controllers\FinanceAccountController::class);

    // Income Categories
    Route::apiResource('income-categories', \App\Http\Controllers\IncomeCategoryController::class);

    // Expense Categories
    Route::apiResource('expense-categories', \App\Http\Controllers\ExpenseCategoryController::class);

    // Finance Projects
    Route::get('/finance-projects/{id}/summary', [\App\Http\Controllers\FinanceProjectController::class, 'summary']);
    Route::apiResource('finance-projects', \App\Http\Controllers\FinanceProjectController::class);

    // Donors
    Route::get('/donors/{id}/summary', [\App\Http\Controllers\DonorController::class, 'summary']);
    Route::apiResource('donors', \App\Http\Controllers\DonorController::class);

    // Income Entries
    Route::apiResource('income-entries', \App\Http\Controllers\IncomeEntryController::class);

    // Expense Entries
    Route::apiResource('expense-entries', \App\Http\Controllers\ExpenseEntryController::class);

        // Finance Reports
        Route::get('/finance/dashboard', [\App\Http\Controllers\FinanceReportController::class, 'dashboard']);
        Route::get('/finance/reports/daily-cashbook', [\App\Http\Controllers\FinanceReportController::class, 'dailyCashbook']);
        Route::get('/finance/reports/income-vs-expense', [\App\Http\Controllers\FinanceReportController::class, 'incomeVsExpense']);
        Route::get('/finance/reports/project-summary', [\App\Http\Controllers\FinanceReportController::class, 'projectSummary']);
        Route::get('/finance/reports/donor-summary', [\App\Http\Controllers\FinanceReportController::class, 'donorSummary']);
        Route::get('/finance/reports/account-balances', [\App\Http\Controllers\FinanceReportController::class, 'accountBalances']);

        // Fees
        Route::get('/fees/structures', [FeeStructureController::class, 'index']);
        Route::post('/fees/structures', [FeeStructureController::class, 'store']);
        Route::get('/fees/structures/{id}', [FeeStructureController::class, 'show']);
        Route::put('/fees/structures/{id}', [FeeStructureController::class, 'update']);
        Route::patch('/fees/structures/{id}', [FeeStructureController::class, 'update']);
        Route::delete('/fees/structures/{id}', [FeeStructureController::class, 'destroy']);

    Route::get('/fees/assignments', [FeeAssignmentController::class, 'index']);
    Route::post('/fees/assignments', [FeeAssignmentController::class, 'store']);
    Route::put('/fees/assignments/{id}', [FeeAssignmentController::class, 'update']);
    Route::patch('/fees/assignments/{id}', [FeeAssignmentController::class, 'update']);
    Route::delete('/fees/assignments/{id}', [FeeAssignmentController::class, 'destroy']);

    Route::get('/fees/payments', [FeePaymentController::class, 'index']);
    Route::post('/fees/payments', [FeePaymentController::class, 'store']);

    Route::get('/fees/exceptions', [FeeExceptionController::class, 'index']);
    Route::post('/fees/exceptions', [FeeExceptionController::class, 'store']);
    Route::get('/fees/exceptions/{id}', [FeeExceptionController::class, 'show']);
    Route::put('/fees/exceptions/{id}', [FeeExceptionController::class, 'update']);
    Route::patch('/fees/exceptions/{id}', [FeeExceptionController::class, 'update']);
    Route::delete('/fees/exceptions/{id}', [FeeExceptionController::class, 'destroy']);

    // Fee Reports
    Route::get('/fees/reports/dashboard', [FeeReportController::class, 'dashboard']);
    Route::get('/fees/reports/students', [FeeReportController::class, 'studentFees']);
    Route::get('/fees/reports/collection', [FeeReportController::class, 'collectionReport']);
    Route::get('/fees/reports/defaulters', [FeeReportController::class, 'defaulters']);

        // Currency Management
        Route::apiResource('currencies', \App\Http\Controllers\CurrencyController::class);

    // Exchange Rate Management
    Route::apiResource('exchange-rates', \App\Http\Controllers\ExchangeRateController::class);
    Route::post('/exchange-rates/convert', [\App\Http\Controllers\ExchangeRateController::class, 'convert']);

        // Document Management System (DMS)
        Route::get('/dms/dashboard', [DocumentReportsController::class, 'dashboard']);
        Route::get('/dms/reports/distribution', [DocumentReportsController::class, 'distribution']);
        Route::get('/dms/archive', ArchiveSearchController::class);

    Route::get('/dms/settings', [DocumentSettingsController::class, 'show']);
    Route::put('/dms/settings', [DocumentSettingsController::class, 'update']);

    Route::get('/dms/departments', [DmsDepartmentsController::class, 'index']);
    Route::get('/dms/departments/stats', [DmsDepartmentsController::class, 'stats']);
    Route::post('/dms/departments', [DmsDepartmentsController::class, 'store']);
    Route::get('/dms/departments/{id}', [DmsDepartmentsController::class, 'show']);
    Route::put('/dms/departments/{id}', [DmsDepartmentsController::class, 'update']);
    Route::delete('/dms/departments/{id}', [DmsDepartmentsController::class, 'destroy']);

    Route::get('/dms/incoming', [IncomingDocumentsController::class, 'index']);
    Route::post('/dms/incoming', [IncomingDocumentsController::class, 'store']);
    Route::get('/dms/incoming/{id}', [IncomingDocumentsController::class, 'show']);
    Route::put('/dms/incoming/{id}', [IncomingDocumentsController::class, 'update']);

    Route::get('/dms/outgoing', [OutgoingDocumentsController::class, 'index']);
    Route::post('/dms/outgoing', [OutgoingDocumentsController::class, 'store']);
    Route::get('/dms/outgoing/{id}', [OutgoingDocumentsController::class, 'show']);
    Route::put('/dms/outgoing/{id}', [OutgoingDocumentsController::class, 'update']);
    Route::get('/dms/outgoing/{id}/pdf', [OutgoingDocumentsController::class, 'downloadPdf']);

    Route::get('/dms/templates', [LetterTemplatesController::class, 'index']);
    Route::post('/dms/templates', [LetterTemplatesController::class, 'store']);
    Route::get('/dms/templates/fields/available', [LetterTemplatesController::class, 'getAvailableFields']);
    Route::post('/dms/templates/preview-draft', [LetterTemplatesController::class, 'previewDraft']);
    Route::get('/dms/templates/{id}', [LetterTemplatesController::class, 'show']);
    Route::put('/dms/templates/{id}', [LetterTemplatesController::class, 'update']);
    Route::delete('/dms/templates/{id}', [LetterTemplatesController::class, 'destroy']);
    Route::post('/dms/templates/{id}/duplicate', [LetterTemplatesController::class, 'duplicate']);
    Route::post('/dms/templates/{id}/preview', [LetterTemplatesController::class, 'preview']);
    Route::post('/dms/templates/{id}/preview-pdf', [LetterTemplatesController::class, 'previewPdf']);

    Route::get('/dms/letterheads', [LetterheadsController::class, 'index']);
    Route::post('/dms/letterheads', [LetterheadsController::class, 'store']);
    Route::get('/dms/letterheads/{id}', [LetterheadsController::class, 'show']);
    Route::put('/dms/letterheads/{id}', [LetterheadsController::class, 'update']);
    Route::delete('/dms/letterheads/{id}', [LetterheadsController::class, 'destroy']);
    Route::get('/dms/letterheads/{id}/download', [LetterheadsController::class, 'download']);
    Route::get('/dms/letterheads/{id}/serve', [LetterheadsController::class, 'serve'])->name('dms.letterheads.serve');
    Route::get('/dms/letterheads/{id}/preview', [LetterheadsController::class, 'preview'])->name('dms.letterheads.preview');

    Route::get('/dms/letter-types', [LetterTypesController::class, 'index']);
    Route::post('/dms/letter-types', [LetterTypesController::class, 'store']);
    Route::get('/dms/letter-types/{id}', [LetterTypesController::class, 'show']);
    Route::put('/dms/letter-types/{id}', [LetterTypesController::class, 'update']);
    Route::delete('/dms/letter-types/{id}', [LetterTypesController::class, 'destroy']);

    Route::get('/dms/files', [DocumentFilesController::class, 'index']);
    Route::post('/dms/files', [DocumentFilesController::class, 'store']);
    Route::get('/dms/files/{id}/download', [DocumentFilesController::class, 'download']);

    // ============================================
        // Central Reporting System
        // ============================================

        Route::post('/reports/generate', [\App\Http\Controllers\ReportGenerationController::class, 'generate']);
        Route::get('/reports', [\App\Http\Controllers\ReportGenerationController::class, 'index']);
        Route::get('/reports/{id}/status', [\App\Http\Controllers\ReportGenerationController::class, 'status']);
        Route::get('/reports/{id}/download', [\App\Http\Controllers\ReportGenerationController::class, 'download']);
        Route::delete('/reports/{id}', [\App\Http\Controllers\ReportGenerationController::class, 'destroy']);

        // Events & Guests Module
        // ============================================

    // Event Types (Form Designer)
    Route::get('/event-types', [\App\Http\Controllers\EventTypeController::class, 'index']);
    Route::post('/event-types', [\App\Http\Controllers\EventTypeController::class, 'store']);
    Route::get('/event-types/{id}', [\App\Http\Controllers\EventTypeController::class, 'show']);
    Route::put('/event-types/{id}', [\App\Http\Controllers\EventTypeController::class, 'update']);
    Route::delete('/event-types/{id}', [\App\Http\Controllers\EventTypeController::class, 'destroy']);
    Route::get('/event-types/{id}/fields', [\App\Http\Controllers\EventTypeController::class, 'getFields']);
    Route::post('/event-types/{id}/fields', [\App\Http\Controllers\EventTypeController::class, 'saveFields']);

        // Events
        Route::get('/events', [\App\Http\Controllers\EventController::class, 'index']);
        Route::post('/events', [\App\Http\Controllers\EventController::class, 'store']);
        Route::get('/events/{id}', [\App\Http\Controllers\EventController::class, 'show']);
        Route::put('/events/{id}', [\App\Http\Controllers\EventController::class, 'update']);
        Route::delete('/events/{id}', [\App\Http\Controllers\EventController::class, 'destroy']);
        Route::get('/events/{id}/stats', [\App\Http\Controllers\EventController::class, 'stats']);

    // Event Guests
    Route::get('/events/{eventId}/guests', [\App\Http\Controllers\EventGuestController::class, 'index']);
    Route::get('/events/{eventId}/guests/lookup', [\App\Http\Controllers\EventGuestController::class, 'lookup']);
    Route::post('/events/{eventId}/guests', [\App\Http\Controllers\EventGuestController::class, 'store']);
    Route::post('/events/{eventId}/guests/import', [\App\Http\Controllers\EventGuestController::class, 'import']);
    Route::get('/events/{eventId}/guests/{guestId}', [\App\Http\Controllers\EventGuestController::class, 'show']);
    Route::put('/events/{eventId}/guests/{guestId}', [\App\Http\Controllers\EventGuestController::class, 'update']);
    Route::delete('/events/{eventId}/guests/{guestId}', [\App\Http\Controllers\EventGuestController::class, 'destroy']);

    // Guest Photo Upload
    Route::get('/guests/{guestId}/photo', [\App\Http\Controllers\EventGuestController::class, 'getPhoto']);
    Route::post('/guests/{guestId}/photo', [\App\Http\Controllers\EventGuestController::class, 'uploadPhoto']);

    // Event Check-in
    Route::post('/events/{eventId}/checkin', [\App\Http\Controllers\EventCheckinController::class, 'checkin']);
    Route::get('/events/{eventId}/checkin/history', [\App\Http\Controllers\EventCheckinController::class, 'history']);
    Route::post('/events/{eventId}/checkin/lookup', [\App\Http\Controllers\EventCheckinController::class, 'lookupByToken']);
    Route::delete('/events/{eventId}/checkin/{checkinId}', [\App\Http\Controllers\EventCheckinController::class, 'undoCheckin']);
    
        // Event-specific users management
        Route::get('/events/{eventId}/users', [\App\Http\Controllers\EventUserController::class, 'index']);
        Route::post('/events/{eventId}/users', [\App\Http\Controllers\EventUserController::class, 'store']);
        Route::put('/events/{eventId}/users/{userId}', [\App\Http\Controllers\EventUserController::class, 'update']);
        Route::delete('/events/{eventId}/users/{userId}', [\App\Http\Controllers\EventUserController::class, 'destroy']);
    });
});

// Preview route (no auth required for template preview)
Route::get('/reports/preview/template', [\App\Http\Controllers\ReportGenerationController::class, 'previewTemplate']);
