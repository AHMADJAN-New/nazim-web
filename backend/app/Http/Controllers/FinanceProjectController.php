<?php

namespace App\Http\Controllers;

use App\Models\FinanceProject;
use App\Models\Currency;
use App\Services\Notifications\NotificationService;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class FinanceProjectController extends Controller
{
    public function __construct(
        private NotificationService $notificationService,
        private ActivityLogService $activityLogService
    ) {}
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

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'status' => 'nullable|in:planning,active,completed,cancelled',
                'is_active' => 'nullable|boolean',
            ]);

            $query = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId);

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
            }

            $projects = $query->with('currency')->orderBy('name')->get();

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

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_projects')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })],
                'currency_id' => 'nullable|uuid|exists:currencies,id',
                'description' => 'nullable|string',
                'budget_amount' => 'nullable|numeric|min:0',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'status' => 'nullable|in:planning,active,completed,cancelled',
                'is_active' => 'nullable|boolean',
            ]);

            // Verify currency belongs to organization if provided
            if (!empty($validated['currency_id'])) {
                $currency = Currency::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->find($validated['currency_id']);

                if (!$currency) {
                    return response()->json(['error' => 'Currency not found or does not belong to your organization'], 404);
                }
            }

            $project = FinanceProject::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'currency_id' => $validated['currency_id'] ?? null,
                'name' => trim($validated['name']),
                'code' => $validated['code'] ?? null,
                'description' => $validated['description'] ?? null,
                'budget_amount' => $validated['budget_amount'] ?? null,
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
                'status' => $validated['status'] ?? 'active',
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $project->load('currency');

            // Log finance project creation
            try {
                $this->activityLogService->logCreate(
                    subject: $project,
                    description: "Created finance project: {$project->name}",
                    properties: [
                        'project_name' => $project->name,
                        'project_code' => $project->code,
                        'budget_amount' => $project->budget_amount,
                        'currency_id' => $project->currency_id,
                        'status' => $project->status,
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log finance project creation: ' . $e->getMessage());
            }

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

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->with('currency')
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

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($id);

            if (!$project) {
                return response()->json(['error' => 'Finance project not found'], 404);
            }

            // Capture old values for logging
            $oldValues = $project->only(['name', 'code', 'currency_id', 'description', 'budget_amount', 'start_date', 'end_date', 'status', 'is_active']);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => ['nullable', 'string', 'max:50', Rule::unique('finance_projects')->where(function ($query) use ($profile, $currentSchoolId) {
                    return $query->where('organization_id', $profile->organization_id)
                        ->where('school_id', $currentSchoolId)
                        ->whereNull('deleted_at');
                })->ignore($id)],
                'currency_id' => 'nullable|uuid|exists:currencies,id',
                'description' => 'nullable|string',
                'budget_amount' => 'nullable|numeric|min:0',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'status' => 'nullable|in:planning,active,completed,cancelled',
                'is_active' => 'nullable|boolean',
            ]);

            // Verify currency belongs to organization if being updated
            if (isset($validated['currency_id'])) {
                $currency = Currency::where('organization_id', $profile->organization_id)
                    ->where('school_id', $currentSchoolId)
                    ->whereNull('deleted_at')
                    ->find($validated['currency_id']);

                if (!$currency) {
                    return response()->json(['error' => 'Currency not found or does not belong to your organization'], 404);
                }
            }

            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            $project->update($validated);
            $project->load('currency');

            // Check for budget warnings if budget is set
            try {
                if ($project->budget_amount && $project->budget_amount > 0) {
                    $totals = $project->recalculateTotals();
                    $totalExpense = $totals['total_expense'] ?? 0;
                    $budgetAmount = (float)$project->budget_amount;
                    $percentageUsed = ($totalExpense / $budgetAmount) * 100;
                    
                    // Warn if budget is 80% or more used
                    if ($percentageUsed >= 80 && $percentageUsed < 100) {
                        $currencySymbol = $project->currency->symbol ?? $project->currency->code ?? '';
                        $expenseFormatted = number_format($totalExpense, 2) . ' ' . $currencySymbol;
                        $budgetFormatted = number_format($budgetAmount, 2) . ' ' . $currencySymbol;
                        $remainingFormatted = number_format($budgetAmount - $totalExpense, 2) . ' ' . $currencySymbol;
                        
                        $this->notificationService->notify(
                            'invoice.overdue', // Using invoice.overdue for budget warnings (it's a digest event)
                            $project,
                            $request->user(),
                            [
                                'title' => '⚠️ Project Budget Warning',
                                'body' => "Project '{$project->name}' has used {$percentageUsed}% of budget ({$expenseFormatted} / {$budgetFormatted}). Remaining: {$remainingFormatted}.",
                                'url' => "/finance/projects/{$project->id}",
                                'level' => 'warning',
                                'exclude_actor' => false,
                            ]
                        );
                    }
                    // Critical if budget is exceeded
                    elseif ($percentageUsed >= 100) {
                        $currencySymbol = $project->currency->symbol ?? $project->currency->code ?? '';
                        $expenseFormatted = number_format($totalExpense, 2) . ' ' . $currencySymbol;
                        $budgetFormatted = number_format($budgetAmount, 2) . ' ' . $currencySymbol;
                        $overBudget = number_format($totalExpense - $budgetAmount, 2) . ' ' . $currencySymbol;
                        
                        $this->notificationService->notify(
                            'invoice.overdue', // Using invoice.overdue for budget exceeded (it's a digest event)
                            $project,
                            $request->user(),
                            [
                                'title' => '🚨 Project Budget Exceeded',
                                'body' => "Project '{$project->name}' has exceeded its budget by {$overBudget} ({$expenseFormatted} / {$budgetFormatted}).",
                                'url' => "/finance/projects/{$project->id}",
                                'level' => 'critical',
                                'exclude_actor' => false,
                            ]
                        );
                    }
                }
            } catch (\Exception $e) {
                // Log error but don't fail the request
                Log::warning('Failed to send budget warning notification', [
                    'project_id' => $project->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Log finance project update
            try {
                $this->activityLogService->logUpdate(
                    subject: $project,
                    description: "Updated finance project: {$project->name}",
                    properties: [
                        'old_values' => $oldValues,
                        'new_values' => $project->only(['name', 'code', 'currency_id', 'description', 'budget_amount', 'start_date', 'end_date', 'status', 'is_active']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log finance project update: ' . $e->getMessage());
            }

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

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
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

            $projectName = $project->name;
            $projectData = $project->toArray();
            $project->delete();

            // Log finance project deletion
            try {
                $this->activityLogService->logDelete(
                    subject: $project,
                    description: "Deleted finance project: {$projectName}",
                    properties: ['deleted_project' => $projectData],
                    request: request()
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log finance project deletion: ' . $e->getMessage());
            }

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

            $currentSchoolId = $this->getCurrentSchoolId(request());

            $project = FinanceProject::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->with('currency')
                ->find($id);

            if (!$project) {
                return response()->json(['error' => 'Finance project not found'], 404);
            }

            // Recalculate totals to ensure accuracy
            $totals = $project->recalculateTotals();
            $project->load('currency');

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
