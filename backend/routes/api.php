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
use App\Http\Controllers\StudentImportController;
use App\Http\Controllers\StudentDocumentController;
use App\Http\Controllers\StudentEducationalHistoryController;
use App\Http\Controllers\StudentDisciplineRecordController;
use App\Http\Controllers\StudentHistoryController;
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
use App\Http\Controllers\ExamPaperTemplateController;
use App\Http\Controllers\ExamPaperTemplateFileController;
use App\Http\Controllers\ExamPaperPreviewController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\FinanceDocumentController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\GraduationBatchController;

// Lightweight health check for reverse proxy (/api/*) setups
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Nazim API',
    ]);
});
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
use App\Http\Controllers\SearchController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\HelpCenterCategoryController;
use App\Http\Controllers\HelpCenterArticleController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\MaintenanceFeeController;
use App\Http\Controllers\LicenseFeeController;
use App\Http\Controllers\DesktopLicenseController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes (no authentication required)
Route::get('auth/login', [AuthController::class, 'loginGet']); // Handle GET requests gracefully
Route::post('auth/login', [AuthController::class, 'login']);
Route::get('/leave-requests/scan/{token}', [LeaveRequestController::class, 'scanPublic']);
Route::get('/maintenance/status/public', [App\Http\Controllers\MaintenanceController::class, 'getPublicStatus']);

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
Route::post('/landing/contact', [LandingController::class, 'submitContact']);
Route::post('/landing/plan-request', [LandingController::class, 'submitPlanRequest']);

// Auth routes (require authentication but NO subscription checks - always allowed)
// These routes must be accessible even without active subscription for login/auth checks
Route::middleware(['auth:sanctum', 'organization'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
});

// Platform admin check - accessible to all authenticated users (no organization requirement)
// This endpoint doesn't require organization context since platform admins can have organization_id = NULL
// Returns simple boolean - no 403 errors, completely hidden from network inspection
Route::middleware(['auth:sanctum'])->get('/auth/is-platform-admin', [AuthController::class, 'isPlatformAdmin']);

// Organization management routes (accessible without subscription for initial setup)
// These routes are needed for permission management and organization setup
Route::middleware(['auth:sanctum', 'organization'])->group(function () {
    // IMPORTANT: More specific routes must come before parameterized routes
    Route::get('/organizations/accessible', [OrganizationController::class, 'accessible']);
    Route::get('/organizations/{id}/permissions', [OrganizationController::class, 'permissions']);
    Route::put('/organizations/{id}/permissions', [OrganizationController::class, 'updatePermissions']);
    
    // User permissions (needed for UI to work correctly, even during setup)
    Route::get('/permissions/user', [PermissionController::class, 'userPermissions']);
});

// Public Help Center routes (accessible without authentication for public articles)
// These routes allow both authenticated and unauthenticated access
// The controller handles visibility and permission filtering
Route::prefix('help-center')->group(function () {
    // Context-based article lookup (must come before {id} route to avoid conflict)
    Route::get('/articles/context', [\App\Http\Controllers\HelpCenterArticleController::class, 'getByContext']);
    
    // Public article access by ID (for frontend routes like /help-center/article/{id})
    Route::get('/articles/{id}', [\App\Http\Controllers\HelpCenterArticleController::class, 'show']);
    
    // Slug-based public routes (under /s prefix to avoid conflicts)
    Route::prefix('s')->group(function () {
        Route::get('/{categorySlug}', [\App\Http\Controllers\HelpCenterArticleController::class, 'showCategoryBySlug']);
        Route::get('/{categorySlug}/{articleSlug}', [\App\Http\Controllers\HelpCenterArticleController::class, 'showBySlug']);
    });
});

