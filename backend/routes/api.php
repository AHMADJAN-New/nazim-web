<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\BuildingController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\ClassController;
use App\Http\Controllers\SubjectController;
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

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Public stats endpoints (for landing page)
Route::get('/stats/students-count', [StatsController::class, 'studentsCount']);
Route::get('/stats/staff-count', [StatsController::class, 'staffCount']);

// Public organizations endpoint (for signup form)
Route::get('/organizations', [OrganizationController::class, 'index']);

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {
    // Auth routes
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

    // Organizations (protected - create, update, delete)
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
    Route::get('/permissions/user', [PermissionController::class, 'userPermissions']);

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
    Route::apiResource('students', StudentController::class);
    Route::post('/students/{id}/picture', [StudentController::class, 'uploadPicture']);
    
    // Student Documents
    Route::get('/students/{id}/documents', [StudentDocumentController::class, 'index']);
    Route::post('/students/{id}/documents', [StudentDocumentController::class, 'store']);
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

    // Classes
    Route::apiResource('classes', ClassController::class);
    Route::post('/classes/{class}/assign-to-year', [ClassController::class, 'assignToYear']);
    Route::post('/classes/bulk-assign-sections', [ClassController::class, 'bulkAssignSections']);
    Route::put('/classes/academic-years/{id}', [ClassController::class, 'updateInstance']);
    Route::delete('/classes/academic-years/{id}', [ClassController::class, 'removeFromYear']);
    Route::post('/classes/copy-between-years', [ClassController::class, 'copyBetweenYears']);
    Route::get('/classes/{class}/academic-years', [ClassController::class, 'academicYears']);
    Route::get('/classes/academic-years', [ClassController::class, 'byAcademicYear']);

    // Subjects
    Route::apiResource('subjects', SubjectController::class);

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
