<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AcademicYearController extends Controller
{
    /**
     * Display a listing of academic years
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Note: Academic years don't require specific permission check for reading
        // All authenticated users can read academic years for their organization + global years

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

        $query = AcademicYear::whereNull('deleted_at');

        // Filter by organization (include global years where organization_id IS NULL)
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where(function ($q) use ($request) {
                    $q->where('organization_id', $request->organization_id)
                      ->orWhereNull('organization_id'); // Include global years
                });
            } else {
                return response()->json([]);
            }
        } else {
            // Show user's org years + global years
            if (!empty($orgIds)) {
                $query->where(function ($q) use ($orgIds) {
                    $q->whereIn('organization_id', $orgIds)
                      ->orWhereNull('organization_id'); // Include global years
                });
            } else {
                // No org access, only show global years
                $query->whereNull('organization_id');
            }
        }

        // Filter by is_current if provided
        if ($request->has('is_current') && $request->is_current !== null) {
            $query->where('is_current', $request->is_current);
        }

        $academicYears = $query->orderBy('start_date', 'desc')->get();

        return response()->json($academicYears);
    }

    /**
     * Store a newly created academic year
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Get organization_id - use provided or user's org
        $organizationId = $request->organization_id;
        if ($organizationId === null) {
            if ($profile->role === 'super_admin' && $profile->organization_id === null) {
                $organizationId = null; // Global year
            } else if ($profile->organization_id) {
                $organizationId = $profile->organization_id;
            } else {
                return response()->json(['error' => 'User must be assigned to an organization'], 400);
            }
    }

        // Validate organization access (unless super admin)
        if ($profile->role !== 'super_admin' && $organizationId !== $profile->organization_id && $organizationId !== null) {
            return response()->json(['error' => 'Cannot create academic year for different organization'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('academic_years')->where(function ($query) use ($organizationId) {
                return $query->where('organization_id', $organizationId)->whereNull('deleted_at');
            })],
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_current' => 'nullable|boolean',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|string|max:50',
        ]);

        // If setting as current, unset others for the same organization
        if ($validated['is_current'] ?? false) {
            AcademicYear::where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->update(['is_current' => false]);
        }

        $academicYear = AcademicYear::create([
            'name' => trim($validated['name']),
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'is_current' => $validated['is_current'] ?? false,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'organization_id' => $organizationId,
        ]);

        return response()->json($academicYear, 201);
    }

    /**
     * Display the specified academic year
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $academicYear = AcademicYear::whereNull('deleted_at')->find($id);

        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
        }

        // Check organization access (unless super admin)
        if ($profile->role !== 'super_admin') {
            if ($academicYear->organization_id !== null && $academicYear->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }
        }

        return response()->json($academicYear);
    }

    /**
     * Update the specified academic year
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $academicYear = AcademicYear::whereNull('deleted_at')->find($id);

        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
    }

        // Validate organization access (unless super admin)
        if ($profile->role !== 'super_admin') {
            if ($academicYear->organization_id !== null && $academicYear->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Cannot update academic year from different organization'], 403);
            }
        }

        // Prevent organization_id changes (unless super admin)
        if ($request->has('organization_id') && $profile->role !== 'super_admin') {
            return response()->json(['error' => 'Cannot change organization_id'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100', Rule::unique('academic_years')->where(function ($query) use ($academicYear) {
                return $query->where('organization_id', $academicYear->organization_id)->whereNull('deleted_at');
            })->ignore($id)],
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'is_current' => 'nullable|boolean',
            'description' => 'nullable|string|max:500',
            'status' => 'nullable|string|max:50',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
        ]);

        // If setting as current, unset others for the same organization
        if (isset($validated['is_current']) && $validated['is_current'] === true) {
            $orgId = $validated['organization_id'] ?? $academicYear->organization_id;
            AcademicYear::where('organization_id', $orgId)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->update(['is_current' => false]);
        }

        // Trim name if provided
        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $academicYear->update($validated);

        return response()->json($academicYear);
    }

    /**
     * Remove the specified academic year (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $academicYear = AcademicYear::whereNull('deleted_at')->find($id);

        if (!$academicYear) {
            return response()->json(['error' => 'Academic year not found'], 404);
        }

        // Validate organization access (unless super admin)
        // Note: Global years (organization_id = NULL) can only be deleted by super admin
        if ($profile->role !== 'super_admin') {
            if ($academicYear->organization_id === null) {
                return response()->json(['error' => 'Cannot delete global academic years'], 403);
            }
            if ($academicYear->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Cannot delete academic year from different organization'], 403);
            }
        }

        // Prevent deletion of current year
        if ($academicYear->is_current) {
            return response()->json(['error' => 'Cannot delete the current academic year. Please set another year as current first.'], 400);
        }

        $academicYear->delete(); // Soft delete

        return response()->json(['message' => 'Academic year deleted successfully'], 200);
    }
}