// Protected routes (organization context is mandatory everywhere)
// All routes require subscription:read for basic access (allows read during grace/readonly periods)
Route::middleware(['auth:sanctum', 'organization', 'subscription:read'])->group(function () {
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

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::get('/notifications/preferences', [NotificationController::class, 'getPreferences']);
    Route::put('/notifications/preferences/{type}', [NotificationController::class, 'updatePreference']);

    // Organizations (protected - all operations require authentication)
    Route::get('/organizations', [OrganizationController::class, 'index']);
    Route::post('/organizations', [OrganizationController::class, 'store']);
    // IMPORTANT: More specific routes must come before parameterized routes
    Route::get('/organizations/preview', [OrganizationController::class, 'preview']);
    Route::get('/organizations/admins', [OrganizationController::class, 'admins']);
    Route::get('/organizations/{id}/statistics', [OrganizationController::class, 'statistics']);
    Route::put('/organizations/{id}', [OrganizationController::class, 'update']);
    Route::patch('/organizations/{id}', [OrganizationController::class, 'update']);
    Route::delete('/organizations/{id}', [OrganizationController::class, 'destroy']);
    Route::get('/organizations/{id}', [OrganizationController::class, 'show']);

    // Profiles
    Route::apiResource('profiles', ProfileController::class);
    Route::get('/profiles/me', [ProfileController::class, 'me']);

    // User Tours
    Route::get('/user-tours/my', [\App\Http\Controllers\UserTourController::class, 'myTours']);
    Route::get('/user-tours/for-route', [\App\Http\Controllers\UserTourController::class, 'toursForRoute']);
    Route::apiResource('user-tours', \App\Http\Controllers\UserTourController::class);
    Route::post('/user-tours/{id}/complete', [\App\Http\Controllers\UserTourController::class, 'complete']);
    Route::post('/user-tours/{id}/progress', [\App\Http\Controllers\UserTourController::class, 'saveProgress']);

    // Users (user management)
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::middleware(['subscription:write'])->group(function () {
        Route::post('/users', [UserController::class, 'store'])->middleware('limit:users');
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });
    Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);

    // Schools (school branding)
    Route::get('/schools', [SchoolBrandingController::class, 'index']);
    // Logo endpoint must come before {school} route to avoid route conflicts
    Route::get('/schools/{school}/logos/{type}', [SchoolBrandingController::class, 'logo'])
        ->where('type', 'primary|secondary|ministry');
    Route::get('/schools/{school}', [SchoolBrandingController::class, 'show']);
    Route::middleware(['subscription:write'])->group(function () {
        Route::post('/schools', [SchoolBrandingController::class, 'store'])
            ->middleware(['feature:multi_school', 'limit:schools']);
        Route::put('/schools/{school}', [SchoolBrandingController::class, 'update']);
        Route::patch('/schools/{school}', [SchoolBrandingController::class, 'update']);
        Route::delete('/schools/{school}', [SchoolBrandingController::class, 'destroy'])
            ->middleware(['feature:multi_school']);
    });

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
    Route::post('/translations/changes', [TranslationController::class, 'storeChanges']);
    Route::get('/translations/changed-files', [TranslationController::class, 'getChangedFiles']);
    Route::post('/translations/mark-built', [TranslationController::class, 'markAsBuilt']);

    // Help Center (organization-scoped, not school-scoped)
    Route::prefix('help-center')->group(function () {
        // Fixed routes first (to prevent slug conflicts)
        // Categories
        Route::get('/categories', [HelpCenterCategoryController::class, 'index']);
        Route::get('/categories/slug/{slug}', [HelpCenterCategoryController::class, 'showBySlug']);
        Route::get('/categories/{id}', [HelpCenterCategoryController::class, 'show']); // Keep for admin CRUD
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/categories', [HelpCenterCategoryController::class, 'store']);
            Route::put('/categories/{id}', [HelpCenterCategoryController::class, 'update']);
            Route::delete('/categories/{id}', [HelpCenterCategoryController::class, 'destroy']);
        });

        // Articles
        Route::get('/articles', [HelpCenterArticleController::class, 'index']);
        Route::get('/articles/featured', [HelpCenterArticleController::class, 'featured']);
        Route::get('/articles/popular', [HelpCenterArticleController::class, 'popular']);
        Route::get('/articles/context', [HelpCenterArticleController::class, 'getByContext']); // Contextual help
        // Note: GET /articles/{id} is moved to public routes above to allow unauthenticated access for public articles
        Route::post('/articles/{id}/helpful', [HelpCenterArticleController::class, 'markHelpful']);
        Route::post('/articles/{id}/not-helpful', [HelpCenterArticleController::class, 'markNotHelpful']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/articles', [HelpCenterArticleController::class, 'store']);
            Route::put('/articles/{id}', [HelpCenterArticleController::class, 'update']);
            Route::delete('/articles/{id}', [HelpCenterArticleController::class, 'destroy']);
            Route::post('/articles/{id}/publish', [HelpCenterArticleController::class, 'publish']);
            Route::post('/articles/{id}/unpublish', [HelpCenterArticleController::class, 'unpublish']);
            Route::post('/articles/{id}/archive', [HelpCenterArticleController::class, 'archive']);
        });
    });

    // Global search (requires school context for filtering)
    Route::middleware(['school.context'])->group(function () {
        Route::get('/search', [SearchController::class, 'search']);
    });

    // ============================================================
    // School-scoped routes
    // Rule: Everything is school-scoped except org/permissions/roles/schools.
    // All write operations require subscription:write access
    // Specific features require feature:featureKey access
    // Resource creation requires limit:resourceKey enforcement
    // ============================================================
    Route::middleware(['school.context'])->group(function () {

        // Buildings (core feature - no additional feature check)
        Route::get('/buildings', [BuildingController::class, 'index']);
        Route::get('/buildings/{building}', [BuildingController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/buildings', [BuildingController::class, 'store']);
            Route::put('/buildings/{building}', [BuildingController::class, 'update']);
            Route::delete('/buildings/{building}', [BuildingController::class, 'destroy']);
        });

        // Rooms (core feature - no additional feature check)
        Route::get('/rooms', [RoomController::class, 'index']);
        Route::get('/rooms/{room}', [RoomController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/rooms', [RoomController::class, 'store']);
            Route::put('/rooms/{room}', [RoomController::class, 'update']);
            Route::delete('/rooms/{room}', [RoomController::class, 'destroy']);
        });

        // Staff (core feature with limit enforcement)
        Route::get('/staff/stats', [StaffController::class, 'stats']);
        Route::get('/staff/report/export', [StaffReportController::class, 'export']);
        Route::get('/staff', [StaffController::class, 'index']);
        Route::get('/staff/{staff}', [StaffController::class, 'show']);
        Route::get('/staff/{id}/picture', [StaffController::class, 'getPicture']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/staff/{id}/picture', [StaffController::class, 'uploadPicture']);
            Route::post('/staff/{id}/document', [StaffController::class, 'uploadDocument']);
            Route::post('/staff', [StaffController::class, 'store'])->middleware('limit:staff');
            Route::put('/staff/{staff}', [StaffController::class, 'update']);
            Route::delete('/staff/{staff}', [StaffController::class, 'destroy']);
        });

        // Phone Book
        Route::get('/phonebook', [\App\Http\Controllers\PhoneBookController::class, 'index']);

        // Staff Types (core feature)
        Route::get('/staff-types', [StaffTypeController::class, 'index']);
        Route::get('/staff-types/{staff_type}', [StaffTypeController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/staff-types', [StaffTypeController::class, 'store']);
            Route::put('/staff-types/{staff_type}', [StaffTypeController::class, 'update']);
            Route::delete('/staff-types/{staff_type}', [StaffTypeController::class, 'destroy']);
        });

        // Residency Types (core feature)
        Route::get('/residency-types', [ResidencyTypeController::class, 'index']);
        Route::get('/residency-types/{residency_type}', [ResidencyTypeController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/residency-types', [ResidencyTypeController::class, 'store']);
            Route::put('/residency-types/{residency_type}', [ResidencyTypeController::class, 'update']);
            Route::delete('/residency-types/{residency_type}', [ResidencyTypeController::class, 'destroy']);
        });

        // Report Templates (requires report_templates feature)
        Route::middleware(['feature:report_templates'])->group(function () {
            Route::get('/report-templates/school/{schoolId}', [ReportTemplateController::class, 'bySchool']);
            Route::get('/report-templates/default', [ReportTemplateController::class, 'getDefault']);
            Route::get('/report-templates', [ReportTemplateController::class, 'index']);
            Route::get('/report-templates/{report_template}', [ReportTemplateController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/report-templates', [ReportTemplateController::class, 'store']);
                Route::put('/report-templates/{report_template}', [ReportTemplateController::class, 'update']);
                Route::delete('/report-templates/{report_template}', [ReportTemplateController::class, 'destroy']);
            });
        });

        // Staff Documents (core feature)
        Route::get('/staff/{id}/documents', [StaffDocumentController::class, 'index']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/staff/{id}/documents', [StaffDocumentController::class, 'store']);
            Route::delete('/staff-documents/{id}', [StaffDocumentController::class, 'destroy']);
        });

        // Students (core feature with limit enforcement)
        // Read routes
        Route::get('/students/stats', [StudentController::class, 'stats']);
        Route::get('/students/autocomplete', [StudentController::class, 'autocomplete']);
        Route::get('/students/{id}/picture', [StudentController::class, 'getPicture']);
        Route::get('/students/report/export', [StudentReportController::class, 'export']);
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/students/{student}', [StudentController::class, 'show']);
        // Write routes (require subscription:write and limit enforcement for creation)
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/student-import/templates/download', [StudentImportController::class, 'downloadTemplate']);
            Route::post('/student-import/validate', [StudentImportController::class, 'validateFile']);
            Route::post('/student-import/commit', [StudentImportController::class, 'commit'])->middleware('limit:students');
            Route::post('/students/check-duplicates', [StudentController::class, 'checkDuplicates']);
            Route::post('/students/{id}/picture', [StudentController::class, 'uploadPicture']);
            Route::post('/students', [StudentController::class, 'store'])->middleware('limit:students');
            Route::put('/students/{student}', [StudentController::class, 'update']);
            Route::delete('/students/{student}', [StudentController::class, 'destroy']);
        });

        // Student Documents (core feature)
        Route::get('/students/{id}/documents', [StudentDocumentController::class, 'index']);
        Route::get('/student-documents/{id}/download', [StudentDocumentController::class, 'download']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/students/{id}/documents', [StudentDocumentController::class, 'store']);
            Route::delete('/student-documents/{id}', [StudentDocumentController::class, 'destroy']);
        });

        // Student Educational History (core feature)
        Route::get('/students/{id}/educational-history', [StudentEducationalHistoryController::class, 'index']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/students/{id}/educational-history', [StudentEducationalHistoryController::class, 'store']);
            Route::put('/student-educational-history/{id}', [StudentEducationalHistoryController::class, 'update']);
            Route::delete('/student-educational-history/{id}', [StudentEducationalHistoryController::class, 'destroy']);
        });

        // Student Discipline Records (core feature)
        Route::get('/students/{id}/discipline-records', [StudentDisciplineRecordController::class, 'index']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/students/{id}/discipline-records', [StudentDisciplineRecordController::class, 'store']);
            Route::put('/student-discipline-records/{id}', [StudentDisciplineRecordController::class, 'update']);
            Route::delete('/student-discipline-records/{id}', [StudentDisciplineRecordController::class, 'destroy']);
            Route::post('/student-discipline-records/{id}/resolve', [StudentDisciplineRecordController::class, 'resolve']);
        });

        // Student Profile Print
        Route::get('/students/{student}/print-profile', [StudentController::class, 'printProfile']);

        // Student Lifetime History (core feature)
        Route::get('/students/{student}/history', [StudentHistoryController::class, 'index']);
        Route::get('/students/{student}/history/{section}', [StudentHistoryController::class, 'section']);
        Route::post('/students/{student}/history/export/pdf', [StudentHistoryController::class, 'exportPdf']);
        Route::post('/students/{student}/history/export/excel', [StudentHistoryController::class, 'exportExcel']);
        
        // Preview route for student history template (development only)
        // Supports token in query parameter for easy browser testing
        Route::get('/reports/student-history/preview', [StudentHistoryController::class, 'previewTemplate'])
            ->middleware(['token.from.query', 'auth:sanctum', 'organization', 'school.context']);

        // Student Admissions (core feature)
        Route::get('/student-admissions/stats', [StudentAdmissionController::class, 'stats']);
        Route::get('/student-admissions/report', [StudentAdmissionController::class, 'report']);
        Route::get('/student-admissions', [StudentAdmissionController::class, 'index']);
        Route::get('/student-admissions/{student_admission}', [StudentAdmissionController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/student-admissions/export', [StudentAdmissionController::class, 'export']);
            Route::post('/student-admissions/bulk-deactivate', [StudentAdmissionController::class, 'bulkDeactivate']);
            Route::post('/student-admissions/bulk-deactivate-by-student-ids', [StudentAdmissionController::class, 'bulkDeactivateByStudentIds']);
            Route::post('/student-admissions', [StudentAdmissionController::class, 'store'])->middleware('limit:students');
            Route::put('/student-admissions/{student_admission}', [StudentAdmissionController::class, 'update']);
            Route::delete('/student-admissions/{student_admission}', [StudentAdmissionController::class, 'destroy']);
        });

        // Hostel (requires hostel feature)
        Route::middleware(['feature:hostel'])->group(function () {
            Route::get('/hostel/overview', [HostelController::class, 'overview']);
        });

        // Classes (core feature with limit enforcement)
        Route::get('/classes/academic-years', [ClassController::class, 'byAcademicYear']);
        Route::get('/class-academic-years/{id}', [ClassController::class, 'getClassAcademicYear']);
        Route::get('/classes/{class}/academic-years', [ClassController::class, 'academicYears']);
        Route::get('/classes', [ClassController::class, 'index']);
        Route::get('/classes/{class}', [ClassController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/classes/bulk-assign-sections', [ClassController::class, 'bulkAssignSections']);
            Route::post('/classes/copy-between-years', [ClassController::class, 'copyBetweenYears']);
            Route::put('/classes/academic-years/{id}', [ClassController::class, 'updateInstance']);
            Route::delete('/classes/academic-years/{id}', [ClassController::class, 'removeFromYear']);
            Route::post('/classes/{class}/assign-to-year', [ClassController::class, 'assignToYear']);
            Route::post('/classes', [ClassController::class, 'store'])->middleware('limit:classes');
            Route::put('/classes/{class}', [ClassController::class, 'update']);
            Route::delete('/classes/{class}', [ClassController::class, 'destroy']);
        });

        // Subjects (requires subjects feature)
        Route::middleware(['feature:subjects'])->group(function () {
            Route::get('/subjects', [SubjectController::class, 'index']);
            Route::get('/subjects/{subject}', [SubjectController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/subjects', [SubjectController::class, 'store']);
                Route::put('/subjects/{subject}', [SubjectController::class, 'update']);
                Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);
            });
        });

        // Class Subject Templates (requires subjects feature)
        Route::middleware(['feature:subjects'])->group(function () {
            Route::get('/class-subject-templates', [ClassSubjectTemplateController::class, 'index']);
            Route::get('/class-subject-templates/{class_subject_template}', [ClassSubjectTemplateController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/class-subject-templates', [ClassSubjectTemplateController::class, 'store']);
                Route::put('/class-subject-templates/{class_subject_template}', [ClassSubjectTemplateController::class, 'update']);
                Route::delete('/class-subject-templates/{class_subject_template}', [ClassSubjectTemplateController::class, 'destroy']);
            });
        });

        // Class Subjects (requires subjects feature)
        Route::middleware(['feature:subjects'])->group(function () {
            Route::get('/class-subjects', [ClassSubjectController::class, 'index']);
            Route::get('/class-subjects/{class_subject}', [ClassSubjectController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/class-subjects', [ClassSubjectController::class, 'store']);
                Route::put('/class-subjects/{class_subject}', [ClassSubjectController::class, 'update']);
                Route::delete('/class-subjects/{class_subject}', [ClassSubjectController::class, 'destroy']);
            });
        });

        // Exams (requires exams feature with limit enforcement)
        Route::middleware(['feature:exams'])->group(function () {
            Route::get('/exams', [ExamController::class, 'index']);
            Route::get('/exams/{exam}', [ExamController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/exams', [ExamController::class, 'store'])->middleware('limit:exams');
                Route::put('/exams/{exam}', [ExamController::class, 'update']);
                Route::delete('/exams/{exam}', [ExamController::class, 'destroy']);
                Route::post('/exams/{exam}/status', [ExamController::class, 'updateStatus']);
            });
        });

        // Exam Types (requires exams full)
        Route::middleware(['feature:exams_full'])->group(function () {
            Route::get('/exam-types', [ExamTypeController::class, 'index']);
            Route::get('/exam-types/{exam_type}', [ExamTypeController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/exam-types', [ExamTypeController::class, 'store']);
                Route::put('/exam-types/{exam_type}', [ExamTypeController::class, 'update']);
                Route::delete('/exam-types/{exam_type}', [ExamTypeController::class, 'destroy']);
            });
        });

    // Exam Classes (requires exams feature)
    Route::middleware(['feature:exams'])->group(function () {
        Route::get('/exam-classes', [ExamClassController::class, 'index']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exam-classes', [ExamClassController::class, 'store']);
            Route::delete('/exam-classes/{exam_class}', [ExamClassController::class, 'destroy']);
        });
    });

    // Exam Subjects (requires exams feature)
    Route::middleware(['feature:exams'])->group(function () {
        Route::get('/exam-subjects', [ExamSubjectController::class, 'index']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exam-subjects', [ExamSubjectController::class, 'store']);
            Route::put('/exam-subjects/{exam_subject}', [ExamSubjectController::class, 'update']);
            Route::delete('/exam-subjects/{exam_subject}', [ExamSubjectController::class, 'destroy']);
        });
    });

    // Exam Timetable (requires exams full)
    Route::middleware(['feature:exams_full'])->group(function () {
        Route::get('/exams/{exam}/times', [ExamTimeController::class, 'index']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exams/{exam}/times', [ExamTimeController::class, 'store']);
            Route::put('/exam-times/{examTime}', [ExamTimeController::class, 'update']);
            Route::delete('/exam-times/{examTime}', [ExamTimeController::class, 'destroy']);
            Route::post('/exam-times/{examTime}/toggle-lock', [ExamTimeController::class, 'toggleLock']);
        });
    });

    // Exam Students (requires exams feature)
    Route::middleware(['feature:exams'])->group(function () {
        Route::get('/exam-students', [ExamStudentController::class, 'index']);
        Route::get('/exams/{exam}/enrollment-stats', [ExamStudentController::class, 'stats']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exam-students', [ExamStudentController::class, 'store']);
            Route::delete('/exam-students/{exam_student}', [ExamStudentController::class, 'destroy']);
            Route::post('/exam-students/bulk-enroll', [ExamStudentController::class, 'bulkEnroll']);
            Route::post('/exams/{exam}/enroll-all', [ExamStudentController::class, 'enrollAll']);
        });
    });

    // Exam Results (requires exams feature)
    Route::middleware(['feature:exams'])->group(function () {
        Route::get('/exam-results', [ExamResultController::class, 'index']);
        Route::get('/exams/{exam}/marks-progress', [ExamResultController::class, 'progress']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exam-results', [ExamResultController::class, 'store']);
            Route::put('/exam-results/{exam_result}', [ExamResultController::class, 'update']);
            Route::delete('/exam-results/{exam_result}', [ExamResultController::class, 'destroy']);
            Route::post('/exam-results/bulk-store', [ExamResultController::class, 'bulkStore']);
        });
    });

    // Exam Reports (requires exams feature)
    Route::middleware(['feature:exams'])->group(function () {
        Route::get('/exams/{exam}/report', [ExamReportController::class, 'show']);
        Route::get('/exams/{exam}/reports/summary', [ExamReportController::class, 'summary']);
        Route::get('/exams/{exam}/reports/classes/{class}', [ExamReportController::class, 'classReport']);
        Route::get('/exams/{exam}/reports/students/{student}', [ExamReportController::class, 'studentReport']);
        Route::get('/exams/{exam}/reports/classes/{class}/consolidated', [ExamReportController::class, 'consolidatedClassReport']);
        Route::get('/exams/{exam}/reports/classes/{class}/subjects/{subject}', [ExamReportController::class, 'classSubjectMarkSheet']);
    });

    // Exam Documents (requires exams full)
    Route::middleware(['feature:exams_full'])->group(function () {
        Route::get('/exam-documents/{id}/download', [ExamDocumentController::class, 'download']);
        Route::get('/exam-documents', [ExamDocumentController::class, 'index']);
        Route::get('/exam-documents/{exam_document}', [ExamDocumentController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exam-documents', [ExamDocumentController::class, 'store']);
            Route::put('/exam-documents/{exam_document}', [ExamDocumentController::class, 'update']);
            Route::delete('/exam-documents/{exam_document}', [ExamDocumentController::class, 'destroy']);
        });
    });

    // Finance Documents (requires finance feature)
    Route::middleware(['feature:finance'])->group(function () {
        Route::get('/finance-documents/{id}/download', [FinanceDocumentController::class, 'download']);
        Route::get('/finance-documents', [FinanceDocumentController::class, 'index']);
        Route::get('/finance-documents/{finance_document}', [FinanceDocumentController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/finance-documents', [FinanceDocumentController::class, 'store']);
            Route::put('/finance-documents/{finance_document}', [FinanceDocumentController::class, 'update']);
            Route::delete('/finance-documents/{finance_document}', [FinanceDocumentController::class, 'destroy']);
        });
    });

    // Exam Numbers (Roll Numbers & Secret Numbers) - requires exams full
    Route::middleware(['feature:exams_full'])->group(function () {
        Route::get('/exams/{exam}/students-with-numbers', [ExamNumberController::class, 'studentsWithNumbers']);
        Route::get('/exams/{exam}/roll-numbers/start-from', [ExamNumberController::class, 'rollNumberStartFrom']);
        Route::get('/exams/{exam}/secret-numbers/start-from', [ExamNumberController::class, 'secretNumberStartFrom']);
        Route::get('/exams/{exam}/secret-numbers/lookup', [ExamNumberController::class, 'lookupBySecretNumber']);
        Route::get('/exams/{exam}/reports/roll-numbers', [ExamNumberController::class, 'rollNumberReport']);
        Route::get('/exams/{exam}/reports/roll-slips', [ExamNumberController::class, 'rollSlipsHtml']);
        Route::get('/exams/{exam}/reports/secret-labels', [ExamNumberController::class, 'secretLabelsHtml']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exams/{exam}/roll-numbers/preview-auto-assign', [ExamNumberController::class, 'previewRollNumberAssignment']);
            Route::post('/exams/{exam}/roll-numbers/confirm-auto-assign', [ExamNumberController::class, 'confirmRollNumberAssignment']);
            Route::patch('/exams/{exam}/students/{examStudent}/roll-number', [ExamNumberController::class, 'updateRollNumber']);
            Route::post('/exams/{exam}/secret-numbers/preview-auto-assign', [ExamNumberController::class, 'previewSecretNumberAssignment']);
            Route::post('/exams/{exam}/secret-numbers/confirm-auto-assign', [ExamNumberController::class, 'confirmSecretNumberAssignment']);
            Route::patch('/exams/{exam}/students/{examStudent}/secret-number', [ExamNumberController::class, 'updateSecretNumber']);
        });
    });

    // Exam Attendance - requires exams full
    Route::middleware(['feature:exams_full'])->group(function () {
        Route::get('/exams/{exam}/attendance', [ExamAttendanceController::class, 'index']);
        Route::get('/exams/{exam}/attendance/summary', [ExamAttendanceController::class, 'summary']);
        Route::get('/exams/{exam}/attendance/class/{classId}', [ExamAttendanceController::class, 'byClass']);
        Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}', [ExamAttendanceController::class, 'byTimeslot']);
        Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}/students', [ExamAttendanceController::class, 'getTimeslotStudents']);
        Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}/summary', [ExamAttendanceController::class, 'timeslotSummary']);
        Route::get('/exams/{exam}/attendance/timeslot/{examTimeId}/scans', [ExamAttendanceController::class, 'scanFeed']);
        Route::get('/exams/{exam}/attendance/students/{studentId}', [ExamAttendanceController::class, 'studentReport']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exams/{exam}/attendance/mark', [ExamAttendanceController::class, 'mark']);
            Route::post('/exams/{exam}/attendance/scan', [ExamAttendanceController::class, 'scan']);
            Route::put('/exam-attendance/{id}', [ExamAttendanceController::class, 'update']);
            Route::delete('/exam-attendance/{id}', [ExamAttendanceController::class, 'destroy']);
        });
    });

    // Exam Questions (requires question bank)
    Route::middleware(['feature:question_bank'])->group(function () {
        Route::get('/exam/questions', [QuestionController::class, 'index']);
        Route::get('/exam/questions/{question}', [QuestionController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exam/questions', [QuestionController::class, 'store'])->middleware('limit:questions');
            Route::put('/exam/questions/{question}', [QuestionController::class, 'update']);
            Route::delete('/exam/questions/{question}', [QuestionController::class, 'destroy']);
            Route::post('/exam/questions/{question}/duplicate', [QuestionController::class, 'duplicate']);
            Route::post('/exam/questions/bulk-update', [QuestionController::class, 'bulkUpdate']);
        });
    });

    // Exam Paper Generator (requires exam_paper_generator)
    Route::middleware(['feature:exam_paper_generator'])->group(function () {
        Route::get('/exam/paper-templates', [ExamPaperTemplateController::class, 'index']);
        Route::get('/exam/paper-templates/{id}', [ExamPaperTemplateController::class, 'show']);
        Route::get('/exam/paper-templates/{id}/preview', [ExamPaperTemplateController::class, 'preview']);
        Route::get('/exams/{examId}/paper-stats', [ExamPaperTemplateController::class, 'examPaperStats']);
        Route::post('/exam/paper-templates/{id}/generate', [ExamPaperTemplateController::class, 'generate']);
        Route::post('/exam/paper-templates/{id}/generate-html', [ExamPaperTemplateController::class, 'generateHtml']);

        Route::get('/exam/paper-template-files', [ExamPaperTemplateFileController::class, 'index']);
        Route::get('/exam/paper-template-files/{id}', [ExamPaperTemplateFileController::class, 'show']);
        Route::get('/exam/paper-template-files/{id}/preview', [ExamPaperTemplateFileController::class, 'preview']);

        Route::get('/exam/paper-preview/{templateId}/student', [ExamPaperPreviewController::class, 'studentView']);
        Route::get('/exam/paper-preview/{templateId}/teacher', [ExamPaperPreviewController::class, 'teacherView']);
        Route::get('/exam-subjects/{examSubjectId}/paper-preview', [ExamPaperPreviewController::class, 'examSubjectPreview']);
        Route::get('/exam-subjects/{examSubjectId}/available-templates', [ExamPaperPreviewController::class, 'availableTemplates']);

        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/exam/paper-templates', [ExamPaperTemplateController::class, 'store']);
            Route::put('/exam/paper-templates/{id}', [ExamPaperTemplateController::class, 'update']);
            Route::delete('/exam/paper-templates/{id}', [ExamPaperTemplateController::class, 'destroy']);
            Route::post('/exam/paper-templates/{id}/duplicate', [ExamPaperTemplateController::class, 'duplicate']);
            Route::post('/exam/paper-templates/{id}/items', [ExamPaperTemplateController::class, 'addItem']);
            Route::put('/exam/paper-templates/{id}/items/{itemId}', [ExamPaperTemplateController::class, 'updateItem']);
            Route::delete('/exam/paper-templates/{id}/items/{itemId}', [ExamPaperTemplateController::class, 'removeItem']);
            Route::post('/exam/paper-templates/{id}/reorder', [ExamPaperTemplateController::class, 'reorderItems']);
            Route::post('/exam/paper-templates/{id}/print-status', [ExamPaperTemplateController::class, 'updatePrintStatus']);

            Route::post('/exam/paper-template-files', [ExamPaperTemplateFileController::class, 'store']);
            Route::put('/exam/paper-template-files/{id}', [ExamPaperTemplateFileController::class, 'update']);
            Route::delete('/exam/paper-template-files/{id}', [ExamPaperTemplateFileController::class, 'destroy']);
            Route::post('/exam/paper-template-files/{id}/set-default', [ExamPaperTemplateFileController::class, 'setDefault']);

            Route::post('/exam-subjects/{examSubjectId}/set-default-template', [ExamPaperPreviewController::class, 'setDefaultTemplate']);
        });
    });

        // Academic Years (core feature)
        Route::get('/academic-years', [AcademicYearController::class, 'index']);
        Route::get('/academic-years/{academic_year}', [AcademicYearController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/academic-years', [AcademicYearController::class, 'store']);
            Route::put('/academic-years/{academic_year}', [AcademicYearController::class, 'update']);
            Route::delete('/academic-years/{academic_year}', [AcademicYearController::class, 'destroy']);
        });

        // Grades (requires exam details)
        Route::middleware(['feature:grades'])->group(function () {
            Route::get('/grades', [GradeController::class, 'index']);
            Route::get('/grades/{grade}', [GradeController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/grades', [GradeController::class, 'store']);
                Route::put('/grades/{grade}', [GradeController::class, 'update']);
                Route::delete('/grades/{grade}', [GradeController::class, 'destroy']);
            });
        });

        // Timetables (requires timetable feature)
        Route::middleware(['feature:timetable'])->group(function () {
            Route::get('/timetables', [TimetableController::class, 'index']);
            Route::get('/timetables/{timetable}', [TimetableController::class, 'show']);
            Route::get('/timetables/{id}/entries', [TimetableController::class, 'entries']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/timetables', [TimetableController::class, 'store']);
                Route::put('/timetables/{timetable}', [TimetableController::class, 'update']);
                Route::delete('/timetables/{timetable}', [TimetableController::class, 'destroy']);
            });
        });

        // Schedule Slots (requires timetable feature)
        Route::middleware(['feature:timetable'])->group(function () {
            Route::get('/schedule-slots', [ScheduleSlotController::class, 'index']);
            Route::get('/schedule-slots/{schedule_slot}', [ScheduleSlotController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/schedule-slots', [ScheduleSlotController::class, 'store']);
                Route::put('/schedule-slots/{schedule_slot}', [ScheduleSlotController::class, 'update']);
                Route::delete('/schedule-slots/{schedule_slot}', [ScheduleSlotController::class, 'destroy']);
            });
        });

        // Teacher Timetable Preferences (requires timetable feature)
        Route::middleware(['feature:timetable'])->group(function () {
            Route::get('/teacher-timetable-preferences', [TeacherTimetablePreferenceController::class, 'index']);
            Route::get('/teacher-timetable-preferences/{teacher_timetable_preference}', [TeacherTimetablePreferenceController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/teacher-timetable-preferences', [TeacherTimetablePreferenceController::class, 'store']);
                Route::put('/teacher-timetable-preferences/{teacher_timetable_preference}', [TeacherTimetablePreferenceController::class, 'update']);
                Route::delete('/teacher-timetable-preferences/{teacher_timetable_preference}', [TeacherTimetablePreferenceController::class, 'destroy']);
                Route::post('/teacher-timetable-preferences/upsert', [TeacherTimetablePreferenceController::class, 'upsert']);
            });
        });

        // Teacher Subject Assignments (requires teacher assignments feature)
        Route::middleware(['feature:teacher_subject_assignments'])->group(function () {
            Route::get('/teacher-subject-assignments', [TeacherSubjectAssignmentController::class, 'index']);
            Route::get('/teacher-subject-assignments/{teacher_subject_assignment}', [TeacherSubjectAssignmentController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/teacher-subject-assignments', [TeacherSubjectAssignmentController::class, 'store']);
                Route::put('/teacher-subject-assignments/{teacher_subject_assignment}', [TeacherSubjectAssignmentController::class, 'update']);
                Route::delete('/teacher-subject-assignments/{teacher_subject_assignment}', [TeacherSubjectAssignmentController::class, 'destroy']);
            });
        });

        // Assets (requires assets feature with limit enforcement)
        Route::middleware(['feature:assets'])->group(function () {
            Route::get('/assets/stats', [AssetController::class, 'stats']);
            Route::get('/assets/{id}/history', [AssetController::class, 'history']);
            Route::get('/assets/{id}/assignments', [AssetController::class, 'assignments']);
            Route::get('/assets/{id}/maintenance', [AssetMaintenanceController::class, 'index']);
            Route::get('/assets', [AssetController::class, 'index']);
            Route::get('/assets/{asset}', [AssetController::class, 'show']);
            Route::get('/asset-categories', [AssetCategoryController::class, 'index']);
            Route::get('/asset-categories/{asset_category}', [AssetCategoryController::class, 'show']);
            Route::get('/asset-assignments', [AssetAssignmentController::class, 'index']);
            Route::get('/asset-assignments/{asset_assignment}', [AssetAssignmentController::class, 'show']);
            Route::get('/asset-maintenance', [AssetMaintenanceController::class, 'index']);
            Route::get('/asset-maintenance/{asset_maintenance}', [AssetMaintenanceController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/assets/{id}/assignments', [AssetController::class, 'createAssignment']);
                Route::post('/assets/{id}/maintenance', [AssetMaintenanceController::class, 'store']);
                Route::post('/assets', [AssetController::class, 'store'])->middleware('limit:assets');
                Route::put('/assets/{asset}', [AssetController::class, 'update']);
                Route::delete('/assets/{asset}', [AssetController::class, 'destroy']);
                Route::post('/asset-categories', [AssetCategoryController::class, 'store']);
                Route::put('/asset-categories/{asset_category}', [AssetCategoryController::class, 'update']);
                Route::delete('/asset-categories/{asset_category}', [AssetCategoryController::class, 'destroy']);
                Route::post('/asset-assignments', [AssetAssignmentController::class, 'store']);
                Route::put('/asset-assignments/{asset_assignment}', [AssetAssignmentController::class, 'update']);
                Route::delete('/asset-assignments/{asset_assignment}', [AssetAssignmentController::class, 'destroy']);
                Route::post('/asset-maintenance', [AssetMaintenanceController::class, 'store']);
                Route::put('/asset-maintenance/{asset_maintenance}', [AssetMaintenanceController::class, 'update']);
                Route::delete('/asset-maintenance/{asset_maintenance}', [AssetMaintenanceController::class, 'destroy']);
            });
        });

        // Attendance Sessions (core feature - basic attendance is core)
        Route::get('/attendance-sessions/roster', [AttendanceSessionController::class, 'roster']);
        Route::get('/attendance-sessions/totals-report', [AttendanceSessionController::class, 'totalsReport']);
        Route::get('/attendance-sessions/report', [AttendanceSessionController::class, 'report']);
        Route::get('/attendance-sessions/{id}/scans', [AttendanceSessionController::class, 'scanFeed']);
        Route::get('/attendance-sessions', [AttendanceSessionController::class, 'index']);
        Route::get('/attendance-sessions/{attendance_session}', [AttendanceSessionController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/attendance-sessions/generate-report', [AttendanceSessionController::class, 'generateReport']);
            Route::post('/attendance-sessions/{id}/close', [AttendanceSessionController::class, 'close']);
            Route::post('/attendance-sessions/{id}/records', [AttendanceSessionController::class, 'markRecords']);
            Route::post('/attendance-sessions/{id}/scan', [AttendanceSessionController::class, 'scan']);
            Route::post('/attendance-sessions', [AttendanceSessionController::class, 'store']);
            Route::put('/attendance-sessions/{attendance_session}', [AttendanceSessionController::class, 'update']);
            Route::delete('/attendance-sessions/{attendance_session}', [AttendanceSessionController::class, 'destroy']);
        });

        // Library Management (requires library feature with limit enforcement)
        Route::middleware(['feature:library'])->group(function () {
            Route::get('/library-categories', [LibraryCategoryController::class, 'index']);
            Route::get('/library-categories/{library_category}', [LibraryCategoryController::class, 'show']);
            Route::get('/library-books', [LibraryBookController::class, 'index']);
            Route::get('/library-books/{library_book}', [LibraryBookController::class, 'show']);
            Route::get('/library-loans', [LibraryLoanController::class, 'index']);
            Route::get('/library-loans/due-soon', [LibraryLoanController::class, 'dueSoon']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/library-categories', [LibraryCategoryController::class, 'store']);
                Route::put('/library-categories/{library_category}', [LibraryCategoryController::class, 'update']);
                Route::delete('/library-categories/{library_category}', [LibraryCategoryController::class, 'destroy']);
                Route::post('/library-books', [LibraryBookController::class, 'store'])->middleware('limit:library_books');
                Route::put('/library-books/{library_book}', [LibraryBookController::class, 'update']);
                Route::delete('/library-books/{library_book}', [LibraryBookController::class, 'destroy']);
                Route::post('/library-copies', [LibraryCopyController::class, 'store']);
                Route::put('/library-copies/{id}', [LibraryCopyController::class, 'update']);
                Route::delete('/library-copies/{id}', [LibraryCopyController::class, 'destroy']);
                Route::post('/library-loans', [LibraryLoanController::class, 'store']);
                Route::post('/library-loans/{id}/return', [LibraryLoanController::class, 'returnCopy']);
            });
        });

        // Short-term courses (requires short_courses feature)
        Route::middleware(['feature:short_courses'])->group(function () {
            Route::get('/short-term-courses', [ShortTermCourseController::class, 'index']);
            Route::get('/short-term-courses/{short_term_course}', [ShortTermCourseController::class, 'show']);
            Route::get('/short-term-courses/{id}/stats', [ShortTermCourseController::class, 'stats']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/short-term-courses', [ShortTermCourseController::class, 'store']);
                Route::put('/short-term-courses/{short_term_course}', [ShortTermCourseController::class, 'update']);
                Route::delete('/short-term-courses/{short_term_course}', [ShortTermCourseController::class, 'destroy']);
                Route::post('/short-term-courses/{id}/close', [ShortTermCourseController::class, 'close']);
                Route::post('/short-term-courses/{id}/reopen', [ShortTermCourseController::class, 'reopen']);
            });
        });

        // Course students (requires short_courses feature)
        Route::middleware(['feature:short_courses'])->group(function () {
            Route::get('/course-students', [CourseStudentController::class, 'index']);
            Route::get('/course-students/{course_student}', [CourseStudentController::class, 'show']);
            Route::get('/course-students/{id}/picture', [CourseStudentController::class, 'getPicture']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/course-students', [CourseStudentController::class, 'store']);
                Route::put('/course-students/{course_student}', [CourseStudentController::class, 'update']);
                Route::delete('/course-students/{course_student}', [CourseStudentController::class, 'destroy']);
                Route::post('/course-students/enroll-from-main', [CourseStudentController::class, 'enrollFromMain']);
                Route::post('/course-students/{id}/copy-to-main', [CourseStudentController::class, 'copyToMain']);
                Route::post('/course-students/{id}/complete', [CourseStudentController::class, 'markCompleted']);
                Route::post('/course-students/{id}/drop', [CourseStudentController::class, 'markDropped']);
                Route::post('/course-students/{id}/issue-certificate', [CourseStudentController::class, 'issueCertificate']);
                Route::post('/course-students/{id}/enroll-to-new-course', [CourseStudentController::class, 'enrollToNewCourse']);
                Route::post('/course-students/{id}/picture', [CourseStudentController::class, 'uploadPicture']);
            });
        });

    // Course student discipline records (requires short_courses feature)
    Route::middleware(['feature:short_courses'])->group(function () {
        Route::get('/course-students/{id}/discipline-records', [CourseStudentDisciplineRecordController::class, 'index']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/course-students/{id}/discipline-records', [CourseStudentDisciplineRecordController::class, 'store']);
            Route::put('/course-student-discipline-records/{id}', [CourseStudentDisciplineRecordController::class, 'update']);
            Route::delete('/course-student-discipline-records/{id}', [CourseStudentDisciplineRecordController::class, 'destroy']);
            Route::post('/course-student-discipline-records/{id}/resolve', [CourseStudentDisciplineRecordController::class, 'resolve']);
        });
    });

    // Course Attendance Sessions (requires short_courses feature)
    Route::middleware(['feature:short_courses'])->group(function () {
        Route::get('/course-attendance-sessions/roster', [CourseAttendanceSessionController::class, 'roster']);
        Route::get('/course-attendance-sessions/report', [CourseAttendanceSessionController::class, 'report']);
        Route::get('/course-attendance-sessions/{id}/scans', [CourseAttendanceSessionController::class, 'scans']);
        Route::get('/course-attendance-sessions', [CourseAttendanceSessionController::class, 'index']);
        Route::get('/course-attendance-sessions/{course_attendance_session}', [CourseAttendanceSessionController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/course-attendance-sessions/{id}/close', [CourseAttendanceSessionController::class, 'close']);
            Route::post('/course-attendance-sessions/{id}/records', [CourseAttendanceSessionController::class, 'markRecords']);
            Route::post('/course-attendance-sessions/{id}/scan', [CourseAttendanceSessionController::class, 'scan']);
            Route::post('/course-attendance-sessions', [CourseAttendanceSessionController::class, 'store']);
            Route::put('/course-attendance-sessions/{course_attendance_session}', [CourseAttendanceSessionController::class, 'update']);
            Route::delete('/course-attendance-sessions/{course_attendance_session}', [CourseAttendanceSessionController::class, 'destroy']);
        });
    });

        // Course Documents (requires short_courses feature)
        Route::middleware(['feature:short_courses'])->group(function () {
            Route::get('/course-documents/{id}/download', [CourseDocumentController::class, 'download']);
            Route::get('/course-documents', [CourseDocumentController::class, 'index']);
            Route::get('/course-documents/{course_document}', [CourseDocumentController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/course-documents', [CourseDocumentController::class, 'store']);
                Route::put('/course-documents/{course_document}', [CourseDocumentController::class, 'update']);
                Route::delete('/course-documents/{course_document}', [CourseDocumentController::class, 'destroy']);
            });
        });

        // Certificate Templates (requires graduation feature with limit enforcement)
        Route::middleware(['feature:graduation'])->group(function () {
            Route::get('/certificate-templates/{id}/background', [CertificateTemplateController::class, 'getBackgroundImage'])
                ->name('certificate-templates.background');
            Route::get('/certificate-templates/certificate-data/{courseStudentId}', [CertificateTemplateController::class, 'getCertificateData']);
            Route::get('/certificate-templates', [CertificateTemplateController::class, 'index']);
            Route::get('/certificate-templates/{certificate_template}', [CertificateTemplateController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/certificate-templates/{id}/set-default', [CertificateTemplateController::class, 'setDefault']);
                Route::post('/certificate-templates/generate/{courseStudentId}', [CertificateTemplateController::class, 'generateCertificate']);
                Route::post('/certificate-templates', [CertificateTemplateController::class, 'store'])->middleware('limit:certificate_templates');
                Route::put('/certificate-templates/{certificate_template}', [CertificateTemplateController::class, 'update']);
                Route::delete('/certificate-templates/{certificate_template}', [CertificateTemplateController::class, 'destroy']);
            });
        });

        // ID Card Templates (requires id_cards feature with limit enforcement)
        Route::middleware(['feature:id_cards'])->group(function () {
            Route::get('/id-card-templates/{id}/background/{side}', [IdCardTemplateController::class, 'getBackgroundImage'])
                ->name('id-card-templates.background');
            Route::get('/id-card-templates', [IdCardTemplateController::class, 'index']);
            Route::get('/id-card-templates/{id_card_template}', [IdCardTemplateController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/id-card-templates/{id}/set-default', [IdCardTemplateController::class, 'setDefault']);
                Route::post('/id-card-templates', [IdCardTemplateController::class, 'store'])->middleware('limit:id_card_templates');
                Route::put('/id-card-templates/{id_card_template}', [IdCardTemplateController::class, 'update']);
                Route::delete('/id-card-templates/{id_card_template}', [IdCardTemplateController::class, 'destroy']);
            });
        });

        // Student ID Cards (requires id_cards feature)
        Route::middleware(['feature:id_cards'])->group(function () {
            Route::get('/student-id-cards', [\App\Http\Controllers\StudentIdCardController::class, 'index']);
            Route::get('/student-id-cards/{id}', [\App\Http\Controllers\StudentIdCardController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/student-id-cards/assign', [\App\Http\Controllers\StudentIdCardController::class, 'assign']);
                Route::put('/student-id-cards/{id}', [\App\Http\Controllers\StudentIdCardController::class, 'update']);
                Route::delete('/student-id-cards/{id}', [\App\Http\Controllers\StudentIdCardController::class, 'destroy']);
                Route::post('/student-id-cards/{id}/mark-printed', [\App\Http\Controllers\StudentIdCardController::class, 'markPrinted']);
                Route::post('/student-id-cards/{id}/mark-fee-paid', [\App\Http\Controllers\StudentIdCardController::class, 'markFeePaid']);
            });
        });

    // Certificate Templates (v2 API - frontend compatibility) - requires graduation feature
    Route::middleware(['feature:graduation'])->group(function () {
        Route::get('/certificates/templates', [CertificateTemplateController::class, 'index']);
        Route::get('/certificates/templates/{id}', [CertificateTemplateController::class, 'show']);
        Route::get('/certificates/templates/{id}/background', [CertificateTemplateController::class, 'getBackgroundImage']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/certificates/templates', [CertificateTemplateController::class, 'store']);
            Route::put('/certificates/templates/{id}', [CertificateTemplateController::class, 'update']);
            Route::delete('/certificates/templates/{id}', [CertificateTemplateController::class, 'destroy']);
            Route::post('/certificates/templates/{id}/activate', [CertificateTemplateController::class, 'activate']);
            Route::post('/certificates/templates/{id}/deactivate', [CertificateTemplateController::class, 'deactivate']);
        });
    });

        // Graduation Batches (requires graduation feature)
        Route::middleware(['feature:graduation'])->group(function () {
            Route::get('/graduation/batches', [GraduationBatchController::class, 'index']);
            Route::get('/graduation/batches/{id}', [GraduationBatchController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/graduation/batches', [GraduationBatchController::class, 'store']);
                Route::put('/graduation/batches/{id}', [GraduationBatchController::class, 'update']);
                Route::delete('/graduation/batches/{id}', [GraduationBatchController::class, 'destroy']);
                Route::post('/graduation/batches/{id}/generate-students', [GraduationBatchController::class, 'generateStudents']);
                Route::post('/graduation/batches/{id}/approve', [GraduationBatchController::class, 'approve']);
                Route::post('/graduation/batches/{id}/issue-certificates', [GraduationBatchController::class, 'issueCertificates']);
            });
        });

    // Issued Certificates (requires graduation feature)
    Route::middleware(['feature:graduation'])->group(function () {
        Route::get('/issued-certificates', [IssuedCertificateController::class, 'index']);
        Route::get('/issued-certificates/{id}', [IssuedCertificateController::class, 'show']);
        Route::get('/issued-certificates/{id}/download', [IssuedCertificateController::class, 'downloadPdf']);
        Route::get('/issued-certificates/batch/{batchId}/download-zip', [IssuedCertificateController::class, 'downloadBatchZip']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/issued-certificates/{id}/revoke', [IssuedCertificateController::class, 'revoke']);
        });
    });

    // Issued Certificates (v2 API - frontend compatibility) - requires graduation feature
    Route::middleware(['feature:graduation'])->group(function () {
        Route::get('/certificates/issued', [IssuedCertificateController::class, 'index']);
        Route::get('/certificates/issued/{id}', [IssuedCertificateController::class, 'show']);
        Route::get('/certificates/issued/{id}/data', [IssuedCertificateController::class, 'getCertificateData']);
        Route::get('/certificates/issued/{id}/pdf', [IssuedCertificateController::class, 'downloadPdf']);
        Route::get('/certificates/batches/{batchId}/pdf', [IssuedCertificateController::class, 'downloadBatchZip']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/certificates/issued/{id}/revoke', [IssuedCertificateController::class, 'revoke']);
        });
    });

        // Leave Requests (requires leave_management feature)
        Route::middleware(['feature:leave_management'])->group(function () {
            Route::get('/leave-requests/{id}/print', [LeaveRequestController::class, 'printData']);
            Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
            Route::get('/leave-requests/{leave_request}', [LeaveRequestController::class, 'show']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']);
                Route::post('/leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']);
                Route::post('/leave-requests/generate-report', [LeaveRequestController::class, 'generateReport']);
                Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
                Route::put('/leave-requests/{leave_request}', [LeaveRequestController::class, 'update']);
                Route::delete('/leave-requests/{leave_request}', [LeaveRequestController::class, 'destroy']);
            });
        });

        // Dashboard
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // ============================================
    // Finance Module (requires finance feature)
    // ============================================
    Route::middleware(['feature:finance'])->group(function () {
        // Finance Accounts (cash locations) with limit enforcement
        Route::get('/finance-accounts', [\App\Http\Controllers\FinanceAccountController::class, 'index']);
        Route::get('/finance-accounts/{finance_account}', [\App\Http\Controllers\FinanceAccountController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/finance-accounts', [\App\Http\Controllers\FinanceAccountController::class, 'store'])->middleware('limit:finance_accounts');
            Route::put('/finance-accounts/{finance_account}', [\App\Http\Controllers\FinanceAccountController::class, 'update']);
            Route::delete('/finance-accounts/{finance_account}', [\App\Http\Controllers\FinanceAccountController::class, 'destroy']);
        });

        // Income Categories
        Route::get('/income-categories', [\App\Http\Controllers\IncomeCategoryController::class, 'index']);
        Route::get('/income-categories/{income_category}', [\App\Http\Controllers\IncomeCategoryController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/income-categories', [\App\Http\Controllers\IncomeCategoryController::class, 'store']);
            Route::put('/income-categories/{income_category}', [\App\Http\Controllers\IncomeCategoryController::class, 'update']);
            Route::delete('/income-categories/{income_category}', [\App\Http\Controllers\IncomeCategoryController::class, 'destroy']);
        });

        // Expense Categories
        Route::get('/expense-categories', [\App\Http\Controllers\ExpenseCategoryController::class, 'index']);
        Route::get('/expense-categories/{expense_category}', [\App\Http\Controllers\ExpenseCategoryController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/expense-categories', [\App\Http\Controllers\ExpenseCategoryController::class, 'store']);
            Route::put('/expense-categories/{expense_category}', [\App\Http\Controllers\ExpenseCategoryController::class, 'update']);
            Route::delete('/expense-categories/{expense_category}', [\App\Http\Controllers\ExpenseCategoryController::class, 'destroy']);
        });

        // Finance Projects
        Route::get('/finance-projects/{id}/summary', [\App\Http\Controllers\FinanceProjectController::class, 'summary']);
        Route::get('/finance-projects', [\App\Http\Controllers\FinanceProjectController::class, 'index']);
        Route::get('/finance-projects/{finance_project}', [\App\Http\Controllers\FinanceProjectController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/finance-projects', [\App\Http\Controllers\FinanceProjectController::class, 'store']);
            Route::put('/finance-projects/{finance_project}', [\App\Http\Controllers\FinanceProjectController::class, 'update']);
            Route::delete('/finance-projects/{finance_project}', [\App\Http\Controllers\FinanceProjectController::class, 'destroy']);
        });

        // Donors
        Route::get('/donors/{id}/summary', [\App\Http\Controllers\DonorController::class, 'summary']);
        Route::get('/donors', [\App\Http\Controllers\DonorController::class, 'index']);
        Route::get('/donors/{donor}', [\App\Http\Controllers\DonorController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/donors', [\App\Http\Controllers\DonorController::class, 'store']);
            Route::put('/donors/{donor}', [\App\Http\Controllers\DonorController::class, 'update']);
            Route::delete('/donors/{donor}', [\App\Http\Controllers\DonorController::class, 'destroy']);
        });

        // Income Entries with limit enforcement
        Route::get('/income-entries', [\App\Http\Controllers\IncomeEntryController::class, 'index']);
        Route::get('/income-entries/{income_entry}', [\App\Http\Controllers\IncomeEntryController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/income-entries', [\App\Http\Controllers\IncomeEntryController::class, 'store'])->middleware('limit:income_entries');
            Route::put('/income-entries/{income_entry}', [\App\Http\Controllers\IncomeEntryController::class, 'update']);
            Route::delete('/income-entries/{income_entry}', [\App\Http\Controllers\IncomeEntryController::class, 'destroy']);
        });

        // Expense Entries with limit enforcement
        Route::get('/expense-entries', [\App\Http\Controllers\ExpenseEntryController::class, 'index']);
        Route::get('/expense-entries/{expense_entry}', [\App\Http\Controllers\ExpenseEntryController::class, 'show']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/expense-entries', [\App\Http\Controllers\ExpenseEntryController::class, 'store'])->middleware('limit:expense_entries');
            Route::put('/expense-entries/{expense_entry}', [\App\Http\Controllers\ExpenseEntryController::class, 'update']);
            Route::delete('/expense-entries/{expense_entry}', [\App\Http\Controllers\ExpenseEntryController::class, 'destroy']);
        });

        // Finance Reports
        Route::get('/finance/dashboard', [\App\Http\Controllers\FinanceReportController::class, 'dashboard']);
        Route::get('/finance/reports/daily-cashbook', [\App\Http\Controllers\FinanceReportController::class, 'dailyCashbook']);
        Route::get('/finance/reports/income-vs-expense', [\App\Http\Controllers\FinanceReportController::class, 'incomeVsExpense']);
        Route::get('/finance/reports/project-summary', [\App\Http\Controllers\FinanceReportController::class, 'projectSummary']);
        Route::get('/finance/reports/donor-summary', [\App\Http\Controllers\FinanceReportController::class, 'donorSummary']);
        Route::get('/finance/reports/account-balances', [\App\Http\Controllers\FinanceReportController::class, 'accountBalances']);
    });

    // Fees (requires fees feature)
    Route::middleware(['feature:fees'])->group(function () {
        Route::get('/fees/structures', [FeeStructureController::class, 'index']);
        Route::get('/fees/structures/{id}', [FeeStructureController::class, 'show']);
        Route::get('/fees/assignments', [FeeAssignmentController::class, 'index']);
        Route::get('/fees/payments', [FeePaymentController::class, 'index']);
        Route::get('/fees/exceptions', [FeeExceptionController::class, 'index']);
        Route::get('/fees/exceptions/{id}', [FeeExceptionController::class, 'show']);
        Route::get('/fees/reports/dashboard', [FeeReportController::class, 'dashboard']);
        Route::get('/fees/reports/students', [FeeReportController::class, 'studentFees']);
        Route::get('/fees/reports/collection', [FeeReportController::class, 'collectionReport']);
        Route::get('/fees/reports/defaulters', [FeeReportController::class, 'defaulters']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/fees/structures', [FeeStructureController::class, 'store']);
            Route::put('/fees/structures/{id}', [FeeStructureController::class, 'update']);
            Route::patch('/fees/structures/{id}', [FeeStructureController::class, 'update']);
            Route::delete('/fees/structures/{id}', [FeeStructureController::class, 'destroy']);
            Route::post('/fees/assignments', [FeeAssignmentController::class, 'store']);
            Route::put('/fees/assignments/{id}', [FeeAssignmentController::class, 'update']);
            Route::patch('/fees/assignments/{id}', [FeeAssignmentController::class, 'update']);
            Route::delete('/fees/assignments/{id}', [FeeAssignmentController::class, 'destroy']);
            Route::post('/fees/payments', [FeePaymentController::class, 'store']);
            Route::post('/fees/exceptions', [FeeExceptionController::class, 'store']);
            Route::put('/fees/exceptions/{id}', [FeeExceptionController::class, 'update']);
            Route::patch('/fees/exceptions/{id}', [FeeExceptionController::class, 'update']);
            Route::delete('/fees/exceptions/{id}', [FeeExceptionController::class, 'destroy']);
        });
    });

    // Currency Management (requires multi_currency feature)
    Route::middleware(['feature:multi_currency'])->group(function () {
        Route::get('/currencies', [\App\Http\Controllers\CurrencyController::class, 'index']);
        Route::get('/currencies/{currency}', [\App\Http\Controllers\CurrencyController::class, 'show']);
        Route::get('/exchange-rates', [\App\Http\Controllers\ExchangeRateController::class, 'index']);
        Route::get('/exchange-rates/{exchange_rate}', [\App\Http\Controllers\ExchangeRateController::class, 'show']);
        Route::post('/exchange-rates/convert', [\App\Http\Controllers\ExchangeRateController::class, 'convert']);
        Route::middleware(['subscription:write'])->group(function () {
            Route::post('/currencies', [\App\Http\Controllers\CurrencyController::class, 'store']);
            Route::put('/currencies/{currency}', [\App\Http\Controllers\CurrencyController::class, 'update']);
            Route::delete('/currencies/{currency}', [\App\Http\Controllers\CurrencyController::class, 'destroy']);
            Route::post('/exchange-rates', [\App\Http\Controllers\ExchangeRateController::class, 'store']);
            Route::put('/exchange-rates/{exchange_rate}', [\App\Http\Controllers\ExchangeRateController::class, 'update']);
            Route::delete('/exchange-rates/{exchange_rate}', [\App\Http\Controllers\ExchangeRateController::class, 'destroy']);
        });
    });

        // Document Management System (DMS) - requires dms feature with limit enforcement
        Route::middleware(['feature:dms'])->group(function () {
            Route::get('/dms/dashboard', [DocumentReportsController::class, 'dashboard']);
            Route::get('/dms/reports/distribution', [DocumentReportsController::class, 'distribution']);
            Route::get('/dms/archive', ArchiveSearchController::class);
            Route::get('/dms/settings', [DocumentSettingsController::class, 'show']);
            Route::get('/dms/departments', [DmsDepartmentsController::class, 'index']);
            Route::get('/dms/departments/stats', [DmsDepartmentsController::class, 'stats']);
            Route::get('/dms/departments/{id}', [DmsDepartmentsController::class, 'show']);
            Route::get('/dms/incoming', [IncomingDocumentsController::class, 'index']);
            Route::get('/dms/incoming/{id}', [IncomingDocumentsController::class, 'show']);
            Route::get('/dms/outgoing', [OutgoingDocumentsController::class, 'index']);
            Route::get('/dms/outgoing/{id}', [OutgoingDocumentsController::class, 'show']);
            Route::get('/dms/outgoing/{id}/pdf', [OutgoingDocumentsController::class, 'downloadPdf']);
            Route::get('/dms/templates', [LetterTemplatesController::class, 'index']);
            Route::get('/dms/templates/fields/available', [LetterTemplatesController::class, 'getAvailableFields']);
            Route::get('/dms/templates/{id}', [LetterTemplatesController::class, 'show']);
            Route::get('/dms/letterheads', [LetterheadsController::class, 'index']);
            Route::get('/dms/letterheads/{id}', [LetterheadsController::class, 'show']);
            Route::get('/dms/letterheads/{id}/download', [LetterheadsController::class, 'download']);
            Route::get('/dms/letterheads/{id}/serve', [LetterheadsController::class, 'serve'])->name('dms.letterheads.serve');
            Route::get('/dms/letterheads/{id}/preview', [LetterheadsController::class, 'preview'])->name('dms.letterheads.preview');
            Route::get('/dms/letter-types', [LetterTypesController::class, 'index']);
            Route::get('/dms/letter-types/{id}', [LetterTypesController::class, 'show']);
            Route::get('/dms/files', [DocumentFilesController::class, 'index']);
            Route::get('/dms/files/{id}/download', [DocumentFilesController::class, 'download']);
            
            Route::middleware(['subscription:write'])->group(function () {
                Route::put('/dms/settings', [DocumentSettingsController::class, 'update']);
                Route::post('/dms/departments', [DmsDepartmentsController::class, 'store']);
                Route::put('/dms/departments/{id}', [DmsDepartmentsController::class, 'update']);
                Route::delete('/dms/departments/{id}', [DmsDepartmentsController::class, 'destroy']);
                Route::post('/dms/incoming', [IncomingDocumentsController::class, 'store'])->middleware('limit:documents');
                Route::put('/dms/incoming/{id}', [IncomingDocumentsController::class, 'update']);
                Route::post('/dms/outgoing', [OutgoingDocumentsController::class, 'store'])->middleware('limit:documents');
                Route::put('/dms/outgoing/{id}', [OutgoingDocumentsController::class, 'update']);
                Route::post('/dms/templates', [LetterTemplatesController::class, 'store']);
                Route::post('/dms/templates/preview-draft', [LetterTemplatesController::class, 'previewDraft']);
                Route::put('/dms/templates/{id}', [LetterTemplatesController::class, 'update']);
                Route::delete('/dms/templates/{id}', [LetterTemplatesController::class, 'destroy']);
                Route::post('/dms/templates/{id}/duplicate', [LetterTemplatesController::class, 'duplicate']);
                Route::post('/dms/templates/{id}/preview', [LetterTemplatesController::class, 'preview']);
                Route::post('/dms/templates/{id}/preview-pdf', [LetterTemplatesController::class, 'previewPdf']);
                Route::post('/dms/letterheads', [LetterheadsController::class, 'store']);
                Route::put('/dms/letterheads/{id}', [LetterheadsController::class, 'update']);
                Route::delete('/dms/letterheads/{id}', [LetterheadsController::class, 'destroy']);
                Route::post('/dms/letter-types', [LetterTypesController::class, 'store']);
                Route::put('/dms/letter-types/{id}', [LetterTypesController::class, 'update']);
                Route::delete('/dms/letter-types/{id}', [LetterTypesController::class, 'destroy']);
                Route::post('/dms/files', [DocumentFilesController::class, 'store']);
            });
        });

    // ============================================
        // Central Reporting System (requires reports feature with limit enforcement)
        // ============================================
        Route::middleware(['feature:reports'])->group(function () {
            Route::get('/reports', [\App\Http\Controllers\ReportGenerationController::class, 'index']);
            Route::get('/reports/{id}/status', [\App\Http\Controllers\ReportGenerationController::class, 'status']);
            Route::get('/reports/{id}/download', [\App\Http\Controllers\ReportGenerationController::class, 'download']);
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/reports/generate', [\App\Http\Controllers\ReportGenerationController::class, 'generate'])->middleware('limit:report_exports');
                Route::delete('/reports/{id}', [\App\Http\Controllers\ReportGenerationController::class, 'destroy']);
            });
        });

        // Events & Guests Module (requires events feature with limit enforcement)
        // ============================================
        Route::middleware(['feature:events'])->group(function () {
            // Event Types (Form Designer)
            Route::get('/event-types', [\App\Http\Controllers\EventTypeController::class, 'index']);
            Route::get('/event-types/{id}', [\App\Http\Controllers\EventTypeController::class, 'show']);
            Route::get('/event-types/{id}/fields', [\App\Http\Controllers\EventTypeController::class, 'getFields']);
            
            // Events
            Route::get('/events', [\App\Http\Controllers\EventController::class, 'index']);
            Route::get('/events/{id}', [\App\Http\Controllers\EventController::class, 'show']);
            Route::get('/events/{id}/stats', [\App\Http\Controllers\EventController::class, 'stats']);
            
            // Event Guests
            Route::get('/events/{eventId}/guests', [\App\Http\Controllers\EventGuestController::class, 'index']);
            Route::get('/events/{eventId}/guests/lookup', [\App\Http\Controllers\EventGuestController::class, 'lookup']);
            Route::get('/events/{eventId}/guests/{guestId}', [\App\Http\Controllers\EventGuestController::class, 'show']);
            
            // Guest Photo Upload
            Route::get('/guests/{guestId}/photo', [\App\Http\Controllers\EventGuestController::class, 'getPhoto']);
            
            // Event Check-in
            Route::get('/events/{eventId}/checkin/history', [\App\Http\Controllers\EventCheckinController::class, 'history']);
            
            // Event-specific users management
            Route::get('/events/{eventId}/users', [\App\Http\Controllers\EventUserController::class, 'index']);
            
            Route::middleware(['subscription:write'])->group(function () {
                Route::post('/event-types', [\App\Http\Controllers\EventTypeController::class, 'store']);
                Route::put('/event-types/{id}', [\App\Http\Controllers\EventTypeController::class, 'update']);
                Route::delete('/event-types/{id}', [\App\Http\Controllers\EventTypeController::class, 'destroy']);
                Route::post('/event-types/{id}/fields', [\App\Http\Controllers\EventTypeController::class, 'saveFields']);
                
                Route::post('/events', [\App\Http\Controllers\EventController::class, 'store'])->middleware('limit:events');
                Route::put('/events/{id}', [\App\Http\Controllers\EventController::class, 'update']);
                Route::delete('/events/{id}', [\App\Http\Controllers\EventController::class, 'destroy']);
                
                Route::post('/events/{eventId}/guests', [\App\Http\Controllers\EventGuestController::class, 'store']);
                Route::post('/events/{eventId}/guests/import', [\App\Http\Controllers\EventGuestController::class, 'import']);
                Route::put('/events/{eventId}/guests/{guestId}', [\App\Http\Controllers\EventGuestController::class, 'update']);
                Route::delete('/events/{eventId}/guests/{guestId}', [\App\Http\Controllers\EventGuestController::class, 'destroy']);
                
                Route::post('/guests/{guestId}/photo', [\App\Http\Controllers\EventGuestController::class, 'uploadPhoto']);
                
                Route::post('/events/{eventId}/checkin', [\App\Http\Controllers\EventCheckinController::class, 'checkin']);
                Route::post('/events/{eventId}/checkin/lookup', [\App\Http\Controllers\EventCheckinController::class, 'lookupByToken']);
                Route::delete('/events/{eventId}/checkin/{checkinId}', [\App\Http\Controllers\EventCheckinController::class, 'undoCheckin']);
                
                Route::post('/events/{eventId}/users', [\App\Http\Controllers\EventUserController::class, 'store']);
                Route::put('/events/{eventId}/users/{userId}', [\App\Http\Controllers\EventUserController::class, 'update']);
                Route::delete('/events/{eventId}/users/{userId}', [\App\Http\Controllers\EventUserController::class, 'destroy']);
            });
        });
    });
});

