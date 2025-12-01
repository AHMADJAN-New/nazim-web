<?php

namespace App\Http\Controllers;

use App\Models\ScheduleSlot;
use App\Http\Requests\StoreScheduleSlotRequest;
use App\Http\Requests\UpdateScheduleSlotRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ScheduleSlotController extends Controller
{
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

            // Check permission (allow super_admin to bypass)
            if ($profile->role !== 'super_admin') {
                try {
                    if (!$user->hasPermissionTo('schedule_slots.read')) {
                        return response()->json(['error' => 'This action is unauthorized'], 403);
                    }
                } catch (\Exception $e) {
                    // If permission doesn't exist, log but allow access (for migration period)
                    Log::warning("Permission check failed for schedule_slots.read - allowing access: " . $e->getMessage());
                    // Allow access if permission doesn't exist (during migration)
                }
            }

            // Get accessible organization IDs
            $orgIds = [];
            if ($profile->role === 'super_admin' && $profile->organization_id === null) {
                $orgIds = DB::table('organizations')
                    ->whereNull('deleted_at')
                    ->pluck('id')
                    ->toArray();
            } else {
                if ($profile->organization_id) {
                    $orgIds = [$profile->organization_id];
                }
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

            // Filter by organization (include global slots where organization_id IS NULL)
            if ($request->has('organization_id') && $request->organization_id) {
                if (in_array($request->organization_id, $orgIds) || empty($orgIds)) {
                    $query->where(function ($q) use ($request) {
                        $q->where('organization_id', $request->organization_id)
                          ->orWhereNull('organization_id'); // Include global slots
                    });
                } else {
                    return response()->json([]);
                }
            } else {
                // Show user's org slots + global slots
                if (!empty($orgIds)) {
                    $query->where(function ($q) use ($orgIds) {
                        $q->whereIn('organization_id', $orgIds)
                          ->orWhereNull('organization_id'); // Include global slots
                    });
                } else {
                    // No org access, only show global slots
                    $query->whereNull('organization_id');
                }
            }

            // Filter by academic_year_id if provided
            if ($request->has('academic_year_id') && $request->academic_year_id) {
                $query->where(function ($q) use ($request) {
                    $q->where('academic_year_id', $request->academic_year_id)
                      ->orWhereNull('academic_year_id'); // Include global slots
                });
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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('schedule_slots.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                Log::warning("Permission check failed for schedule_slots.create - allowing access: " . $e->getMessage());
                // Allow access if permission doesn't exist (during migration)
            }
        }

        $validated = $request->validated();

        // Get organization_id - use provided or user's org
        $organizationId = $validated['organization_id'] ?? null;
        if ($organizationId === null) {
            if ($profile->role === 'super_admin' && $profile->organization_id === null) {
                $organizationId = null; // Global slot
            } else if ($profile->organization_id) {
                $organizationId = $profile->organization_id;
            } else {
                return response()->json(['error' => 'User must be assigned to an organization'], 400);
            }
        }

        // Validate organization access (unless super admin)
        if ($profile->role !== 'super_admin' && $organizationId !== $profile->organization_id && $organizationId !== null) {
            return response()->json(['error' => 'Cannot create slot for different organization'], 403);
        }

        $slot = ScheduleSlot::create([
            'name' => trim($validated['name']),
            'code' => trim($validated['code']),
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'days_of_week' => $validated['days_of_week'] ?? [],
            'default_duration_minutes' => $validated['default_duration_minutes'] ?? 45,
            'academic_year_id' => $validated['academic_year_id'] ?? null,
            'school_id' => $validated['school_id'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 1,
            'is_active' => $validated['is_active'] ?? true,
            'description' => $validated['description'] ?? null,
            'organization_id' => $organizationId,
        ]);

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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('schedule_slots.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                Log::warning("Permission check failed for schedule_slots.read - allowing access: " . $e->getMessage());
                // Allow access if permission doesn't exist (during migration)
            }
        }

        $slot = ScheduleSlot::whereNull('deleted_at')
            ->with(['academicYear', 'school'])
            ->find($id);

        if (!$slot) {
            return response()->json(['error' => 'Schedule slot not found'], 404);
        }

        // Check organization access
        if ($profile->role !== 'super_admin') {
            if ($slot->organization_id !== $profile->organization_id && $slot->organization_id !== null) {
                return response()->json(['error' => 'Access denied to this schedule slot'], 403);
            }
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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('schedule_slots.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                Log::warning("Permission check failed for schedule_slots.update - allowing access: " . $e->getMessage());
                // Allow access if permission doesn't exist (during migration)
            }
        }

        $slot = ScheduleSlot::whereNull('deleted_at')->find($id);

        if (!$slot) {
            return response()->json(['error' => 'Schedule slot not found'], 404);
        }

        // Check organization access
        if ($profile->role !== 'super_admin') {
            if ($slot->organization_id !== $profile->organization_id && $slot->organization_id !== null) {
                return response()->json(['error' => 'Cannot update slot from different organization'], 403);
            }
        }

        $validated = $request->validated();

        // Prevent organization_id changes (unless super admin)
        if (isset($validated['organization_id']) && $profile->role !== 'super_admin') {
            unset($validated['organization_id']);
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
        if (isset($validated['school_id'])) {
            $slot->school_id = $validated['school_id'];
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
        if (isset($validated['organization_id']) && $profile->role === 'super_admin') {
            $slot->organization_id = $validated['organization_id'];
        }

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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('schedule_slots.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                Log::warning("Permission check failed for schedule_slots.delete - allowing access: " . $e->getMessage());
                // Allow access if permission doesn't exist (during migration)
            }
        }

        $slot = ScheduleSlot::whereNull('deleted_at')->find($id);

        if (!$slot) {
            return response()->json(['error' => 'Schedule slot not found'], 404);
        }

        // Check organization access
        if ($profile->role !== 'super_admin') {
            if ($slot->organization_id !== $profile->organization_id && $slot->organization_id !== null) {
                return response()->json(['error' => 'Cannot delete slot from different organization'], 403);
            }
        }

        $slot->delete();

        return response()->json(['message' => 'Schedule slot deleted successfully'], 200);
    }
}

