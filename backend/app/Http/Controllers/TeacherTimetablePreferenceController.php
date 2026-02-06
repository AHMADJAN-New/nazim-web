<?php

namespace App\Http\Controllers;

use App\Models\TeacherTimetablePreference;
use App\Http\Requests\StoreTeacherTimetablePreferenceRequest;
use App\Http\Requests\UpdateTeacherTimetablePreferenceRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TeacherTimetablePreferenceController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of teacher timetable preferences
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission (all users)
            try {
                if (!$user->hasPermissionTo('teacher_timetable_preferences.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for teacher_timetable_preferences.read - allowing access: " . $e->getMessage());
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $query = TeacherTimetablePreference::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId);

            // Try to eager load relationships, but don't fail if they don't exist
            try {
                $query->with(['academicYear', 'teacher']);
            } catch (\Exception $e) {
                Log::warning("Failed to eager load relationships for teacher timetable preferences: " . $e->getMessage());
            }

            // Filter by teacher_id if provided
            if ($request->has('teacher_id') && $request->teacher_id) {
                $query->where('teacher_id', $request->teacher_id);
            }

            // Filter by academic_year_id if provided
            if ($request->has('academic_year_id') && $request->academic_year_id) {
                $query->where('academic_year_id', $request->academic_year_id);
            }

            $preferences = $query->orderBy('created_at', 'desc')->get();

            // Format response
            $formatted = $preferences->map(function ($pref) {
                try {
                    return [
                        'id' => $pref->id,
                        'organization_id' => $pref->organization_id,
                        'academic_year_id' => $pref->academic_year_id,
                        'teacher_id' => $pref->teacher_id,
                        'schedule_slot_ids' => $pref->schedule_slot_ids,
                        'is_active' => $pref->is_active,
                        'notes' => $pref->notes,
                        'created_at' => $pref->created_at,
                        'updated_at' => $pref->updated_at,
                        'academic_year' => $pref->relationLoaded('academicYear') && $pref->academicYear ? [
                            'id' => $pref->academicYear->id,
                            'name' => $pref->academicYear->name,
                        ] : null,
                        'teacher' => $pref->relationLoaded('teacher') && $pref->teacher ? [
                            'id' => $pref->teacher->id,
                            'full_name' => $pref->teacher->full_name,
                        ] : null,
                    ];
                } catch (\Exception $e) {
                    Log::warning("Failed to format teacher timetable preference: " . $e->getMessage());
                    return [
                        'id' => $pref->id,
                        'organization_id' => $pref->organization_id,
                        'academic_year_id' => $pref->academic_year_id,
                        'teacher_id' => $pref->teacher_id,
                        'schedule_slot_ids' => $pref->schedule_slot_ids,
                        'is_active' => $pref->is_active,
                        'notes' => $pref->notes,
                        'created_at' => $pref->created_at,
                        'updated_at' => $pref->updated_at,
                        'academic_year' => null,
                        'teacher' => null,
                    ];
                }
            });

            return response()->json($formatted);
        } catch (\Exception $e) {
            Log::error('Error fetching teacher timetable preferences: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Failed to fetch teacher timetable preferences: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created teacher timetable preference
     */
    public function store(StoreTeacherTimetablePreferenceRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('teacher_timetable_preferences.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_timetable_preferences.create - allowing access: " . $e->getMessage());
        }

        $validated = $request->validated();

        $organizationId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $preference = TeacherTimetablePreference::create([
            'teacher_id' => $validated['teacher_id'],
            'schedule_slot_ids' => $validated['schedule_slot_ids'],
            'organization_id' => $organizationId,
            'school_id' => $currentSchoolId,
            'academic_year_id' => $validated['academic_year_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        $preference->load(['academicYear', 'teacher']);

        // Log teacher timetable preference creation
        try {
            $teacherName = $preference->teacher?->full_name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $preference,
                description: "Created timetable preference for teacher {$teacherName}",
                properties: [
                    'preference_id' => $preference->id,
                    'teacher_id' => $preference->teacher_id,
                    'academic_year_id' => $preference->academic_year_id,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log teacher timetable preference creation: ' . $e->getMessage());
        }

        return response()->json([
            'id' => $preference->id,
            'organization_id' => $preference->organization_id,
            'academic_year_id' => $preference->academic_year_id,
            'teacher_id' => $preference->teacher_id,
            'schedule_slot_ids' => $preference->schedule_slot_ids,
            'is_active' => $preference->is_active,
            'notes' => $preference->notes,
            'created_at' => $preference->created_at,
            'updated_at' => $preference->updated_at,
            'academic_year' => $preference->academicYear ? [
                'id' => $preference->academicYear->id,
                'name' => $preference->academicYear->name,
            ] : null,
            'teacher' => $preference->teacher ? [
                'id' => $preference->teacher->id,
                'full_name' => $preference->teacher->full_name,
            ] : null,
        ], 201);
    }

    /**
     * Display the specified teacher timetable preference
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('teacher_timetable_preferences.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_timetable_preferences.read - allowing access: " . $e->getMessage());
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        $preference = TeacherTimetablePreference::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->with(['academicYear', 'teacher'])
            ->find($id);

        if (!$preference) {
            return response()->json(['error' => 'Teacher timetable preference not found'], 404);
        }

        return response()->json([
            'id' => $preference->id,
            'organization_id' => $preference->organization_id,
            'academic_year_id' => $preference->academic_year_id,
            'teacher_id' => $preference->teacher_id,
            'schedule_slot_ids' => $preference->schedule_slot_ids,
            'is_active' => $preference->is_active,
            'notes' => $preference->notes,
            'created_at' => $preference->created_at,
            'updated_at' => $preference->updated_at,
            'academic_year' => $preference->academicYear ? [
                'id' => $preference->academicYear->id,
                'name' => $preference->academicYear->name,
            ] : null,
            'teacher' => $preference->teacher ? [
                'id' => $preference->teacher->id,
                'full_name' => $preference->teacher->full_name,
            ] : null,
        ]);
    }

    /**
     * Update the specified teacher timetable preference
     */
    public function update(UpdateTeacherTimetablePreferenceRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('teacher_timetable_preferences.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_timetable_preferences.update - allowing access: " . $e->getMessage());
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $preference = TeacherTimetablePreference::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$preference) {
            return response()->json(['error' => 'Teacher timetable preference not found'], 404);
        }

        $validated = $request->validated();

        // Capture old values before update
        $oldValues = $preference->only(['schedule_slot_ids', 'is_active', 'notes']);

        // Update only provided fields
        if (isset($validated['schedule_slot_ids'])) {
            $preference->schedule_slot_ids = $validated['schedule_slot_ids'];
        }
        if (isset($validated['is_active'])) {
            $preference->is_active = $validated['is_active'];
        }
        if (isset($validated['notes'])) {
            $preference->notes = $validated['notes'];
        }

        $preference->save();
        $preference->load(['academicYear', 'teacher']);

        return response()->json([
            'id' => $preference->id,
            'organization_id' => $preference->organization_id,
            'academic_year_id' => $preference->academic_year_id,
            'teacher_id' => $preference->teacher_id,
            'schedule_slot_ids' => $preference->schedule_slot_ids,
            'is_active' => $preference->is_active,
            'notes' => $preference->notes,
            'created_at' => $preference->created_at,
            'updated_at' => $preference->updated_at,
            'academic_year' => $preference->academicYear ? [
                'id' => $preference->academicYear->id,
                'name' => $preference->academicYear->name,
            ] : null,
            'teacher' => $preference->teacher ? [
                'id' => $preference->teacher->id,
                'full_name' => $preference->teacher->full_name,
            ] : null,
        ]);

        // Log teacher timetable preference update
        try {
            $teacherName = $preference->teacher?->full_name ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $preference,
                description: "Updated timetable preference for teacher {$teacherName}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $preference->only(['schedule_slot_ids', 'is_active', 'notes']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log teacher timetable preference update: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified teacher timetable preference (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('teacher_timetable_preferences.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_timetable_preferences.delete - allowing access: " . $e->getMessage());
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        $preference = TeacherTimetablePreference::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$preference) {
            return response()->json(['error' => 'Teacher timetable preference not found'], 404);
        }

        // Capture data before deletion
        $preferenceData = $preference->toArray();
        $teacherName = $preference->teacher?->full_name ?? 'Unknown';

        $preference->delete();

        // Log teacher timetable preference deletion
        try {
            $this->activityLogService->logDelete(
                subject: $preference,
                description: "Deleted timetable preference for teacher {$teacherName}",
                properties: ['deleted_preference' => $preferenceData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log teacher timetable preference deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }

    /**
     * Upsert a teacher timetable preference (create or update)
     */
    public function upsert(StoreTeacherTimetablePreferenceRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('teacher_timetable_preferences.read') && !$user->hasPermissionTo('teacher_timetable_preferences.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for teacher_timetable_preferences upsert - allowing access: " . $e->getMessage());
        }

        $validated = $request->validated();

        $organizationId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check if preference exists (by teacher + academic_year + org)
        $existing = TeacherTimetablePreference::whereNull('deleted_at')
            ->where('teacher_id', $validated['teacher_id'])
            ->where('organization_id', $organizationId)
            ->where('school_id', $currentSchoolId);

        if (isset($validated['academic_year_id']) && $validated['academic_year_id']) {
            $existing->where('academic_year_id', $validated['academic_year_id']);
        } else {
            $existing->whereNull('academic_year_id');
        }

        $existingPreference = $existing->first();

        if ($existingPreference) {
            // Update existing
            $existingPreference->schedule_slot_ids = $validated['schedule_slot_ids'];
            $existingPreference->is_active = $validated['is_active'] ?? true;
            $existingPreference->notes = $validated['notes'] ?? null;
            $existingPreference->save();
            $existingPreference->load(['academicYear', 'teacher']);

            return response()->json([
                'id' => $existingPreference->id,
                'organization_id' => $existingPreference->organization_id,
                'academic_year_id' => $existingPreference->academic_year_id,
                'teacher_id' => $existingPreference->teacher_id,
                'schedule_slot_ids' => $existingPreference->schedule_slot_ids,
                'is_active' => $existingPreference->is_active,
                'notes' => $existingPreference->notes,
                'created_at' => $existingPreference->created_at,
                'updated_at' => $existingPreference->updated_at,
                'academic_year' => $existingPreference->academicYear ? [
                    'id' => $existingPreference->academicYear->id,
                    'name' => $existingPreference->academicYear->name,
                ] : null,
                'teacher' => $existingPreference->teacher ? [
                    'id' => $existingPreference->teacher->id,
                    'full_name' => $existingPreference->teacher->full_name,
                ] : null,
            ]);
        } else {
            // Create new
            $preference = TeacherTimetablePreference::create([
                'teacher_id' => $validated['teacher_id'],
                'schedule_slot_ids' => $validated['schedule_slot_ids'],
                'organization_id' => $organizationId,
                'school_id' => $currentSchoolId,
                'academic_year_id' => $validated['academic_year_id'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'notes' => $validated['notes'] ?? null,
            ]);

            $preference->load(['academicYear', 'teacher']);

            return response()->json([
                'id' => $preference->id,
                'organization_id' => $preference->organization_id,
                'academic_year_id' => $preference->academic_year_id,
                'teacher_id' => $preference->teacher_id,
                'schedule_slot_ids' => $preference->schedule_slot_ids,
                'is_active' => $preference->is_active,
                'notes' => $preference->notes,
                'created_at' => $preference->created_at,
                'updated_at' => $preference->updated_at,
                'academic_year' => $preference->academicYear ? [
                    'id' => $preference->academicYear->id,
                    'name' => $preference->academicYear->name,
                ] : null,
                'teacher' => $preference->teacher ? [
                    'id' => $preference->teacher->id,
                    'full_name' => $preference->teacher->full_name,
                ] : null,
            ], 201);
        }
    }
}