// Preview route (no auth required for template preview)
Route::get('/reports/preview/template', [\App\Http\Controllers\ReportGenerationController::class, 'previewTemplate']);

// =====================================================
// SUBSCRIPTION / SAAS ROUTES
// =====================================================

use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SubscriptionAdminController;
use App\Http\Controllers\TestimonialController;
use App\Http\Controllers\ContactMessageController;

// Public subscription routes
Route::get('/subscription/plans', [SubscriptionController::class, 'plans']);
Route::get('/subscription/features/all', [SubscriptionController::class, 'allFeatures']);

// Public testimonials route (for landing page)
Route::get('/testimonials', [TestimonialController::class, 'index']);

// Public contact message route (for landing page)
Route::post('/contact', [ContactMessageController::class, 'store']);

// Authenticated subscription routes (require organization context)
Route::middleware(['auth:sanctum', 'organization'])->prefix('subscription')->group(function () {
    // Current subscription status (lite version - no permission required, for all users)
    // CRITICAL: This endpoint is used for frontend gating and must be accessible to ALL authenticated users
    Route::get('/status-lite', [SubscriptionController::class, 'statusLite']);
    
    // Current subscription status (full version - requires subscription.read permission)
    Route::get('/status', [SubscriptionController::class, 'status']);
    Route::get('/usage', [SubscriptionController::class, 'usage']);
    Route::get('/features', [SubscriptionController::class, 'features']);
    
    // Pricing & discount codes
    Route::post('/calculate-price', [SubscriptionController::class, 'calculatePrice']);
    Route::post('/validate-discount', [SubscriptionController::class, 'validateDiscountCode']);
    
    // Renewal requests
    Route::post('/renewal-request', [SubscriptionController::class, 'createRenewalRequest']);
    Route::get('/renewal-history', [SubscriptionController::class, 'renewalHistory']);
    
    // Payments
    Route::post('/submit-payment', [SubscriptionController::class, 'submitPayment']);
    Route::get('/payment-history', [SubscriptionController::class, 'paymentHistory']);
    
    // History
    Route::get('/history', [SubscriptionController::class, 'subscriptionHistory']);
    
    // Maintenance Fees (recurring payments)
    Route::prefix('maintenance-fees')->group(function () {
        Route::get('/', [MaintenanceFeeController::class, 'status']);
        Route::get('/upcoming', [MaintenanceFeeController::class, 'upcoming']);
        Route::get('/invoices', [MaintenanceFeeController::class, 'invoices']);
        Route::get('/invoices/{id}', [MaintenanceFeeController::class, 'showInvoice']);
        Route::post('/pay', [MaintenanceFeeController::class, 'submitPayment']);
        Route::get('/payment-history', [MaintenanceFeeController::class, 'paymentHistory']);
    });
    
    // License Fees (one-time payments)
    Route::prefix('license-fees')->group(function () {
        Route::get('/', [LicenseFeeController::class, 'status']);
        Route::post('/pay', [LicenseFeeController::class, 'submitPayment']);
        Route::get('/payment-history', [LicenseFeeController::class, 'paymentHistory']);
    });
});

