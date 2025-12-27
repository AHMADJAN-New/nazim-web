<?php

namespace App\Http\Controllers;

use App\Models\IncomeCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class IncomeCategoryController extends Controller
{
    /**
     * Display a listing of income categories
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_income.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_income.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'is_active' => 'nullable|boolean',
            ]);

            $query = IncomeCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId);

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            $categories = $query->ordered()->get();

            return response()->json($categories);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('IncomeCategoryController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching income categories'], 500);
        }
    }

    /**
     * Store a newly created income category
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_income.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('income_categories')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })],
                'description' => 'nullable|string',
                'is_restricted' => 'nullable|boolean',
                'is_active' => 'nullable|boolean',
                'display_order' => 'nullable|integer|min:0',
            ]);

            $category = IncomeCategory::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'name' => trim($validated['name']),
                'code' => $validated['code'] ?? null,
                'description' => $validated['description'] ?? null,
                'is_restricted' => $validated['is_restricted'] ?? false,
                'is_active' => $validated['is_active'] ?? true,
                'display_order' => $validated['display_order'] ?? 0,
            ]);

            return response()->json($category, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('IncomeCategoryController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating income category'], 500);
        }
    }

    /**
     * Display the specified income category
     */
    public function show(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_income.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $category = IncomeCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$category) {
                return response()->json(['error' => 'Income category not found'], 404);
            }

            return response()->json($category);
        } catch (\Exception $e) {
            \Log::error('IncomeCategoryController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching income category'], 500);
        }
    }

    /**
     * Update the specified income category
     */
    public function update(Request $request, string $id)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_income.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $category = IncomeCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$category) {
                return response()->json(['error' => 'Income category not found'], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('income_categories')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })->ignore($id)],
                'description' => 'nullable|string',
                'is_restricted' => 'nullable|boolean',
                'is_active' => 'nullable|boolean',
                'display_order' => 'nullable|integer|min:0',
            ]);

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            $category->update($validated);

            return response()->json($category);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('IncomeCategoryController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating income category'], 500);
        }
    }

    /**
     * Remove the specified income category (soft delete)
     */
    public function destroy(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_income.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $category = IncomeCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$category) {
                return response()->json(['error' => 'Income category not found'], 404);
            }

            // Check if category has any entries
            $hasEntries = $category->incomeEntries()->whereNull('deleted_at')->exists();
            if ($hasEntries) {
                return response()->json(['error' => 'Cannot delete category with existing entries'], 409);
            }

            $category->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('IncomeCategoryController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting income category'], 500);
        }
    }
}
