<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\Currency;
use App\Models\FinanceAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrgFinanceAccountController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'type' => 'nullable|in:cash,fund',
            'is_active' => 'nullable|boolean',
        ]);

        $query = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id');

        if (!empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }
        if (isset($validated['is_active'])) {
            $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $accounts = $query->with('currency')->orderBy('name')->get();
        foreach ($accounts as $account) {
            $account->recalculateBalance();
        }

        return response()->json($accounts);
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
                Rule::unique('finance_accounts')->where(function ($q) use ($orgId) {
                    return $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at');
                }),
            ],
            'type' => 'nullable|in:cash,fund',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'description' => 'nullable|string',
            'opening_balance' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['currency_id'])) {
            $currency = Currency::where('organization_id', $orgId)
                ->whereNull('school_id')
                ->whereNull('deleted_at')
                ->find($validated['currency_id']);
            if (!$currency) {
                return response()->json(['error' => 'Currency not found or must be org-level'], 404);
            }
        }

        $account = FinanceAccount::create([
            'organization_id' => $orgId,
            'school_id' => null,
            'currency_id' => $validated['currency_id'] ?? null,
            'name' => trim($validated['name']),
            'code' => $validated['code'] ?? null,
            'type' => $validated['type'] ?? 'cash',
            'description' => $validated['description'] ?? null,
            'opening_balance' => $validated['opening_balance'] ?? 0,
            'current_balance' => $validated['opening_balance'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $account->load('currency');
        return response()->json($account, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $account = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->with('currency')
            ->find($id);

        if (!$account) {
            return response()->json(['error' => 'Finance account not found'], 404);
        }

        $account->recalculateBalance();
        return response()->json($account);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $account = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$account) {
            return response()->json(['error' => 'Finance account not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('finance_accounts')->where(function ($q) use ($orgId) {
                    return $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at');
                })->ignore($id),
            ],
            'type' => 'nullable|in:cash,fund',
            'currency_id' => 'nullable|uuid|exists:currencies,id',
            'description' => 'nullable|string',
            'opening_balance' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['currency_id'])) {
            $currency = Currency::where('organization_id', $orgId)
                ->whereNull('school_id')
                ->whereNull('deleted_at')
                ->find($validated['currency_id']);
            if (!$currency) {
                return response()->json(['error' => 'Currency not found or must be org-level'], 404);
            }
        }

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $oldOpening = $account->opening_balance;
        $account->update($validated);
        if (isset($validated['opening_balance']) && $validated['opening_balance'] != $oldOpening) {
            $account->recalculateBalance();
        }

        $account->load('currency');
        $account->recalculateBalance();
        return response()->json($account);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $account = FinanceAccount::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$account) {
            return response()->json(['error' => 'Finance account not found'], 404);
        }

        $hasIncome = $account->incomeEntries()->whereNull('deleted_at')->exists();
        $hasExpenses = $account->expenseEntries()->whereNull('deleted_at')->exists();
        if ($hasIncome || $hasExpenses) {
            return response()->json(['error' => 'Cannot delete account with existing entries'], 409);
        }

        $account->delete();
        return response()->noContent();
    }
}
