<?php

namespace App\Http\Controllers;

use App\Models\StaffType;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StaffTypeController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of staff types
     */
    public function index(Request $request)
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

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Permission check
        try {
            if (!$user->hasPermissionTo('staff_types.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staffTypes = StaffType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();

        return response()->json($staffTypes);
    }

    /**
     * Display the specified staff type
     */
    public function show(Request $request, string $id)
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

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staffType = StaffType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staffType) {
            return response()->json(['error' => 'Staff type not found'], 404);
        }

        return response()->json($staffType);
    }

    /**
     * Store a newly created staff type
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer',
        ]);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Validate code uniqueness
        $existing = StaffType::where('code', $request->code)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Staff type code already exists'], 422);
        }

        $staffType = StaffType::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description ?? null,
            'is_active' => $request->is_active ?? true,
            'display_order' => $request->display_order ?? 0,
        ]);

        // Log staff type creation
        try {
            $this->activityLogService->logCreate(
                subject: $staffType,
                description: "Created staff type: {$staffType->name}",
                properties: [
                    'staff_type_id' => $staffType->id,
                    'name' => $staffType->name,
                    'code' => $staffType->code,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log staff type creation: ' . $e->getMessage());
        }

        return response()->json($staffType, 201);
    }

    /**
     * Update the specified staff type
     */
    public function update(Request $request, string $id)
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

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staffType = StaffType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staffType) {
            return response()->json(['error' => 'Staff type not found'], 404);
        }

        $request->validate([
            'name' => 'sometimes|string|max:100',
            'code' => 'sometimes|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer',
        ]);

        // Validate code uniqueness if being changed
        if ($request->has('code') && $request->code !== $staffType->code) {
            $existing = StaffType::where('code', $request->code)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Staff type code already exists'], 422);
            }
        }

        // Capture old values before update
        $oldValues = $staffType->only(['name', 'code', 'description', 'is_active', 'display_order']);

        $staffType->update($request->only([
            'name',
            'code',
            'description',
            'is_active',
            'display_order',
        ]));

        // Log staff type update
        try {
            $this->activityLogService->logUpdate(
                subject: $staffType,
                description: "Updated staff type: {$staffType->name}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $staffType->only(['name', 'code', 'description', 'is_active', 'display_order']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log staff type update: ' . $e->getMessage());
        }

        return response()->json($staffType);
    }

    /**
     * Remove the specified staff type (soft delete)
     */
    public function destroy(Request $request, string $id)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staffType = StaffType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staffType) {
            return response()->json(['error' => 'Staff type not found'], 404);
        }

        // Check if any staff members are using this type
        $staffCount = DB::table('staff')
            ->where('staff_type_id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->count();

        // If staff members are using this type, set their staff_type_id to null before deletion
        if ($staffCount > 0) {
            DB::table('staff')
                ->where('staff_type_id', $id)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->update(['staff_type_id' => null]);
        }

        // Capture data before deletion
        $staffTypeData = $staffType->toArray();
        $staffTypeName = $staffType->name;

        // Soft delete using SoftDeletes trait
        $staffType->delete();

        // Log staff type deletion
        try {
            $this->activityLogService->logDelete(
                subject: $staffType,
                description: "Deleted staff type: {$staffTypeName}",
                properties: ['deleted_staff_type' => $staffTypeData],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log staff type deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }
}



