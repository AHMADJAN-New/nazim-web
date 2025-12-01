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
    Route::put('/organizations/{id}', [OrganizationController::class, 'update']);
    Route::patch('/organizations/{id}', [OrganizationController::class, 'update']);
    Route::delete('/organizations/{id}', [OrganizationController::class, 'destroy']);
    Route::get('/organizations/{id}', [OrganizationController::class, 'show']);

    // Profiles
    Route::apiResource('profiles', ProfileController::class);
    Route::get('/profiles/me', [ProfileController::class, 'me']);

    // Permissions
    Route::get('/permissions', [PermissionController::class, 'index']);
    Route::get('/permissions/user', [PermissionController::class, 'userPermissions']);

    // Buildings
    Route::apiResource('buildings', BuildingController::class);

    // Rooms
    Route::apiResource('rooms', RoomController::class);

    // Staff
    Route::apiResource('staff', StaffController::class);

    // Students
    Route::apiResource('students', StudentController::class);
    Route::post('/students/{id}/picture', [StudentController::class, 'uploadPicture']);

    // Classes
    Route::apiResource('classes', ClassController::class);

    // Subjects
    Route::apiResource('subjects', SubjectController::class);

    // Academic Years
    Route::apiResource('academic-years', AcademicYearController::class);

    // Timetables
    Route::apiResource('timetables', TimetableController::class);

    // Schedule Slots
    Route::apiResource('schedule-slots', ScheduleSlotController::class);

    // Teacher Subject Assignments
    Route::apiResource('teacher-subject-assignments', TeacherSubjectAssignmentController::class);
});
