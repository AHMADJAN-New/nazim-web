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
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Validate request parameters
            $validated = $request->validate([
                'organization_id' => 'nullable|uuid|exists:organizations,id',
                'is_current' => 'nullable|boolean',
                'academic_year_id' => 'nullable|uuid', // Allow but ignore this parameter
            ]);

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('academic_years.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for academic_years.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = AcademicYear::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId);

            // If academic_year_id is provided, return that specific year
            // This handles the case where frontend mistakenly uses academic_year_id as a filter
            if (!empty($validated['academic_year_id'])) {
                $academicYear = AcademicYear::whereNull('deleted_at')
                    ->where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->where('id', $validated['academic_year_id'])
                    ->first();

                if (!$academicYear) {
                    return response()->json(['error' => 'Academic year not found'], 404);
                }

                return response()->json([$academicYear]); // Return as array for consistency
            }

            // NOTE: ignore client-provided organization_id; academic years are school-scoped.

            // Filter by is_current if provided
            if (isset($validated['is_current']) && $validated['is_current'] !== null) {
                $query->where('is_current', filter_var($validated['is_current'], FILTER_VALIDATE_BOOLEAN));
            }

            $academicYears = $query->orderBy('start_date', 'desc')->get();

            return response()->json($academicYears);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('AcademicYearController@index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'error' => 'An error occurred while fetching academic years',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Store a newly created academic year
     */
    public function store(Request $request)
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

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('academic_years.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for academic_years.create: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $organizationId = $profile->organization_id;
            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'name' => ['required', 'string', 'max:100', Rule::unique('academic_years')->where(function ($query) use ($organizationId, $currentSchoolId) {
                    return $query->where('organization_id', $organizationId)->where('school_id', $currentSchoolId)->whereNull('deleted_at');
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
                    ->where('school_id', $currentSchoolId)
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
                'school_id' => $currentSchoolId,
            ]);

            return response()->json($academicYear, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('AcademicYearController@store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'error' => 'An error occurred while creating academic year',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Display the specified academic year
     */
    public function show(string $id)
    {
        try {
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
                if (!$user->hasPermissionTo('academic_years.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for academic_years.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $academicYear = AcademicYear::whereNull('deleted_at')->find($id);

            if (!$academicYear) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }

            $currentSchoolId = request()->get('current_school_id');
            if ($academicYear->organization_id !== $profile->organization_id || $academicYear->school_id !== $currentSchoolId) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }

            return response()->json($academicYear);
        } catch (\Exception $e) {
            \Log::error('AcademicYearController@show error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json([
                'error' => 'An error occurred while fetching academic year',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update the specified academic year
     */
    public function update(Request $request, string $id)
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

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('academic_years.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for academic_years.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $academicYear = AcademicYear::whereNull('deleted_at')->find($id);

            if (!$academicYear) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);
            if ($academicYear->organization_id !== $profile->organization_id || $academicYear->school_id !== $currentSchoolId) {
                return response()->json(['error' => 'Cannot update academic year from different school'], 403);
            }

            // Prevent scope changes (all users)
            if ($request->has('organization_id') || $request->has('school_id')) {
                return response()->json(['error' => 'Cannot change scope fields'], 403);
            }

            $validated = $request->validate([
                'name' => ['sometimes', 'string', 'max:100', Rule::unique('academic_years')->where(function ($query) use ($academicYear) {
                    return $query->where('organization_id', $academicYear->organization_id)->where('school_id', $academicYear->school_id)->whereNull('deleted_at');
                })->ignore($id)],
                'start_date' => 'sometimes|date',
                'end_date' => 'sometimes|date|after:start_date',
                'is_current' => 'nullable|boolean',
                'description' => 'nullable|string|max:500',
                'status' => 'nullable|string|max:50',
            ]);

            // If setting as current, unset others for the same organization
            if (isset($validated['is_current']) && $validated['is_current'] === true) {
                AcademicYear::where('organization_id', $academicYear->organization_id)
                    ->where('school_id', $academicYear->school_id)
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
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('AcademicYearController@update error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id,
                'request' => $request->all()
            ]);

            return response()->json([
                'error' => 'An error occurred while updating academic year',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Remove the specified academic year (soft delete)
     */
    public function destroy(string $id)
    {
        try {
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
                if (!$user->hasPermissionTo('academic_years.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for academic_years.delete: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $academicYear = AcademicYear::whereNull('deleted_at')->find($id);

            if (!$academicYear) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }

            $currentSchoolId = request()->get('current_school_id');
            if ($academicYear->organization_id !== $profile->organization_id || $academicYear->school_id !== $currentSchoolId) {
                return response()->json(['error' => 'Cannot delete academic year from different school'], 403);
            }

            // Prevent deletion of current year
            if ($academicYear->is_current) {
                return response()->json(['error' => 'Cannot delete the current academic year. Please set another year as current first.'], 400);
            }

            $academicYear->delete(); // Soft delete

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('AcademicYearController@destroy error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json([
                'error' => 'An error occurred while deleting academic year',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}


