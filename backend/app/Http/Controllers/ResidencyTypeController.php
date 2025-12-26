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

        // Touch school.context (residency_types are still org-scoped lookup data)
        $currentSchoolId = $this->getCurrentSchoolId($request);
        unset($currentSchoolId);

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        $query = ResidencyType::whereNull('deleted_at');

        // Filter: show global types (organization_id = null) + organization-specific types
        $query->where(function ($q) use ($orgIds) {
            $q->whereNull('organization_id')
              ->orWhereIn('organization_id', $orgIds);
        });

        // Client-provided organization_id is ignored; organization is derived from profile.

        $residencyTypes = $query->orderBy('name', 'asc')->get();

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

        // Touch school.context (residency_types are still org-scoped lookup data)
        $currentSchoolId = $this->getCurrentSchoolId($request);
        unset($currentSchoolId);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('residency_types.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Determine organization_id (strict)
        $organizationId = $profile->organization_id;
        
        // All users can only create types for their organization
        if ($organizationId !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot create residency type for a non-accessible organization'], 403);
        }

        $residencyType = ResidencyType::create([
            'organization_id' => $organizationId,
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

        // Touch school.context (residency_types are still org-scoped lookup data)
        $currentSchoolId = $this->getCurrentSchoolId($request);
        unset($currentSchoolId);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('residency_types.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $residencyType = ResidencyType::whereNull('deleted_at')->find($id);

        if (!$residencyType) {
            return response()->json(['error' => 'Residency type not found'], 404);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access: users can read global types + their organization's types
        if ($residencyType->organization_id !== null && !in_array($residencyType->organization_id, $orgIds)) {
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

        // Touch school.context (residency_types are still org-scoped lookup data)
        $currentSchoolId = $this->getCurrentSchoolId($request);
        unset($currentSchoolId);

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('residency_types.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for residency_types.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $residencyType = ResidencyType::whereNull('deleted_at')->find($id);

        if (!$residencyType) {
            return response()->json(['error' => 'Residency type not found'], 404);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access
        // Global types (organization_id = NULL) cannot be updated by regular users
        if ($residencyType->organization_id === null) {
            return response()->json(['error' => 'Cannot update global residency types'], 403);
        }
        
        if (!in_array($residencyType->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update residency type from different organization'], 403);
        }

        // organization_id is scope and cannot be changed via this endpoint

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

        // Touch school.context (residency_types are still org-scoped lookup data)
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

        $residencyType = ResidencyType::whereNull('deleted_at')->find($id);

        if (!$residencyType) {
            return response()->json(['error' => 'Residency type not found'], 404);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access
        // If type is organization-specific, user can only delete types from their organization
        // If type is global (organization_id = NULL), user with delete permission can delete it
        if ($residencyType->organization_id !== null && !in_array($residencyType->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete residency type from different organization'], 403);
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

        unset($currentSchoolId);

        // Soft delete
        $residencyType->delete();

        return response()->noContent();
    }
}


