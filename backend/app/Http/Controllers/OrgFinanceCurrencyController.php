<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\OrgFinanceScope;
use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OrgFinanceCurrencyController extends Controller
{
    use OrgFinanceScope;

    public function index(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $validated = $request->validate([
            'is_active' => 'nullable|boolean',
            'is_base' => 'nullable|boolean',
        ]);

        $query = Currency::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id');

        if (isset($validated['is_active'])) {
            $query->where('is_active', filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($validated['is_base'])) {
            $query->where('is_base', filter_var($validated['is_base'], FILTER_VALIDATE_BOOLEAN));
        }

        $currencies = $query->orderBy('is_base', 'desc')->orderBy('code')->get();
        return response()->json($currencies);
    }

    public function store(Request $request)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'size:3',
                'uppercase',
                Rule::unique('currencies')->where(fn ($q) => $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at')),
            ],
            'name' => 'required|string|max:100',
            'symbol' => 'nullable|string|max:10',
            'decimal_places' => 'nullable|integer|min:0|max:6',
            'is_base' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (($validated['is_base'] ?? false) === true) {
            Currency::where('organization_id', $orgId)
                ->whereNull('school_id')
                ->whereNull('deleted_at')
                ->update(['is_base' => false]);
        }

        $currency = Currency::create([
            'organization_id' => $orgId,
            'school_id' => null,
            'code' => strtoupper($validated['code']),
            'name' => trim($validated['name']),
            'symbol' => $validated['symbol'] ?? null,
            'decimal_places' => $validated['decimal_places'] ?? 2,
            'is_base' => $validated['is_base'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($currency, 201);
    }

    public function show(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceRead($request);

        $currency = Currency::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$currency) {
            return response()->json(['error' => 'Currency not found'], 404);
        }

        return response()->json($currency);
    }

    public function update(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $currency = Currency::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$currency) {
            return response()->json(['error' => 'Currency not found'], 404);
        }

        $validated = $request->validate([
            'code' => [
                'sometimes',
                'string',
                'size:3',
                'uppercase',
                Rule::unique('currencies')->where(fn ($q) => $q->where('organization_id', $orgId)->whereNull('school_id')->whereNull('deleted_at'))->ignore($id),
            ],
            'name' => 'sometimes|string|max:100',
            'symbol' => 'nullable|string|max:10',
            'decimal_places' => 'nullable|integer|min:0|max:6',
            'is_base' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }
        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        if (isset($validated['is_base']) && $validated['is_base'] === true) {
            Currency::where('organization_id', $orgId)
                ->whereNull('school_id')
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->update(['is_base' => false]);
        }

        $currency->update($validated);
        return response()->json($currency);
    }

    public function destroy(Request $request, string $id)
    {
        $orgId = $this->getOrgIdFromProfile($request);
        $this->requireOrgFinanceCreate($request);

        $currency = Currency::whereNull('deleted_at')
            ->where('organization_id', $orgId)
            ->whereNull('school_id')
            ->find($id);

        if (!$currency) {
            return response()->json(['error' => 'Currency not found'], 404);
        }

        if ($currency->is_base) {
            return response()->json(['error' => 'Cannot delete base currency. Set another as base first.'], 409);
        }

        $inUse = DB::table('finance_accounts')->where('currency_id', $id)->whereNull('deleted_at')->exists()
            || DB::table('income_entries')->where('currency_id', $id)->whereNull('deleted_at')->exists()
            || DB::table('expense_entries')->where('currency_id', $id)->whereNull('deleted_at')->exists()
            || DB::table('finance_projects')->where('currency_id', $id)->whereNull('deleted_at')->exists();

        if ($inUse) {
            return response()->json(['error' => 'Cannot delete currency that is in use'], 409);
        }

        $currency->delete();
        return response()->noContent();
    }
}
