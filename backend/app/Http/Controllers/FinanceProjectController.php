<?php

namespace App\Http\Controllers;

use App\Models\FinanceProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FinanceProjectController extends Controller
{
    /**
     * Display a listing of finance projects
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
                if (!$user->hasPermissionTo('finance_projects.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                \Log::warning("Permission check failed for finance_projects.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'status' => 'nullable|in:planning,active,completed,cancelled',
                'is_active' => 'nullable|boolean',
            ]);

            $query = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            if (!empty($validated['school_id'])) {
                $query->where('school_id', $validated['school_id']);
            }

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            $projects = $query->orderBy('name')->get();

            return response()->json($projects);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceProjectController@index error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching finance projects'], 500);
        }
    }

    /**
     * Store a newly created finance project
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
                if (!$user->hasPermissionTo('finance_projects.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_projects')->where(function ($query) use ($profile) {
                    return $query->where('organization_id', $profile->organization_id)->whereNull('deleted_at');
                })],
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'description' => 'nullable|string',
                'budget_amount' => 'nullable|numeric|min:0',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'status' => 'nullable|in:planning,active,completed,cancelled',
                'is_active' => 'nullable|boolean',
            ]);

            $project = FinanceProject::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $validated['school_id'] ?? null,
                'name' => trim($validated['name']),
                'code' => $validated['code'] ?? null,
                'description' => $validated['description'] ?? null,
                'budget_amount' => $validated['budget_amount'] ?? null,
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
                'status' => $validated['status'] ?? 'active',
                'is_active' => $validated['is_active'] ?? true,
            ]);

            return response()->json($project, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceProjectController@store error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while creating finance project'], 500);
        }
    }

    /**
     * Display the specified finance project
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
                if (!$user->hasPermissionTo('finance_projects.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$project) {
                return response()->json(['error' => 'Finance project not found'], 404);
            }

            return response()->json($project);
        } catch (\Exception $e) {
            \Log::error('FinanceProjectController@show error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching finance project'], 500);
        }
    }

    /**
     * Update the specified finance project
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
                if (!$user->hasPermissionTo('finance_projects.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$project) {
                return response()->json(['error' => 'Finance project not found'], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_projects')->where(function ($query) use ($profile) {
                    return $query->where('organization_id', $profile->organization_id)->whereNull('deleted_at');
                })->ignore($id)],
                'school_id' => 'nullable|uuid|exists:school_branding,id',
                'description' => 'nullable|string',
                'budget_amount' => 'nullable|numeric|min:0',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'status' => 'nullable|in:planning,active,completed,cancelled',
                'is_active' => 'nullable|boolean',
            ]);

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            $project->update($validated);

            return response()->json($project);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors()
            ], 400);
        } catch (\Exception $e) {
            \Log::error('FinanceProjectController@update error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while updating finance project'], 500);
        }
    }

    /**
     * Remove the specified finance project (soft delete)
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
                if (!$user->hasPermissionTo('finance_projects.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$project) {
                return response()->json(['error' => 'Finance project not found'], 404);
            }

            // Check if project has any entries
            $hasIncome = $project->incomeEntries()->whereNull('deleted_at')->exists();
            $hasExpenses = $project->expenseEntries()->whereNull('deleted_at')->exists();

            if ($hasIncome || $hasExpenses) {
                return response()->json(['error' => 'Cannot delete project with existing entries'], 409);
            }

            $project->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            \Log::error('FinanceProjectController@destroy error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while deleting finance project'], 500);
        }
    }

    /**
     * Get project summary with income/expense totals
     */
    public function summary(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile || !$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            try {
                if (!$user->hasPermissionTo('finance_projects.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->find($id);

            if (!$project) {
                return response()->json(['error' => 'Finance project not found'], 404);
            }

            // Recalculate totals to ensure accuracy
            $totals = $project->recalculateTotals();

            return response()->json([
                'project' => $project,
                'summary' => [
                    'total_income' => $totals['total_income'],
                    'total_expense' => $totals['total_expense'],
                    'balance' => $totals['balance'],
                    'budget_amount' => $project->budget_amount,
                    'budget_remaining' => $project->budget_amount ? $project->budget_amount - $totals['total_expense'] : null,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('FinanceProjectController@summary error: ' . $e->getMessage());
            return response()->json(['error' => 'An error occurred while fetching project summary'], 500);
        }
    }
}
