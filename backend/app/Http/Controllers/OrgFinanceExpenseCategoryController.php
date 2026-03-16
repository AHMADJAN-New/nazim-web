<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrgFinanceExpenseCategoryController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate(['is_active' => 'nullable|boolean']);

        $query = ExpenseCategory::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id');

        if (isset($validated['is_active'])) {
            $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $categories = $query->ordered()->get();
        return response()->json($categories);
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
                Rule::unique('expense_categories')->where(fn ($q) => $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')),
            ],
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $category = ExpenseCategory::create([
            'organization_id' => $orgId,
            'school_id' => null,
            'name' => trim($validated['name']),
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'display_order' => $validated['display_order'] ?? 0,
        ]);

        return response()->json($category, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $category = ExpenseCategory::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$category) {
            return response()->json(['error' => 'Expense category not found'], 404);
        }

        return response()->json($category);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $category = ExpenseCategory::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$category) {
            return response()->json(['error' => 'Expense category not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('expense_categories')->where(fn ($q) => $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at'))->ignore($id),
            ],
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $category->update($validated);
        return response()->json($category);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $category = ExpenseCategory::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$category) {
            return response()->json(['error' => 'Expense category not found'], 404);
        }

        $category->delete();
        return response()->noContent();
    }
}
