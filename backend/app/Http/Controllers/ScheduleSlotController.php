<?php

namespace App\Http\Controllers;

use App\Models\ScheduleSlot;
use App\Http\Requests\StoreScheduleSlotRequest;
use App\Http\Requests\UpdateScheduleSlotRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleSlotController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of schedule slots
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

                try {
                if (!$user->hasPermissionTo('schedule_slots.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                Log::warning("Permission check failed for schedule_slots.read - allowing access: " . $e->getMessage());
                // Allow access if permission doesn't exist (during migration)
            }

            $query = ScheduleSlot::whereNull('deleted_at')
                ->orderBy('sort_order', 'asc')
                ->orderBy('start_time', 'asc');

            // Try to eager load relationships, but don't fail if they don't exist
            try {
                $query->with(['academicYear', 'school']);
            } catch (\Exception $e) {
                Log::warning("Failed to eager load relationships for schedule slots: " . $e->getMessage());
            }

            // Strict scoping: org + school from context
            $query->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId);

            // Filter by academic_year_id if provided (still within same school)
            if ($request->has('academic_year_id') && $request->academic_year_id) {
                $query->where('academic_year_id', $request->academic_year_id);
            }

            $slots = $query->get();

            // Format response with related data
            $formatted = $slots->map(function ($slot) {
                try {
                    return [
                        'id' => $slot->id,
                        'organization_id' => $slot->organization_id,
                        'name' => $slot->name,
                        'code' => $slot->code,
                        'start_time' => $slot->start_time,
                        'end_time' => $slot->end_time,
                        'days_of_week' => $slot->days_of_week,
                        'default_duration_minutes' => $slot->default_duration_minutes,
                        'academic_year_id' => $slot->academic_year_id,
                        'school_id' => $slot->school_id,
                        'sort_order' => $slot->sort_order,
                        'is_active' => $slot->is_active,
                        'description' => $slot->description,
                        'created_at' => $slot->created_at,
                        'updated_at' => $slot->updated_at,
                        'academic_year' => $slot->relationLoaded('academicYear') && $slot->academicYear ? [
                            'id' => $slot->academicYear->id,
                            'name' => $slot->academicYear->name,
                            'start_date' => $slot->academicYear->start_date,
                            'end_date' => $slot->academicYear->end_date,
                        ] : null,
                        'school' => $slot->relationLoaded('school') && $slot->school ? [
                            'id' => $slot->school->id,
                            'school_name' => $slot->school->school_name,
                        ] : null,
                    ];
                } catch (\Exception $e) {
                    Log::warning("Failed to format schedule slot: " . $e->getMessage());
                    return [
                        'id' => $slot->id,
                        'organization_id' => $slot->organization_id,
                        'name' => $slot->name,
                        'code' => $slot->code,
                        'start_time' => $slot->start_time,
                        'end_time' => $slot->end_time,
                        'days_of_week' => $slot->days_of_week,
                        'default_duration_minutes' => $slot->default_duration_minutes,
                        'academic_year_id' => $slot->academic_year_id,
                        'school_id' => $slot->school_id,
                        'sort_order' => $slot->sort_order,
                        'is_active' => $slot->is_active,
                        'description' => $slot->description,
                        'created_at' => $slot->created_at,
                        'updated_at' => $slot->updated_at,
                        'academic_year' => null,
                        'school' => null,
                    ];
                }
            });

            return response()->json($formatted);
        } catch (\Exception $e) {
            Log::error('Error fetching schedule slots: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Failed to fetch schedule slots: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created schedule slot
     */
    public function store(StoreScheduleSlotRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('schedule_slots.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for schedule_slots.create - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        $validated = $request->validated();

        // Strict scoping: organization + school from context (ignore client input)
        $organizationId = $profile->organization_id;

        // Validate academic year belongs to current org + school if provided
        if (!empty($validated['academic_year_id'])) {
            $exists = DB::table('academic_years')
                ->where('id', $validated['academic_year_id'])
                ->where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
            if (!$exists) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }
        }

        $slot = ScheduleSlot::create([
            'name' => trim($validated['name']),
            'code' => trim($validated['code']),
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'days_of_week' => $validated['days_of_week'] ?? [],
            'default_duration_minutes' => $validated['default_duration_minutes'] ?? 45,
            'academic_year_id' => $validated['academic_year_id'] ?? null,
            'school_id' => $currentSchoolId,
            'sort_order' => $validated['sort_order'] ?? 1,
            'is_active' => $validated['is_active'] ?? true,
            'description' => $validated['description'] ?? null,
            'organization_id' => $organizationId,
        ]);

        $slot->load(['academicYear', 'school']);

        // Log schedule slot creation
        try {
            $this->activityLogService->logCreate(
                subject: $slot,
                description: "Created schedule slot: {$slot->name}",
                properties: [
                    'slot_id' => $slot->id,
                    'name' => $slot->name,
                    'code' => $slot->code,
                    'start_time' => $slot->start_time,
                    'end_time' => $slot->end_time,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log schedule slot creation: ' . $e->getMessage());
        }

        return response()->json([
            'id' => $slot->id,
            'organization_id' => $slot->organization_id,
            'name' => $slot->name,
            'code' => $slot->code,
            'start_time' => $slot->start_time,
            'end_time' => $slot->end_time,
            'days_of_week' => $slot->days_of_week,
            'default_duration_minutes' => $slot->default_duration_minutes,
            'academic_year_id' => $slot->academic_year_id,
            'school_id' => $slot->school_id,
            'sort_order' => $slot->sort_order,
            'is_active' => $slot->is_active,
            'description' => $slot->description,
            'created_at' => $slot->created_at,
            'updated_at' => $slot->updated_at,
            'academic_year' => $slot->academicYear ? [
                'id' => $slot->academicYear->id,
                'name' => $slot->academicYear->name,
                'start_date' => $slot->academicYear->start_date,
                'end_date' => $slot->academicYear->end_date,
            ] : null,
            'school' => $slot->school ? [
                'id' => $slot->school->id,
                'school_name' => $slot->school->school_name,
            ] : null,
        ], 201);
    }

    /**
     * Display the specified schedule slot
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('schedule_slots.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for schedule_slots.read - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        $slot = ScheduleSlot::whereNull('deleted_at')
            ->with(['academicYear', 'school'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$slot) {
            return response()->json(['error' => 'Schedule slot not found'], 404);
        }

        return response()->json([
            'id' => $slot->id,
            'organization_id' => $slot->organization_id,
            'name' => $slot->name,
            'code' => $slot->code,
            'start_time' => $slot->start_time,
            'end_time' => $slot->end_time,
            'days_of_week' => $slot->days_of_week,
            'default_duration_minutes' => $slot->default_duration_minutes,
            'academic_year_id' => $slot->academic_year_id,
            'school_id' => $slot->school_id,
            'sort_order' => $slot->sort_order,
            'is_active' => $slot->is_active,
            'description' => $slot->description,
            'created_at' => $slot->created_at,
            'updated_at' => $slot->updated_at,
            'academic_year' => $slot->academicYear ? [
                'id' => $slot->academicYear->id,
                'name' => $slot->academicYear->name,
                'start_date' => $slot->academicYear->start_date,
                'end_date' => $slot->academicYear->end_date,
            ] : null,
            'school' => $slot->school ? [
                'id' => $slot->school->id,
                'school_name' => $slot->school->school_name,
            ] : null,
        ]);
    }

    /**
     * Update the specified schedule slot
     */
    public function update(UpdateScheduleSlotRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('schedule_slots.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for schedule_slots.update - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        $slot = ScheduleSlot::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$slot) {
            return response()->json(['error' => 'Schedule slot not found'], 404);
        }

        $validated = $request->validated();

        // Prevent org/school changes (strict scoping)
        unset($validated['organization_id'], $validated['school_id']);

        // Capture old values before update
        $oldValues = $slot->only(['name', 'code', 'start_time', 'end_time', 'days_of_week', 'default_duration_minutes', 'academic_year_id', 'sort_order', 'is_active', 'description']);

        // Validate academic year belongs to current org + school if provided
        if (array_key_exists('academic_year_id', $validated) && !empty($validated['academic_year_id'])) {
            $exists = DB::table('academic_years')
                ->where('id', $validated['academic_year_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
            if (!$exists) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }
        }

        // Update only provided fields
        if (isset($validated['name'])) {
            $slot->name = trim($validated['name']);
        }
        if (isset($validated['code'])) {
            $slot->code = trim($validated['code']);
        }
        if (isset($validated['start_time'])) {
            $slot->start_time = $validated['start_time'];
        }
        if (isset($validated['end_time'])) {
            $slot->end_time = $validated['end_time'];
        }
        if (isset($validated['days_of_week'])) {
            $slot->days_of_week = $validated['days_of_week'];
        }
        if (isset($validated['default_duration_minutes'])) {
            $slot->default_duration_minutes = $validated['default_duration_minutes'];
        }
        if (isset($validated['academic_year_id'])) {
            $slot->academic_year_id = $validated['academic_year_id'];
        }
        if (isset($validated['sort_order'])) {
            $slot->sort_order = $validated['sort_order'];
        }
        if (isset($validated['is_active'])) {
            $slot->is_active = $validated['is_active'];
        }
        if (isset($validated['description'])) {
            $slot->description = $validated['description'];
        }
        // organization_id cannot be changed

        $slot->save();
        $slot->load(['academicYear', 'school']);

        return response()->json([
            'id' => $slot->id,
            'organization_id' => $slot->organization_id,
            'name' => $slot->name,
            'code' => $slot->code,
            'start_time' => $slot->start_time,
            'end_time' => $slot->end_time,
            'days_of_week' => $slot->days_of_week,
            'default_duration_minutes' => $slot->default_duration_minutes,
            'academic_year_id' => $slot->academic_year_id,
            'school_id' => $slot->school_id,
            'sort_order' => $slot->sort_order,
            'is_active' => $slot->is_active,
            'description' => $slot->description,
            'created_at' => $slot->created_at,
            'updated_at' => $slot->updated_at,
            'academic_year' => $slot->academicYear ? [
                'id' => $slot->academicYear->id,
                'name' => $slot->academicYear->name,
                'start_date' => $slot->academicYear->start_date,
                'end_date' => $slot->academicYear->end_date,
            ] : null,
            'school' => $slot->school ? [
                'id' => $slot->school->id,
                'school_name' => $slot->school->school_name,
            ] : null,
        ]);

        // Log schedule slot update
        try {
            $this->activityLogService->logUpdate(
                subject: $slot,
                description: "Updated schedule slot: {$slot->name}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $slot->only(['name', 'code', 'start_time', 'end_time', 'days_of_week', 'default_duration_minutes', 'academic_year_id', 'sort_order', 'is_active', 'description']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log schedule slot update: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified schedule slot (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('schedule_slots.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for schedule_slots.delete - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        $slot = ScheduleSlot::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$slot) {
            return response()->json(['error' => 'Schedule slot not found'], 404);
        }

        // Capture data before deletion
        $slotData = $slot->toArray();
        $slotName = $slot->name;

        $slot->delete();

        // Log schedule slot deletion
        try {
            $this->activityLogService->logDelete(
                subject: $slot,
                description: "Deleted schedule slot: {$slotName}",
                properties: ['deleted_slot' => $slotData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log schedule slot deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }
}



