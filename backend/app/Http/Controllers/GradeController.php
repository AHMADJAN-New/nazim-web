<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GradeController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of grades
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

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('grades.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for grades.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = Grade::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->orderBy('order', 'desc');

            $grades = $query->get();

            return response()->json($grades);
        } catch (\Exception $e) {
            \Log::error('GradeController@index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'error' => 'An error occurred while fetching grades',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Store a newly created grade
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

            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('grades.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for grades.create: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $organizationId = $profile->organization_id;

            $validated = $request->validate([
                'name_en' => 'required|string|max:255',
                'name_ar' => 'required|string|max:255',
                'name_ps' => 'required|string|max:255',
                'name_fa' => 'required|string|max:255',
                'min_percentage' => 'required|numeric|min:0|max:100',
                'max_percentage' => 'required|numeric|min:0|max:100|gte:min_percentage',
                'order' => 'required|integer|min:1',
                'is_pass' => 'required|boolean',
            ]);

            // Check for overlapping percentage ranges within the same organization
            $overlapping = Grade::where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->where(function ($query) use ($validated) {
                    $query->where(function ($q) use ($validated) {
                        // New range overlaps existing range
                        $q->where('min_percentage', '<=', $validated['max_percentage'])
                          ->where('max_percentage', '>=', $validated['min_percentage']);
                    });
                })
                ->exists();

            if ($overlapping) {
                return response()->json([
                    'error' => 'Validation failed',
                    'details' => ['percentage_range' => ['The percentage range overlaps with an existing grade']]
                ], 400);
            }

            $grade = Grade::create([
                'organization_id' => $organizationId,
                'school_id' => $currentSchoolId,
                'name_en' => trim($validated['name_en']),
                'name_ar' => trim($validated['name_ar']),
                'name_ps' => trim($validated['name_ps']),
                'name_fa' => trim($validated['name_fa']),
                'min_percentage' => $validated['min_percentage'],
                'max_percentage' => $validated['max_percentage'],
                'order' => $validated['order'],
                'is_pass' => $validated['is_pass'],
            ]);

            // Log grade creation
            try {
                $this->activityLogService->logCreate(
                    subject: $grade,
                    description: "Created grade: {$grade->name_en}",
                    properties: [
                        'grade_id' => $grade->id,
                        'name_en' => $grade->name_en,
                        'min_percentage' => $grade->min_percentage,
                        'max_percentage' => $grade->max_percentage,
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                \Log::warning('Failed to log grade creation: ' . $e->getMessage());
            }

            return response()->json($grade, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('GradeController@store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json([
                'error' => 'An error occurred while creating grade',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Display the specified grade
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

            $currentSchoolId = $this->getCurrentSchoolId(request());

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('grades.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for grades.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $grade = Grade::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$grade) {
                return response()->json(['error' => 'Grade not found'], 404);
            }

            return response()->json($grade);
        } catch (\Exception $e) {
            \Log::error('GradeController@show error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json([
                'error' => 'An error occurred while fetching grade',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update the specified grade
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

            $currentSchoolId = $this->getCurrentSchoolId($request);

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('grades.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for grades.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $grade = Grade::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$grade) {
                return response()->json(['error' => 'Grade not found'], 404);
            }

            // Prevent org/school changes
            if ($request->has('organization_id') || $request->has('school_id')) {
                return response()->json(['error' => 'Cannot change organization_id or school_id'], 403);
            }

            $validated = $request->validate([
                'name_en' => 'sometimes|string|max:255',
                'name_ar' => 'sometimes|string|max:255',
                'name_ps' => 'sometimes|string|max:255',
                'name_fa' => 'sometimes|string|max:255',
                'min_percentage' => 'sometimes|numeric|min:0|max:100',
                'max_percentage' => 'sometimes|numeric|min:0|max:100',
                'order' => 'sometimes|integer|min:1',
                'is_pass' => 'sometimes|boolean',
            ]);

            // Validate max_percentage >= min_percentage
            $minPercentage = $validated['min_percentage'] ?? $grade->min_percentage;
            $maxPercentage = $validated['max_percentage'] ?? $grade->max_percentage;

            if ($maxPercentage < $minPercentage) {
                return response()->json([
                    'error' => 'Validation failed',
                    'details' => ['max_percentage' => ['The max percentage must be greater than or equal to min percentage']]
                ], 400);
            }

            // Check for overlapping percentage ranges within the same organization (excluding current grade)
            if (isset($validated['min_percentage']) || isset($validated['max_percentage'])) {
                $overlapping = Grade::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->where('id', '!=', $id)
                    ->where(function ($query) use ($minPercentage, $maxPercentage) {
                        $query->where(function ($q) use ($minPercentage, $maxPercentage) {
                            // New range overlaps existing range
                            $q->where('min_percentage', '<=', $maxPercentage)
                              ->where('max_percentage', '>=', $minPercentage);
                        });
                    })
                    ->exists();

                if ($overlapping) {
                    return response()->json([
                        'error' => 'Validation failed',
                        'details' => ['percentage_range' => ['The percentage range overlaps with an existing grade']]
                    ], 400);
                }
            }

            // Trim name fields if provided
            foreach (['name_en', 'name_ar', 'name_ps', 'name_fa'] as $field) {
                if (isset($validated[$field])) {
                    $validated[$field] = trim($validated[$field]);
                }
            }

            // Capture old values before update
            $oldValues = $grade->only(['name_en', 'name_ar', 'name_ps', 'name_fa', 'min_percentage', 'max_percentage', 'order', 'is_pass']);

            $grade->update($validated);

            // Log grade update
            try {
                $this->activityLogService->logUpdate(
                    subject: $grade,
                    description: "Updated grade: {$grade->name_en}",
                    properties: [
                        'old_values' => $oldValues,
                        'new_values' => $grade->only(['name_en', 'name_ar', 'name_ps', 'name_fa', 'min_percentage', 'max_percentage', 'order', 'is_pass']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                \Log::warning('Failed to log grade update: ' . $e->getMessage());
            }

            return response()->json($grade);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('GradeController@update error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id,
                'request' => $request->all()
            ]);

            return response()->json([
                'error' => 'An error occurred while updating grade',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Remove the specified grade (soft delete)
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

            $currentSchoolId = $this->getCurrentSchoolId(request());

            // Check permission WITH organization context
            try {
                if (!$user->hasPermissionTo('grades.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for grades.delete: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $grade = Grade::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$grade) {
                return response()->json(['error' => 'Grade not found'], 404);
            }

            // Capture data before deletion
            $gradeData = $grade->toArray();
            $gradeName = $grade->name_en;

            $grade->delete(); // Soft delete

            // Log grade deletion
            try {
                $this->activityLogService->logDelete(
                    subject: $grade,
                    description: "Deleted grade: {$gradeName}",
                    properties: ['deleted_grade' => $gradeData],
                    request: request()
                );
            } catch (\Exception $e) {
                \Log::warning('Failed to log grade deletion: ' . $e->getMessage());
            }

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('GradeController@destroy error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json([
                'error' => 'An error occurred while deleting grade',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