// Platform Admin routes (requires subscription.admin permission - GLOBAL, not organization-scoped)
// CRITICAL: Platform admins are NOT tied to organizations
Route::middleware(['auth:sanctum', 'platform.admin'])->prefix('platform')->group(function () {
    // Dashboard
    Route::get('/dashboard', [SubscriptionAdminController::class, 'dashboard']);
    
    // Plans management
    Route::get('/plans', [SubscriptionAdminController::class, 'listPlans']);
    Route::post('/plans', [SubscriptionAdminController::class, 'createPlan']);
    Route::put('/plans/{id}', [SubscriptionAdminController::class, 'updatePlan']);
    
    // Organization subscriptions
    Route::get('/subscriptions', [SubscriptionAdminController::class, 'listSubscriptions']);
    Route::get('/organizations/{organizationId}/subscription', [SubscriptionAdminController::class, 'getOrganizationSubscription']);
    Route::get('/organizations/{organizationId}/revenue-history', [SubscriptionAdminController::class, 'getOrganizationRevenueHistory']);
    Route::post('/organizations/{organizationId}/activate', [SubscriptionAdminController::class, 'activateSubscription']);
    Route::post('/organizations/{organizationId}/suspend', [SubscriptionAdminController::class, 'suspendSubscription']);
    Route::post('/organizations/{organizationId}/limit-override', [SubscriptionAdminController::class, 'addLimitOverride']);
    Route::post('/organizations/{organizationId}/feature-addon', [SubscriptionAdminController::class, 'addFeatureAddon']);
    Route::get('/organizations/{organizationId}/usage-snapshots', [SubscriptionAdminController::class, 'getUsageSnapshots']);
    Route::post('/organizations/{organizationId}/recalculate-usage', [SubscriptionAdminController::class, 'recalculateUsage']);
    
    // Payments & renewals
    Route::get('/payments/pending', [SubscriptionAdminController::class, 'listPendingPayments']);
    Route::post('/payments/{paymentId}/confirm', [SubscriptionAdminController::class, 'confirmPayment']);
    Route::post('/payments/{paymentId}/reject', [SubscriptionAdminController::class, 'rejectPayment']);
    Route::get('/renewals/pending', [SubscriptionAdminController::class, 'listPendingRenewals']);
    Route::get('/renewals/{renewalId}', [SubscriptionAdminController::class, 'getRenewal']);
    Route::post('/renewals/{renewalId}/approve', [SubscriptionAdminController::class, 'approveRenewal']);
    Route::post('/renewals/{renewalId}/reject', [SubscriptionAdminController::class, 'rejectRenewal']);
    
    // Organizations management
    Route::get('/organizations', [SubscriptionAdminController::class, 'listOrganizations']);
    Route::post('/organizations', [OrganizationController::class, 'storePlatformAdmin']);
    
    // Organization admins - MUST be before /organizations/{id} to avoid route conflict
    Route::get('/organizations/admins', [OrganizationController::class, 'admins']);
    
    // Platform admin - User permissions management (can manage permissions for users in any organization)
    Route::get('/permissions/all', [PermissionController::class, 'platformAdminAllPermissions']); // All permissions for global groups
    Route::get('/organizations/{organizationId}/permissions', [PermissionController::class, 'platformAdminOrganizationPermissions']);
    Route::get('/users/{userId}/permissions', [PermissionController::class, 'platformAdminUserPermissions']);
    Route::post('/users/{userId}/permissions/assign', [PermissionController::class, 'platformAdminAssignPermissionToUser']);
    Route::post('/users/{userId}/permissions/remove', [PermissionController::class, 'platformAdminRemovePermissionFromUser']);
    
    // Permission Groups Management (Platform Admin) - Global groups
    Route::get('/permission-groups', [PermissionController::class, 'platformAdminListPermissionGroups']);
    Route::post('/permission-groups', [PermissionController::class, 'platformAdminCreatePermissionGroup']);
    Route::put('/permission-groups/{groupId}', [PermissionController::class, 'platformAdminUpdatePermissionGroup']);
    Route::delete('/permission-groups/{groupId}', [PermissionController::class, 'platformAdminDeletePermissionGroup']);
    Route::post('/users/{userId}/permission-groups/assign', [PermissionController::class, 'platformAdminAssignPermissionGroupToUser']);
    Route::post('/users/{userId}/permission-groups/remove', [PermissionController::class, 'platformAdminRemovePermissionGroupFromUser']);
    
    // Organization CRUD - MUST be after /organizations/admins
    Route::get('/organizations/{id}', [OrganizationController::class, 'showPlatformAdmin']);
    Route::put('/organizations/{id}', [OrganizationController::class, 'updatePlatformAdmin']);
    Route::delete('/organizations/{id}', [OrganizationController::class, 'destroyPlatformAdmin']);
    Route::post('/organizations/{organizationId}/features/{featureKey}/toggle', [SubscriptionAdminController::class, 'toggleFeature']);
    
    // Discount codes
    Route::get('/discount-codes', [SubscriptionAdminController::class, 'listDiscountCodes']);
    Route::post('/discount-codes', [SubscriptionAdminController::class, 'createDiscountCode']);
    Route::put('/discount-codes/{id}', [SubscriptionAdminController::class, 'updateDiscountCode']);
    Route::delete('/discount-codes/{id}', [SubscriptionAdminController::class, 'deleteDiscountCode']);
    
    // Plan requests (Enterprise contact requests)
    Route::get('/plan-requests', [\App\Http\Controllers\LandingController::class, 'listPlanRequests']);
    Route::get('/plan-requests/{id}', [\App\Http\Controllers\LandingController::class, 'getPlanRequest']);
    
    // Feature & Limit Definitions
    Route::get('/feature-definitions', [SubscriptionAdminController::class, 'listFeatureDefinitions']);
    Route::get('/limit-definitions', [SubscriptionAdminController::class, 'listLimitDefinitions']);
    
    // System Operations
    Route::post('/process-transitions', [SubscriptionAdminController::class, 'processStatusTransitions']);
    
    // Maintenance Fees (Platform Admin)
    Route::prefix('maintenance-fees')->group(function () {
        Route::get('/', [SubscriptionAdminController::class, 'listMaintenanceFees']);
        Route::get('/overdue', [SubscriptionAdminController::class, 'listOverdueMaintenanceFees']);
        Route::get('/invoices', [SubscriptionAdminController::class, 'listMaintenanceInvoices']);
        Route::post('/generate-invoices', [SubscriptionAdminController::class, 'generateMaintenanceInvoices']);
        Route::post('/payments/{paymentId}/confirm', [SubscriptionAdminController::class, 'confirmMaintenancePayment']);
    });
    
    // License Fees (Platform Admin)
    Route::prefix('license-fees')->group(function () {
        Route::get('/unpaid', [SubscriptionAdminController::class, 'listUnpaidLicenseFees']);
        Route::get('/payments', [SubscriptionAdminController::class, 'listLicensePayments']);
        Route::post('/payments/{paymentId}/confirm', [SubscriptionAdminController::class, 'confirmLicensePayment']);
    });
    
    // Platform admin permissions (global, not organization-scoped)
    Route::get('/permissions/platform-admin', [PermissionController::class, 'platformAdminPermissions']);
    
    // Platform admin users (users with subscription.admin permission)
    Route::get('/users', [SubscriptionAdminController::class, 'listPlatformUsers']);
    Route::post('/users', [SubscriptionAdminController::class, 'createPlatformUser']);
    Route::put('/users/{id}', [SubscriptionAdminController::class, 'updatePlatformUser']);
    Route::delete('/users/{id}', [SubscriptionAdminController::class, 'deletePlatformUser']);
    Route::post('/users/{id}/reset-password', [SubscriptionAdminController::class, 'resetPlatformUserPassword']);
    
    // Testimonials management
    Route::get('/testimonials', [TestimonialController::class, 'adminIndex']);
    Route::post('/testimonials', [TestimonialController::class, 'store']);
    Route::put('/testimonials/{id}', [TestimonialController::class, 'update']);
    Route::delete('/testimonials/{id}', [TestimonialController::class, 'destroy']);
    
    // Contact messages management
    Route::get('/contact-messages', [ContactMessageController::class, 'adminIndex']);
    Route::get('/contact-messages/stats', [ContactMessageController::class, 'stats']);
    Route::get('/contact-messages/{id}', [ContactMessageController::class, 'show']);
    Route::put('/contact-messages/{id}', [ContactMessageController::class, 'update']);
    Route::delete('/contact-messages/{id}', [ContactMessageController::class, 'destroy']);
    
    // Help Center management (platform admin - no organization filter)
    Route::prefix('help-center')->group(function () {
        // Categories CRUD
        Route::get('/categories', [HelpCenterCategoryController::class, 'platformIndex']);
        Route::post('/categories', [HelpCenterCategoryController::class, 'platformStore']);
        Route::put('/categories/{id}', [HelpCenterCategoryController::class, 'platformUpdate']);
        Route::delete('/categories/{id}', [HelpCenterCategoryController::class, 'platformDestroy']);
        
        // Articles CRUD
        Route::get('/articles', [HelpCenterArticleController::class, 'platformIndex']);
        Route::post('/articles', [HelpCenterArticleController::class, 'platformStore']);
        Route::put('/articles/{id}', [HelpCenterArticleController::class, 'platformUpdate']);
        Route::delete('/articles/{id}', [HelpCenterArticleController::class, 'platformDestroy']);
    });

    // Backup & Restore
    Route::get('/backups', [App\Http\Controllers\BackupController::class, 'listBackups']);
    Route::post('/backups', [App\Http\Controllers\BackupController::class, 'createBackup']);
    Route::get('/backups/{filename}/download', [App\Http\Controllers\BackupController::class, 'downloadBackup']);
    Route::delete('/backups/{filename}', [App\Http\Controllers\BackupController::class, 'deleteBackup']);
    Route::post('/backups/{filename}/restore', [App\Http\Controllers\BackupController::class, 'restoreBackup']);
    Route::post('/backups/upload-restore', [App\Http\Controllers\BackupController::class, 'uploadAndRestore']);

    // Maintenance Mode
    Route::get('/maintenance/status', [App\Http\Controllers\MaintenanceController::class, 'getStatus']);
    Route::post('/maintenance/enable', [App\Http\Controllers\MaintenanceController::class, 'enable']);
    Route::post('/maintenance/disable', [App\Http\Controllers\MaintenanceController::class, 'disable']);
    Route::get('/maintenance/history', [App\Http\Controllers\MaintenanceController::class, 'history']);
    
    // Desktop License Management
    Route::prefix('desktop-licenses')->group(function () {
        // License Keys
        Route::get('/keys', [App\Http\Controllers\DesktopLicenseController::class, 'listKeys']);
        Route::post('/keys', [App\Http\Controllers\DesktopLicenseController::class, 'generateKeyPair']);
        Route::get('/keys/{id}', [App\Http\Controllers\DesktopLicenseController::class, 'getKey']);
        Route::put('/keys/{id}', [App\Http\Controllers\DesktopLicenseController::class, 'updateKey']);
        Route::delete('/keys/{id}', [App\Http\Controllers\DesktopLicenseController::class, 'deleteKey']);
        
        // License Operations
        Route::post('/sign', [App\Http\Controllers\DesktopLicenseController::class, 'signLicense']);
        Route::post('/verify', [App\Http\Controllers\DesktopLicenseController::class, 'verifyLicense']);
        
        // Desktop Licenses
        Route::get('/', [App\Http\Controllers\DesktopLicenseController::class, 'listLicenses']);
        Route::get('/{id}', [App\Http\Controllers\DesktopLicenseController::class, 'getLicense']);
        Route::get('/{id}/download', [App\Http\Controllers\DesktopLicenseController::class, 'downloadLicense']);
        Route::delete('/{id}', [App\Http\Controllers\DesktopLicenseController::class, 'deleteLicense']);
    });
});

