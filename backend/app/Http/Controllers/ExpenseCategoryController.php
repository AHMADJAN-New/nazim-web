<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of expense categories
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
                if (!$user->hasPermissionTo('finance_expense.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_expense.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'is_active' => 'nullable|boolean',
            ]);

            $query = ExpenseCategory::whereNull('deleted_at')
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
            \Log::error('ExpenseCategoryController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching expense categories'], 500);
        }
    }

    /**
     * Store a newly created expense category
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
                if (!$user->hasPermissionTo('finance_expense.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('expense_categories')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })],
                'description' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'display_order' => 'nullable|integer|min:0',
            ]);

            $category = ExpenseCategory::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'name' => trim($validated['name']),
                'code' => $validated['code'] ?? null,
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'display_order' => $validated['display_order'] ?? 0,
            ]);

            // Log expense category creation
            try {
                $this->activityLogService->logCreate(
                    subject: $category,
                    description: "Created expense category: {$category->name}",
                    properties: [
                        'category_name' => $category->name,
                        'category_code' => $category->code,
                        'is_active' => $category->is_active,
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log expense category creation: ' . $e->getMessage());
            }

            return response()->json($category, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExpenseCategoryController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating expense category'], 500);
        }
    }

    /**
     * Display the specified expense category
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
                if (!$user->hasPermissionTo('finance_expense.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $category = ExpenseCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$category) {
                return response()->json(['error' => 'Expense category not found'], 404);
            }

            return response()->json($category);
        } catch (\Exception $e) {
            \Log::error('ExpenseCategoryController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching expense category'], 500);
        }
    }

    /**
     * Update the specified expense category
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
                if (!$user->hasPermissionTo('finance_expense.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $category = ExpenseCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$category) {
                return response()->json(['error' => 'Expense category not found'], 404);
            }

            // Capture old values for logging
            $oldValues = $category->only(['name', 'code', 'description', 'is_active', 'display_order']);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('expense_categories')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })->ignore($id)],
                'description' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'display_order' => 'nullable|integer|min:0',
            ]);

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            $category->update($validated);

            // Log expense category update
            try {
                $this->activityLogService->logUpdate(
                    subject: $category,
                    description: "Updated expense category: {$category->name}",
                    properties: [
                        'old_values' => $oldValues,
                        'new_values' => $category->only(['name', 'code', 'description', 'is_active', 'display_order']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log expense category update: ' . $e->getMessage());
            }

            return response()->json($category);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('ExpenseCategoryController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating expense category'], 500);
        }
    }

    /**
     * Remove the specified expense category (soft delete)
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
                if (!$user->hasPermissionTo('finance_expense.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $category = ExpenseCategory::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$category) {
                return response()->json(['error' => 'Expense category not found'], 404);
            }

            // Check if category has any entries
            $hasEntries = $category->expenseEntries()->whereNull('deleted_at')->exists();
            if ($hasEntries) {
                return response()->json(['error' => 'Cannot delete category with existing entries'], 409);
            }

            $categoryName = $category->name;
            $categoryData = $category->toArray();
            $category->delete();

            // Log expense category deletion
            try {
                $this->activityLogService->logDelete(
                    subject: $category,
                    description: "Deleted expense category: {$categoryName}",
                    properties: ['deleted_category' => $categoryData],
                    request: request()
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log expense category deletion: ' . $e->getMessage());
            }

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('ExpenseCategoryController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting expense category'], 500);
        }
    }
}
