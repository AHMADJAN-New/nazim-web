<?php

namespace App\Http\Controllers;

use App\Models\ResidencyType;
use App\Http\Requests\StoreResidencyTypeRequest;
use App\Http\Requests\UpdateResidencyTypeRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ResidencyTypeController extends Controller
{
    /**
     * Display a listing of residency types
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

        try {
            if (!$user->hasPermissionTo('residency_types.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $residencyTypes = ResidencyType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->orderBy('name', 'asc')
            ->get();

        return response()->json($residencyTypes);
    }

    /**
     * Store a newly created residency type
     */
    public function store(StoreResidencyTypeRequest $request)
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
            if (!$user->hasPermissionTo('residency_types.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Validate code uniqueness (school-scoped)
        $existing = ResidencyType::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('code', $request->code)
            ->whereNull('deleted_at')
            ->first();
        if ($existing) {
            return response()->json(['error' => 'Residency type code already exists'], 422);
        }

        $residencyType = ResidencyType::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'name' => $request->name,
            'code' => $request->code,
            'description' => $request->description ?? null,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json($residencyType, 201);
    }

    /**
     * Display the specified residency type
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
            if (!$user->hasPermissionTo('residency_types.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $residencyType = ResidencyType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$residencyType) {
            return response()->json(['error' => 'Residency type not found'], 404);
        }

        return response()->json($residencyType);
    }

    /**
     * Update the specified residency type
     */
    public function update(UpdateResidencyTypeRequest $request, string $id)
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
            if (!$user->hasPermissionTo('residency_types.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $residencyType = ResidencyType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$residencyType) {
            return response()->json(['error' => 'Residency type not found'], 404);
        }

        // Validate code uniqueness if being changed (school-scoped)
        if ($request->has('code') && $request->code !== $residencyType->code) {
            $existing = ResidencyType::where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('code', $request->code)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->exists();
            if ($existing) {
                return response()->json(['error' => 'Residency type code already exists'], 422);
            }
        }

        $residencyType->update($request->only([
            'name',
            'code',
            'description',
            'is_active',
        ]));

        return response()->json($residencyType);
    }

    /**
     * Remove the specified residency type (soft delete)
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

        // Strict school scoping
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('residency_types.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $residencyType = ResidencyType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$residencyType) {
            return response()->json(['error' => 'Residency type not found'], 404);
        }

        // Check if residency type is in use (e.g., by student_admissions)
        $inUse = DB::table('student_admissions')
            ->where('residency_type_id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->exists();

        if ($inUse) {
            return response()->json(['error' => 'This residency type is in use and cannot be deleted'], 409);
        }

        // Soft delete
        $residencyType->delete();

        return response()->noContent();
    }
}


