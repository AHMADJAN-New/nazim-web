<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\Currency;
use App\Models\FinanceProject;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrgFinanceProjectController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'status' => 'nullable|in:planning,active,completed,cancelled',
            'is_active' => 'nullable|boolean',
        ]);

        $query = FinanceProject::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with('currency');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }
        if (isset($validated['is_active'])) {
            $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $projects = $query->orderBy('name')->get();
        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('finance_projects')->where(fn ($q) => $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')),
            ],
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'description' => 'nullable|string',
            'budget_amount' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'nullable|in:planning,active,completed,cancelled',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['currency_id'])) {
            $currency = Currency::where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')->find($validated['currency_id']);
            if (!$currency) {
                return response()->json(['error' => 'Currency not found or must be org-level'], 404);
            }
        }

        $project = FinanceProject::create([
            'organization_id' => $orgId,
            'school_id' => null,
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
        return response()->json($project, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $project = FinanceProject::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with('currency')
            ->find($id);

        if (!$project) {
            return response()->json(['error' => 'Finance project not found'], 404);
        }

        return response()->json($project);
    }

    public function summary(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $project = FinanceProject::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with('currency')
            ->find($id);

        if (!$project) {
            return response()->json(['error' => 'Finance project not found'], 404);
        }

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
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $project = FinanceProject::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$project) {
            return response()->json(['error' => 'Finance project not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('finance_projects')->where(fn ($q) => $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at'))->ignore($id),
            ],
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'description' => 'nullable|string',
            'budget_amount' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'nullable|in:planning,active,completed,cancelled',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['currency_id'])) {
            $currency = Currency::where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')->find($validated['currency_id']);
            if (!$currency) {
                return response()->json(['error' => 'Currency not found or must be org-level'], 404);
            }
        }

        $project->update($validated);
        $project->load('currency');
        return response()->json($project);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $project = FinanceProject::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$project) {
            return response()->json(['error' => 'Finance project not found'], 404);
        }

        $project->delete();
        return response()->noContent();
    }
}