// Legacy admin subscription routes (kept for backward compatibility, but will be deprecated)
// These still require organization middleware but should migrate to platform routes
Route::middleware(['auth:sanctum', 'organization'])->prefix('admin/subscription')->group(function () {
    // Dashboard
    Route::get('/dashboard', [SubscriptionAdminController::class, 'dashboard']);
    
    // Plans management
    Route::get('/plans', [SubscriptionAdminController::class, 'listPlans']);
    Route::post('/plans', [SubscriptionAdminController::class, 'createPlan']);
    Route::put('/plans/{id}', [SubscriptionAdminController::class, 'updatePlan']);
    
    // Organization subscriptions
    Route::get('/subscriptions', [SubscriptionAdminController::class, 'listSubscriptions']);
    Route::get('/organizations/{organizationId}/subscription', [SubscriptionAdminController::class, 'getOrganizationSubscription']);
    Route::get('/organizations/{organizationId}/revenue-history', [SubscriptionAdminController::class, 'getOrganizationRevenueHistory']);
    Route::post('/organizations/{organizationId}/activate', [SubscriptionAdminController::class, 'activateSubscription']);
    Route::post('/organizations/{organizationId}/suspend', [SubscriptionAdminController::class, 'suspendSubscription']);
    Route::post('/organizations/{organizationId}/limit-override', [SubscriptionAdminController::class, 'addLimitOverride']);
    Route::post('/organizations/{organizationId}/feature-addon', [SubscriptionAdminController::class, 'addFeatureAddon']);
    Route::get('/organizations/{organizationId}/usage-snapshots', [SubscriptionAdminController::class, 'getUsageSnapshots']);
    Route::post('/organizations/{organizationId}/recalculate-usage', [SubscriptionAdminController::class, 'recalculateUsage']);
    
    // Payments & renewals
    Route::get('/payments/pending', [SubscriptionAdminController::class, 'listPendingPayments']);
    Route::post('/payments/{paymentId}/confirm', [SubscriptionAdminController::class, 'confirmPayment']);
    Route::post('/payments/{paymentId}/reject', [SubscriptionAdminController::class, 'rejectPayment']);
    Route::get('/renewals/pending', [SubscriptionAdminController::class, 'listPendingRenewals']);
    Route::get('/renewals/{renewalId}', [SubscriptionAdminController::class, 'getRenewal']);
    Route::post('/renewals/{renewalId}/approve', [SubscriptionAdminController::class, 'approveRenewal']);
    Route::post('/renewals/{renewalId}/reject', [SubscriptionAdminController::class, 'rejectRenewal']);
    
    // Organizations (for subscription admin - all organizations)
    Route::get('/organizations', [SubscriptionAdminController::class, 'listOrganizations']);
    Route::post('/organizations/{organizationId}/features/{featureKey}/toggle', [SubscriptionAdminController::class, 'toggleFeature']);
    
    // Discount codes
    Route::get('/discount-codes', [SubscriptionAdminController::class, 'listDiscountCodes']);
    Route::post('/discount-codes', [SubscriptionAdminController::class, 'createDiscountCode']);
    Route::put('/discount-codes/{id}', [SubscriptionAdminController::class, 'updateDiscountCode']);
    Route::delete('/discount-codes/{id}', [SubscriptionAdminController::class, 'deleteDiscountCode']);
    
    // Definitions
    Route::get('/feature-definitions', [SubscriptionAdminController::class, 'listFeatureDefinitions']);
    Route::get('/limit-definitions', [SubscriptionAdminController::class, 'listLimitDefinitions']);
    
    // System operations
    Route::post('/process-transitions', [SubscriptionAdminController::class, 'processStatusTransitions']);
});
