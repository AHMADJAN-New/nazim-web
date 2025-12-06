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
use App\Http\Controllers\ExamController;
use App\Http\Controllers\ExamClassController;
use App\Http\Controllers\ExamSubjectController;
use App\Http\Controllers\ExamReportController;
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

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Public stats endpoints (for landing page)
// Note: These return aggregate counts across all organizations
// Consider protecting if aggregate data is sensitive
Route::get('/stats/students-count', [StatsController::class, 'studentsCount']);
Route::get('/stats/staff-count', [StatsController::class, 'staffCount']);

// Public organizations endpoint (for signup form - returns minimal data only)
Route::get('/organizations/public', [OrganizationController::class, 'publicList']);

// Protected routes
Route::middleware(['auth:sanctum', 'org.context'])->group(function () {
    // Auth routes
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

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

    // Buildings
    Route::apiResource('buildings', BuildingController::class);

    // Rooms
    Route::apiResource('rooms', RoomController::class);

    // Staff
    Route::get('/staff/stats', [StaffController::class, 'stats']);
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
    Route::apiResource('student-admissions', StudentAdmissionController::class);

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
    Route::apiResource('exam-classes', ExamClassController::class)->only(['index', 'store', 'destroy']);
    Route::apiResource('exam-subjects', ExamSubjectController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/exams/{id}/report', [ExamReportController::class, 'show']);

    // Academic Years
    Route::apiResource('academic-years', AcademicYearController::class);

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
});
