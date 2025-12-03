<?php

namespace App\Http\Controllers;

use App\Models\StaffType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StaffTypeController extends Controller
{
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

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        $query = StaffType::whereNull('deleted_at');

        // Filter: show global types (organization_id = null) + organization-specific types
        $query->where(function ($q) use ($orgIds) {
            $q->whereNull('organization_id')
              ->orWhereIn('organization_id', $orgIds);
        });

        // Filter by organization_id if provided
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where(function ($q) use ($request) {
                    $q->whereNull('organization_id')
                      ->orWhere('organization_id', $request->organization_id);
                });
            } else {
                return response()->json([]);
            }
        }

        $staffTypes = $query->orderBy('display_order')->orderBy('name')->get();

        return response()->json($staffTypes);
    }

    /**
     * Display the specified staff type
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staffType = StaffType::whereNull('deleted_at')->find($id);

        if (!$staffType) {
            return response()->json(['error' => 'Staff type not found'], 404);
        }

        // Check organization access (allow global types)
        $orgIds = [$profile->organization_id];
        if ($staffType->organization_id !== null && !in_array($staffType->organization_id, $orgIds)) {
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
            'organization_id' => 'nullable|uuid|exists:organizations,id',
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.create', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Determine organization_id
        $organizationId = $request->organization_id ?? $profile->organization_id;
        
        // All users can only create types for their organization
        if ($organizationId !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot create staff type for a non-accessible organization'], 403);
        }

        // Validate code uniqueness
        $existing = StaffType::where('code', $request->code)
            ->where(function ($q) use ($organizationId) {
                if ($organizationId === null) {
                    $q->whereNull('organization_id');
                } else {
                    $q->where('organization_id', $organizationId);
                }
            })
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Staff type code already exists'], 422);
        }

        $staffType = StaffType::create([
            'organization_id' => $organizationId,
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description ?? null,
            'is_active' => $request->is_active ?? true,
            'display_order' => $request->display_order ?? 0,
        ]);

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

        $staffType = StaffType::whereNull('deleted_at')->find($id);

        if (!$staffType) {
            return response()->json(['error' => 'Staff type not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.update', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access (all users)
        if ($staffType->organization_id !== null && !in_array($staffType->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update staff type from different organization'], 403);
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
                ->where(function ($q) use ($staffType) {
                    if ($staffType->organization_id === null) {
                        $q->whereNull('organization_id');
                    } else {
                        $q->where('organization_id', $staffType->organization_id);
                    }
                })
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Staff type code already exists'], 422);
            }
        }

        $staffType->update($request->only([
            'name',
            'code',
            'description',
            'is_active',
            'display_order',
        ]));

        return response()->json($staffType);
    }

    /**
     * Remove the specified staff type (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staffType = StaffType::whereNull('deleted_at')->find($id);

        if (!$staffType) {
            return response()->json(['error' => 'Staff type not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff_types.delete', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff_types.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access (all users)
        if ($staffType->organization_id !== null && !in_array($staffType->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete staff type from different organization'], 403);
        }

        // Check if any staff members are using this type
        $staffCount = DB::table('staff')
            ->where('staff_type_id', $id)
            ->whereNull('deleted_at')
            ->count();

        // If staff members are using this type, set their staff_type_id to null before deletion
        if ($staffCount > 0) {
            DB::table('staff')
                ->where('staff_type_id', $id)
                ->whereNull('deleted_at')
                ->update(['staff_type_id' => null]);
        }

        // Soft delete using SoftDeletes trait
        $staffType->delete();

        return response()->json(['message' => 'Staff type deleted successfully']);
    }
}

