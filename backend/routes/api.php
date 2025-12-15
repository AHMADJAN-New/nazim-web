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
use App\Http\Controllers\GradeController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\ExamPaperTemplateController;
use App\Http\Controllers\ExamPaperPreviewController;
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

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/leave-requests/scan/{token}', [LeaveRequestController::class, 'scanPublic']);

// Public stats endpoints (for landing page)
// Note: These return aggregate counts across all organizations
// Consider protecting if aggregate data is sensitive
Route::get('/stats/students-count', [StatsController::class, 'studentsCount']);
Route::get('/stats/staff-count', [StatsController::class, 'staffCount']);

// Protected routes
Route::middleware(['auth:sanctum', 'org.context'])->group(function () {
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

    // Question Bank
    Route::get('/exam/questions', [QuestionController::class, 'index']);
    Route::post('/exam/questions', [QuestionController::class, 'store']);
    Route::get('/exam/questions/{id}', [QuestionController::class, 'show']);
    Route::put('/exam/questions/{id}', [QuestionController::class, 'update']);
    Route::delete('/exam/questions/{id}', [QuestionController::class, 'destroy']);
    Route::post('/exam/questions/{id}/duplicate', [QuestionController::class, 'duplicate']);
    Route::post('/exam/questions/bulk-update', [QuestionController::class, 'bulkUpdate']);

    // Exam Paper Templates
    Route::get('/exam/paper-templates', [ExamPaperTemplateController::class, 'index']);
    Route::post('/exam/paper-templates', [ExamPaperTemplateController::class, 'store']);
    Route::get('/exam/paper-templates/{id}', [ExamPaperTemplateController::class, 'show']);
    Route::put('/exam/paper-templates/{id}', [ExamPaperTemplateController::class, 'update']);
    Route::delete('/exam/paper-templates/{id}', [ExamPaperTemplateController::class, 'destroy']);
    Route::post('/exam/paper-templates/{id}/duplicate', [ExamPaperTemplateController::class, 'duplicate']);
    Route::post('/exam/paper-templates/{id}/items', [ExamPaperTemplateController::class, 'addItem']);
    Route::put('/exam/paper-templates/{id}/items/{itemId}', [ExamPaperTemplateController::class, 'updateItem']);
    Route::delete('/exam/paper-templates/{id}/items/{itemId}', [ExamPaperTemplateController::class, 'removeItem']);
    Route::post('/exam/paper-templates/{id}/reorder', [ExamPaperTemplateController::class, 'reorderItems']);
    Route::get('/exams/{examId}/paper-stats', [ExamPaperTemplateController::class, 'examPaperStats']);

    // Exam Paper Preview
    Route::get('/exam/paper-preview/{templateId}/student', [ExamPaperPreviewController::class, 'studentView']);
    Route::get('/exam/paper-preview/{templateId}/teacher', [ExamPaperPreviewController::class, 'teacherView']);
    Route::get('/exam-subjects/{examSubjectId}/paper-preview', [ExamPaperPreviewController::class, 'examSubjectPreview']);
    Route::get('/exam-subjects/{examSubjectId}/available-templates', [ExamPaperPreviewController::class, 'availableTemplates']);
    Route::post('/exam-subjects/{examSubjectId}/set-default-template', [ExamPaperPreviewController::class, 'setDefaultTemplate']);

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

    // Leave Requests
    Route::get('/leave-requests/{id}/print', [LeaveRequestController::class, 'printData']);
    Route::post('/leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']);
    Route::post('/leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']);
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
    Route::post('/dms/departments', [DmsDepartmentsController::class, 'store']);

    Route::get('/dms/incoming', [IncomingDocumentsController::class, 'index']);
    Route::post('/dms/incoming', [IncomingDocumentsController::class, 'store']);
    Route::get('/dms/incoming/{id}', [IncomingDocumentsController::class, 'show']);
    Route::put('/dms/incoming/{id}', [IncomingDocumentsController::class, 'update']);

    Route::get('/dms/outgoing', [OutgoingDocumentsController::class, 'index']);
    Route::post('/dms/outgoing', [OutgoingDocumentsController::class, 'store']);
    Route::get('/dms/outgoing/{id}', [OutgoingDocumentsController::class, 'show']);
    Route::put('/dms/outgoing/{id}', [OutgoingDocumentsController::class, 'update']);

    Route::get('/dms/templates', [LetterTemplatesController::class, 'index']);
    Route::post('/dms/templates', [LetterTemplatesController::class, 'store']);
    Route::get('/dms/templates/{id}', [LetterTemplatesController::class, 'show']);
    Route::put('/dms/templates/{id}', [LetterTemplatesController::class, 'update']);
    Route::delete('/dms/templates/{id}', [LetterTemplatesController::class, 'destroy']);
    Route::post('/dms/templates/{id}/duplicate', [LetterTemplatesController::class, 'duplicate']);
    Route::post('/dms/templates/{id}/preview', [LetterTemplatesController::class, 'preview']);

    Route::get('/dms/letterheads', [LetterheadsController::class, 'index']);
    Route::post('/dms/letterheads', [LetterheadsController::class, 'store']);
    Route::get('/dms/letterheads/{id}', [LetterheadsController::class, 'show']);
    Route::put('/dms/letterheads/{id}', [LetterheadsController::class, 'update']);
    Route::delete('/dms/letterheads/{id}', [LetterheadsController::class, 'destroy']);
    Route::get('/dms/letterheads/{id}/download', [LetterheadsController::class, 'download']);
    Route::get('/dms/letterheads/{id}/preview', [LetterheadsController::class, 'preview']);

    Route::get('/dms/letter-types', [LetterTypesController::class, 'index']);
    Route::post('/dms/letter-types', [LetterTypesController::class, 'store']);
    Route::get('/dms/letter-types/{id}', [LetterTypesController::class, 'show']);
    Route::put('/dms/letter-types/{id}', [LetterTypesController::class, 'update']);
    Route::delete('/dms/letter-types/{id}', [LetterTypesController::class, 'destroy']);

    Route::get('/dms/files', [DocumentFilesController::class, 'index']);
    Route::post('/dms/files', [DocumentFilesController::class, 'store']);
    Route::get('/dms/files/{id}/download', [DocumentFilesController::class, 'download']);
});
